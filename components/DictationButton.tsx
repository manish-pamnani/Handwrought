"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { User } from "firebase/auth";
import { DICTATION_MAX_CLIP_SECONDS } from "@/lib/constants";
import type { DictateApiResponse, DictateApiError } from "@/lib/types";

type DictationButtonProps = {
  user: User;
  /** null when the account has no paid tier — dictation is a paid-only perk */
  tier: string | null;
  getEditor: () => Editor | null;
  onCreditsRemaining: (n: number) => void;
  /** free/guest user tried to dictate, or a paid user's credits ran out mid-use */
  onPaywall: () => void;
};

type Status = "idle" | "recording" | "transcribing";
type DocRange = { from: number; to: number };

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
// One request, one clip — reliability and transcription accuracy both beat
// the earlier chunked/live-preview attempts (browser speech-recognition
// support is too inconsistent across platforms to build live text on, and
// splitting the clip into chunks introduced accuracy-hurting seams at chunk
// boundaries). "Is it listening" and "what did I say" are solved
// separately now: the waveform below proves the mic's live and reacting;
// the transcript itself is one clean, whole-clip Gemini call, same as it
// ever was.
const BAR_COUNT = 4;
const BAR_SENSITIVITY = [0.75, 1, 0.85, 1.05]; // per-bar multiplier so they don't all move in lockstep

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function MicIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" />
      <path strokeLinecap="round" d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2M6 14.5h4" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[var(--color-border)] border-t-[var(--color-ink-muted)]" />
  );
}

// True whenever the character right before `pos` exists and isn't
// whitespace — used so dictated text never runs into whatever's already
// there ("wordDictated" instead of "word Dictated").
function needsLeadingSpace(editor: Editor, pos: number): boolean {
  if (pos <= 0) return false;
  const charBefore = editor.state.doc.textBetween(pos - 1, pos, "\n");
  return charBefore !== "" && !/\s/.test(charBefore);
}

// Defends against the anchor position outliving the document it was
// captured against — the transcription request takes a few seconds, during
// which the user could have clicked elsewhere and edited the doc. Clamps
// `to` to the doc's current end, or returns null if even `from` no longer
// exists, so a stale position degrades to "fall back to inserting at the
// cursor" instead of throwing a RangeError.
function clampRange(editor: Editor, range: DocRange): DocRange | null {
  const size = editor.state.doc.content.size;
  if (range.from > size) return null;
  return { from: range.from, to: Math.min(Math.max(range.to, range.from), size) };
}

