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

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

// Minimal shape of the (non-standard, no @types package) Web Speech API —
// only what's used below.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
};

// Chrome-only (webkitSpeechRecognition). Its transcript only ever drives the
// *provisional* text shown live in the editor while recording — the real,
// cleaned-up transcript that actually gets kept always comes from Gemini
// after the clip is uploaded. Safe to no-op entirely on browsers without it
// (recording/transcription still work, there's just nothing to show live).
function createLiveCaptionRecognizer(): SpeechRecognitionLike | null {
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  return recognition;
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

// Defends against `range` outliving the document it was captured against.
// Normally impossible in a single, well-behaved recording session — but two
// overlapping sessions (e.g. a rapid double-click starting a second
// MediaRecorder/recognizer before the first's status flip lands) each hold
// their own stale copy of `range` and can race, which is exactly how a
// stored position ends up past the document's current end and throws
// "Position out of range". `startRecording`'s isActiveRef guard is the real
// fix for that race; this is the second line of defense so ANY future cause
// of a stale range degrades gracefully (the live update is just skipped)
// instead of crashing the whole editor.
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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // True from the moment startRecording is invoked until handleStop fully
  // finishes — a ref (not state) specifically so it's readable synchronously
  // on the very next click, with no risk of a stale closure. Blocks a
  // second overlapping session from starting (e.g. a rapid double-click
  // while getUserMedia's permission prompt is still pending, before
  // `status` has re-rendered to "recording") — two live sessions racing to
  // update the same liveRangeRef is what caused the "Position out of range"
  // crash.
  const isActiveRef = useRef(false);
  // Guards onresult from touching the doc once we've moved past recording —
  // a stray final result can still fire asynchronously right after stop().
  const isLiveRef = useRef(false);
  // The span in the document currently occupied by the live (unclean,
  // italicized) dictated text — anchored where recording started, growing
  // as more speech comes in. null until the first word lands. This is what
  // makes the whole thing work in the editor itself instead of a side
  // panel: live captions get inserted right here, then swapped in place for
  // the cleaned Gemini transcript once it's back.
  const liveRangeRef = useRef<DocRange | null>(null);

  useEffect(
    () => () => {
      // Unmount mid-recording (e.g. navigating away) — release the mic and
      // clear timers rather than leaving the recording indicator lit forever.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
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

      // Anchor the live-text range at wherever the cursor is right now —
      // replacing an active selection immediately, the same way starting to
      // type over one would clear it.
      const editor = getEditor();
      if (editor) {
        const { from, to } = editor.state.selection;
        if (to > from) editor.chain().insertContentAt({ from, to }, "").focus().run();
        liveRangeRef.current = { from, to: from };
      } else {
        liveRangeRef.current = null;
      }

      // Best-effort only — a second, independent listener on the same mic,
      // used purely to drive the provisional in-editor text. Never blocks or
      // fails the real recording/transcription path if it errors or isn't
      // supported — it just means no live preview, recording still works.
      isLiveRef.current = true;
      try {
        const recognition = createLiveCaptionRecognizer();
        if (recognition) {
          recognition.onresult = (event) => {
            if (!isLiveRef.current) return;
            const liveEditor = getEditor();
            const rawRange = liveRangeRef.current;
            if (!liveEditor || !rawRange) return;
            const range = clampRange(liveEditor, rawRange);
            if (!range) return; // anchor itself no longer exists — skip this update, don't crash

            let combined = "";
            for (let i = 0; i < event.results.length; i++) combined += event.results[i][0].transcript;
            combined = combined.trim();
            if (!combined) return;

            // Italicized while it's still provisional — a visual cue that
            // this is the rough, unclean version, about to be replaced.
            // Inserted as an explicit inline text node with an italic mark
            // (NOT a "*combined*" markdown string) — tiptap-markdown parses
            // string content as markdown, which wraps it in a paragraph
            // node instead of inline text. Repeating that on every
            // recognition update compounded extra structure into the doc
            // until a stored position no longer matched reality, throwing
            // "Position out of range". A plain inline text node always
            // inserts at exactly `range` with a predictable size delta.
            const prefix = needsLeadingSpace(liveEditor, range.from) ? " " : "";
            liveEditor
              .chain()
              .insertContentAt(range, { type: "text", text: `${prefix}${combined}`, marks: [{ type: "italic" }] })
              .run();
            liveRangeRef.current = { from: range.from, to: liveEditor.state.selection.to };
          };
          recognition.onerror = () => {
            recognitionRef.current = null;
          };
          recognition.start();
          recognitionRef.current = recognition;
        }
      } catch {
        recognitionRef.current = null;
      }
    } catch {
      setError("Couldn't access your microphone — check browser permissions.");
      isActiveRef.current = false;
    }
  }

  function stopRecording() {
    stopTimers();
    isLiveRef.current = false;
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  async function handleStop(mimeType: string) {
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    const range = liveRangeRef.current;
    liveRangeRef.current = null;

    if (blob.size === 0) {
      // Nothing recorded — clear out any stray provisional text (e.g. the
      // live preview caught a stray noise but the clip itself was empty).
      const editor = getEditor();
      const safeRange = editor && range ? clampRange(editor, range) : null;
      if (editor && safeRange && safeRange.to > safeRange.from) {
        editor.chain().insertContentAt(safeRange, "").focus().run();
      }
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
        // Deliberately leaves the provisional italic text in place on any
        // failure — losing the words someone just spoke because of a
        // network blip or an exhausted balance would be worse than leaving
        // them an unclean draft to fix by hand.
        if (data && "code" in data && (data.code === "credits_exhausted" || data.code === "paid_feature")) {
          onPaywall();
        } else {
          setError((data && "error" in data && data.error) || "Dictation failed — please try again.");
        }
        return;
      }

      onCreditsRemaining(data.creditsRemaining);
      const editor = getEditor();
      if (!editor) return;

      // Re-validated against the current doc rather than trusted as-is —
      // it's been held onto since recording started, and the transcription
      // request itself took a few seconds during which the document could
      // have changed. Falls through to the cursor-based branch below if the
      // anchor no longer exists.
      const safeRange = range ? clampRange(editor, range) : null;

      if (safeRange) {
        // Swap the provisional (italic, unclean) text in place for Gemini's
        // cleaned version — using the anchored range rather than the
        // current selection, since the user may well have clicked elsewhere
        // in the document during the wait.
        if (data.text) {
          // Plain inline text node, not a string — see the matching note in
          // startRecording's onresult handler on why a raw string (parsed
          // as markdown) risks wrapping this in an unwanted paragraph node.
          editor.chain().insertContentAt(safeRange, { type: "text", text: data.text }).focus().run();
        } else {
          editor.chain().insertContentAt(safeRange, "").focus().run();
        }
      } else if (data.text) {
        // No live-preview range (editor wasn't available at record start,
        // or recognition wasn't supported) — fall back to inserting at
        // wherever the cursor is now.
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
        className={`flex h-9 items-center justify-center gap-1.5 rounded-full border font-sans text-sm font-semibold shadow-sm transition-colors ${
          status === "recording"
            ? "w-auto border-red-300 bg-red-50 px-3 text-red-600"
            : "w-9 border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-inset)] hover:text-[var(--color-ink)]"
        } ${!isPaid ? "opacity-60" : ""} ${status === "transcribing" ? "opacity-60" : ""}`}
      >
        {status === "recording" ? (
          <>
            <StopIcon />
            <span className="font-mono text-[11px] tabular-nums">{formatElapsed(elapsed)}</span>
          </>
        ) : status === "transcribing" ? (
          <SpinnerIcon />
        ) : (
          <MicIcon />
        )}
      </button>
    </div>
  );
}