export default function DictationButton({ user, tier, getEditor, onCreditsRemaining, onPaywall }: DictationButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True from the moment startRecording is invoked until handleStop fully
  // finishes — a ref (not state) specifically so it's readable synchronously
  // on the very next click, with no risk of a stale closure letting a rapid
  // double-click start a second overlapping session.
  const isActiveRef = useRef(false);
  // Where the dictated text should land — captured at recording start (and
  // clearing any active selection right then, the way typing over one
  // would), reused for the single insert once the transcript is back.
  const insertAnchorRef = useRef<DocRange | null>(null);

  // Live waveform — proves the mic is open and actually hearing the user in
  // real time, without depending on speech-recognition or transcription
  // accuracy at all. Reads raw amplitude off the same MediaStream already
  // being recorded via an AnalyserNode, and writes bar heights straight to
  // the DOM through refs (not React state) so it can run every animation
  // frame without triggering a re-render per frame.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(
    () => () => {
      // Unmount mid-recording (e.g. navigating away) — release the mic and
      // clear timers rather than leaving the recording indicator lit forever.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      stopWaveform();
      isActiveRef.current = false;
    },
    []
  );

  function stopTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
  }

  function startWaveform(stream: MediaStream) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const audioCtx = new Ctor();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      // Deliberately never connected to audioCtx.destination — this reads
      // the mic signal for visualization only, never plays it back.
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const deviation = (data[i] - 128) / 128;
          sumSquares += deviation * deviation;
        }
        const level = Math.min(1, Math.sqrt(sumSquares / data.length) * 4); // 0 (silence) .. 1 (loud)
        barRefs.current.forEach((bar, i) => {
          if (!bar) return;
          const scale = 0.25 + level * BAR_SENSITIVITY[i % BAR_SENSITIVITY.length] * 0.75;
          bar.style.transform = `scaleY(${Math.min(1, Math.max(0.25, scale))})`;
        });
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Best-effort only — no waveform if AudioContext/AnalyserNode aren't
      // available or usable for any reason. Recording itself is unaffected.
    }
  }

  function stopWaveform() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    barRefs.current.forEach((bar) => {
      if (bar) bar.style.transform = "scaleY(0.25)";
    });
  }

  async function startRecording() {
    if (isActiveRef.current) return;
    isActiveRef.current = true;
    setError(null);
    const mimeType = pickMimeType();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleStop(recorder.mimeType || mimeType || "audio/webm");
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setStatus("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250);
      autoStopRef.current = setTimeout(() => stopRecording(), DICTATION_MAX_CLIP_SECONDS * 1000);
      startWaveform(stream);

      // Anchor the insertion point at wherever the cursor is right now —
      // replacing an active selection immediately, the same way starting to
      // type over one would clear it.
      const editor = getEditor();
      if (editor) {
        const { from, to } = editor.state.selection;
        if (to > from) editor.chain().insertContentAt({ from, to }, "").focus().run();
        insertAnchorRef.current = { from, to: from };
      } else {
        insertAnchorRef.current = null;
      }
    } catch {
      setError("Couldn't access your microphone — check browser permissions.");
      isActiveRef.current = false;
    }
  }

  function stopRecording() {
    stopTimers();
    stopWaveform();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function handleStop(mimeType: string) {
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    const anchor = insertAnchorRef.current;
    insertAnchorRef.current = null;

    if (blob.size === 0) {
      setStatus("idle");
      isActiveRef.current = false;
      return;
    }

    setStatus("transcribing");
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("audio", blob, `dictation.${mimeType.includes("ogg") ? "ogg" : "webm"}`);
      formData.append("durationSeconds", String(durationSeconds));

      const res = await fetch("/api/dictate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data: DictateApiResponse | DictateApiError | null = await res.json().catch(() => null);

      if (!res.ok || !data || "error" in data) {
        if (data && "code" in data && (data.code === "credits_exhausted" || data.code === "paid_feature")) {
          onPaywall();
        } else {
          setError((data && "error" in data && data.error) || "Dictation failed — please try again.");
        }
        return;
      }

      onCreditsRemaining(data.creditsRemaining);
      if (!data.text) return;
      const editor = getEditor();
      if (!editor) return;

      const safeAnchor = anchor ? clampRange(editor, anchor) : null;
      if (safeAnchor) {
        editor.chain().insertContentAt(safeAnchor, { type: "text", text: data.text }).focus().run();
      } else {
        // No anchor (editor wasn't available at record start, or it's since
        // gone stale) — fall back to inserting at wherever the cursor is now.
        const { from, to } = editor.state.selection;
        const prefix = needsLeadingSpace(editor, from) ? " " : "";
        editor
          .chain()
          .insertContentAt({ from, to }, { type: "text", text: `${prefix}${data.text}` })
          .focus()
          .run();
      }
    } catch {
      setError("Dictation failed — please try again.");
    } finally {
      setStatus("idle");
      isActiveRef.current = false;
    }
  }

  function handleClick() {
    if (!tier) {
      onPaywall();
      return;
    }
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" && !isActiveRef.current) {
      startRecording();
    }
  }

  const isPaid = !!tier;
  const label =
    status === "recording"
      ? "Stop dictating"
      : status === "transcribing"
        ? "Cleaning up your dictation…"
        : isPaid
          ? "Dictate"
          : "Voice dictation — upgrade to unlock";

  return (
    <div className="fixed right-16 bottom-5 z-30">
      {error && (
        <p className="absolute right-0 bottom-full mb-1 whitespace-nowrap font-mono text-[10px] text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "transcribing"}
        aria-label={label}
        title={label}
        className={`flex h-9 items-center justify-center gap-2 rounded-full border font-sans text-sm font-semibold shadow-sm transition-colors ${
          status === "recording"
            ? "w-auto border-red-300 bg-red-50 px-3 text-red-600"
            : status === "transcribing"
              ? "w-auto border-[var(--color-border)] bg-[var(--color-paper)] px-3 text-[var(--color-ink-muted)]"
              : "w-9 border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-inset)] hover:text-[var(--color-ink)]"
        } ${!isPaid ? "opacity-60" : ""}`}
      >
        {status === "recording" ? (
          <>
            <StopIcon />
            <span className="flex h-3.5 items-center gap-[2.5px]" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    barRefs.current[i] = el;
                  }}
                  className="h-full w-[2.5px] origin-center rounded-full bg-red-500"
                  style={{ transform: "scaleY(0.25)" }}
                />
              ))}
            </span>
            <span className="font-mono text-[11px] tabular-nums">{formatElapsed(elapsed)}</span>
          </>
        ) : status === "transcribing" ? (
          <>
            <SpinnerIcon />
            <span className="text-[12px]">Cleaning up…</span>
          </>
        ) : (
          <MicIcon />
        )}
      </button>
    </div>
  );
}
