"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { User } from "firebase/auth";
import { DICTATION_MAX_CLIP_SECONDS } from "@/lib/constants";
import type { DictateApiResponse, DictateApiError } from "@/lib/types";
import { startDeepgramStream, extractKeywordsFromDoc, type StreamSession } from "@/lib/stt/deepgramStream";

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
const WAVEFORM_BAR_COUNT = 38;

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

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  );
}

function StopIcon() {
  return (
    <span className="h-3.5 w-3.5 rounded-[3px] bg-[var(--color-ink)]" aria-hidden="true" />
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 13.5V2.5m0 0L3.5 7m4.5-4.5L12.5 7" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
  );
}

function needsLeadingSpace(editor: Editor, pos: number): boolean {
  if (pos <= 0) return false;
  const charBefore = editor.state.doc.textBetween(pos - 1, pos, "\n");
  return charBefore !== "" && !/\s/.test(charBefore);
}

function clampRange(editor: Editor, range: DocRange): DocRange | null {
  const size = editor.state.doc.content.size;
  if (range.from > size) return null;
  return { from: range.from, to: Math.min(Math.max(range.to, range.from), size) };
}

export default function DictationButton({ user, tier, getEditor, onCreditsRemaining, onPaywall }: DictationButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [sessionFinalized, setSessionFinalized] = useState<string[]>([]);
  const [interimText, setInterimText] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<"streaming" | "fallback">("streaming");
  const streamSessionRef = useRef<StreamSession | null>(null);
  const pendingCleanupsRef = useRef(0);
  const insertPosRef = useRef(0);

  // Fallback MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const insertAnchorRef = useRef<DocRange | null>(null);

  // Live waveform refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(
    () => () => {
      streamSessionRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopTimers();
      stopWaveform();
      isActiveRef.current = false;
    },
    []
  );

  // Auto-scroll transcript container as speech accumulates
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [sessionFinalized, interimText]);

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
      analyser.fftSize = 128; // 64 frequency bins
      analyser.smoothingTimeConstant = 0.65;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        const avg = sum / freqData.length;
        const speechActivity = Math.min(1.4, avg / 24);

        barRefs.current.forEach((bar, i) => {
          if (!bar) return;
          const binIndex = Math.min(freqData.length - 1, Math.floor((i / WAVEFORM_BAR_COUNT) * 44) + 1);
          const binNorm = freqData[binIndex] / 255;
          const centerDist = Math.abs(i - WAVEFORM_BAR_COUNT / 2) / (WAVEFORM_BAR_COUNT / 2);
          const arc = 1 - centerDist * 0.4;
          const scale = Math.max(0.18, Math.min(1.0, (binNorm * 1.3 + speechActivity * 0.35) * arc));
          bar.style.transform = `scaleY(${scale})`;
        });
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Best-effort waveform
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
      if (bar) bar.style.transform = "scaleY(0.18)";
    });
  }

  function insertCleanedText(editor: Editor, text: string) {
    const docSize = editor.state.doc.content.size;
    const safePos = Math.min(insertPosRef.current, docSize);
    const prefix = needsLeadingSpace(editor, safePos) ? " " : "";
    const content = `${prefix}${text}`;
    editor.chain().insertContentAt(safePos, { type: "text", text: content }).focus().run();
    insertPosRef.current = safePos + content.length;
  }

  async function startRecording() {
    if (isActiveRef.current) return;
    isActiveRef.current = true;
    setError(null);
    setSessionFinalized([]);
    setInterimText("");
    setElapsed(0);
    startedAtRef.current = Date.now();

    const editor = getEditor();
    if (editor) {
      const { from, to } = editor.state.selection;
      if (to > from) editor.chain().insertContentAt({ from, to }, "").focus().run();
      insertPosRef.current = from;
      insertAnchorRef.current = { from, to: from };
    } else {
      insertPosRef.current = 0;
      insertAnchorRef.current = null;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setError("Couldn't access your microphone — check browser permissions.");
      isActiveRef.current = false;
      return;
    }

    startWaveform(stream);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250);
    autoStopRef.current = setTimeout(() => stopRecording(), DICTATION_MAX_CLIP_SECONDS * 1000);

    // Attempt streaming path with Deepgram Nova-3
    try {
      const idToken = await user.getIdToken();
      const tokenRes = await fetch("/api/dictate/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => null);
        if (errData?.code === "credits_exhausted" || errData?.code === "paid_feature") {
          stopTimers();
          stopWaveform();
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          isActiveRef.current = false;
          onPaywall();
          return;
        }
        throw new Error("Unable to mint streaming token");
      }

      const { token } = await tokenRes.json();
      const keywords = editor ? extractKeywordsFromDoc(editor.getText()) : [];

      const session = await startDeepgramStream(
        token,
        {
          onPartial: (partialText) => {
            const ed = getEditor();
            if (!ed) return;
            setInterimText(partialText);
            if (!partialText) {
              ed.commands.clearGhostText();
            } else {
              const pos = Math.min(insertPosRef.current, ed.state.doc.content.size);
              const prefix = needsLeadingSpace(ed, pos) ? " " : "";
              ed.commands.setGhostText(`${prefix}${partialText}`, pos);
            }
          },
          onSentenceFinal: async (rawSentence) => {
            const ed = getEditor();
            if (!ed || !rawSentence.trim()) return;
            const finalizedIndex = sessionFinalized.length;

            ed.commands.clearGhostText();
            setInterimText("");
            setSessionFinalized((prev) => [...prev, rawSentence.trim()]);

            // Background Gemini cleanup pass
            pendingCleanupsRef.current++;
            try {
              const docSize = ed.state.doc.content.size;
              const pos = Math.min(insertPosRef.current, docSize);
              const contextBefore = ed.state.doc.textBetween(Math.max(0, pos - 200), pos, "\n");
              const cleanRes = await fetch("/api/dictate/cleanup", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${idToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: rawSentence, contextBefore }),
              });
              const cleanData = await cleanRes.json().catch(() => null);
              const cleaned = cleanData?.cleaned || rawSentence;

              // Update the sentence in visible dictation list to polished prose
              setSessionFinalized((prev) => {
                const next = [...prev];
                if (next[finalizedIndex] !== undefined) {
                  next[finalizedIndex] = cleaned;
                }
                return next;
              });

              insertCleanedText(ed, cleaned);
            } catch (err) {
              console.warn("Cleanup pass failed, inserting raw text:", err);
              insertCleanedText(ed, rawSentence);
            } finally {
              pendingCleanupsRef.current = Math.max(0, pendingCleanupsRef.current - 1);
              if (pendingCleanupsRef.current === 0 && !isActiveRef.current) {
                setStatus("idle");
              }
            }
          },
          onError: (err) => {
            console.warn("Streaming STT warning:", err);
          },
        },
        { keywords, existingStream: stream }
      );

      modeRef.current = "streaming";
      streamSessionRef.current = session;
      setStatus("recording");
    } catch (streamErr) {
      console.warn("Deepgram streaming unavailable, using record-and-upload fallback:", streamErr);
      modeRef.current = "fallback";
      startFallbackRecorder(stream);
    }
  }

  function startFallbackRecorder(stream: MediaStream) {
    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => handleFallbackStop(recorder.mimeType || mimeType || "audio/webm");
    mediaRecorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }

  function cancelRecording() {
    stopTimers();
    stopWaveform();

    const editor = getEditor();
    editor?.commands.clearGhostText();

    if (streamSessionRef.current) {
      streamSessionRef.current.abort();
      streamSessionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    chunksRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setSessionFinalized([]);
    setInterimText("");
    isActiveRef.current = false;
    setStatus("idle");
  }

  async function stopRecording() {
    stopTimers();
    stopWaveform();

    const editor = getEditor();
    editor?.commands.clearGhostText();

    if (modeRef.current === "streaming" && streamSessionRef.current) {
      const session = streamSessionRef.current;
      streamSessionRef.current = null;
      isActiveRef.current = false;

      if (pendingCleanupsRef.current > 0) {
        setStatus("transcribing");
      } else {
        setStatus("idle");
      }

      try {
        const { durationSeconds } = await session.stop();
        const idToken = await user.getIdToken();
        const accrueRes = await fetch("/api/dictate/accrue", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ durationSeconds }),
        });
        const accrueData = await accrueRes.json().catch(() => null);
        if (accrueData?.creditsRemaining !== undefined) {
          onCreditsRemaining(accrueData.creditsRemaining);
        }
      } catch (err) {
        console.warn("Failed to accrue dictation duration:", err);
      } finally {
        if (pendingCleanupsRef.current === 0) {
          setStatus("idle");
        }
      }
    } else {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function handleFallbackStop(mimeType: string) {
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
        const { from, to } = editor.state.selection;
        const prefix = needsLeadingSpace(editor, from) ? " " : "";
        editor.chain().insertContentAt({ from, to }, { type: "text", text: `${prefix}${data.text}` }).focus().run();
      }
    } catch {
      setError("Dictation failed — please try again.");
    } finally {
      setStatus("idle");
      isActiveRef.current = false;
    }
  }

  function handleTriggerClick() {
    if (!tier) {
      onPaywall();
      return;
    }
    if (status === "idle" && !isActiveRef.current) {
      startRecording();
    }
  }

  const isPaid = !!tier;
  const fullDictationText = [...sessionFinalized, interimText].filter(Boolean).join(" ").trim();

  return (
    <>
      {/* Idle Trigger Button (Bottom right) */}
      {status === "idle" && (
        <div className="fixed right-16 bottom-5 z-30">
          {error && (
            <p className="absolute right-0 bottom-full mb-1 whitespace-nowrap font-mono text-[10px] text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleTriggerClick}
            aria-label={isPaid ? "Voice dictation" : "Voice dictation — upgrade to unlock"}
            title={isPaid ? "Voice dictation" : "Voice dictation — upgrade to unlock"}
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] shadow-sm transition-colors hover:bg-[var(--color-paper-inset)] hover:text-[var(--color-ink)] hover:cursor-pointer ${
              !isPaid ? "opacity-60" : ""
            }`}
          >
            <MicIcon />
          </button>
        </div>
      )}

      {/* HandWrought Editorial Voice Dock Overlay */}
      {status !== "idle" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-14 bg-[var(--color-paper)]/85 dark:bg-[#181714]/92 backdrop-blur-md animate-in fade-in duration-200">
          {error && (
            <p className="mb-4 rounded-full bg-red-100 border border-red-200 px-4 py-1.5 font-mono text-xs text-red-700 dark:bg-red-950/80 dark:border-red-800 dark:text-red-200 shadow-sm">
              {error}
            </p>
          )}

          {/* Session Timer & Recording indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-paper-inset)] border border-[var(--color-border)] font-mono text-[11px] text-[var(--color-ink-muted)] mb-3 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="tabular-nums font-mono">{formatElapsed(elapsed)}</span>
          </div>

          {/* Continuous Cumulative Live Dictation (Source Serif 4 prose) */}
          <div
            ref={transcriptScrollRef}
            className="max-w-3xl w-full max-h-[46vh] overflow-y-auto px-6 text-center select-none mb-8 scroll-smooth"
          >
            {fullDictationText ? (
              <p className="font-serif italic text-2xl md:text-3xl lg:text-4xl leading-relaxed text-[var(--color-ink)] transition-all">
                &ldquo;{fullDictationText}&rdquo;
                <span className="inline-block w-2.5 h-2.5 ml-2.5 rounded-full bg-[var(--color-accent)] animate-pulse align-middle" />
              </p>
            ) : (
              <p className="font-serif italic text-xl md:text-2xl text-[var(--color-ink-muted)]">
                {status === "transcribing" ? "Cleaning up your dictation…" : "Listening… speak naturally"}
              </p>
            )}
          </div>

          {/* HandWrought Capsule Dock */}
          <div className="flex items-center gap-3.5 md:gap-4.5 rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] dark:bg-[var(--color-paper-inset)] px-4 py-3 shadow-[0_16px_40px_rgba(34,37,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {/* Cancel / Discard Button */}
            <button
              type="button"
              onClick={cancelRecording}
              disabled={status === "transcribing"}
              aria-label="Discard dictation"
              title="Discard dictation"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper-inset)] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] hover:bg-[var(--color-border)] hover:cursor-pointer active:scale-95 disabled:opacity-40"
            >
              <CloseIcon />
            </button>

            {/* Dynamic Real-time Audio Waveform (Ink themed) */}
            <div
              className="flex h-8 min-w-[180px] md:min-w-[240px] items-center justify-center gap-[3.5px] px-3"
              aria-hidden="true"
            >
              {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    barRefs.current[i] = el;
                  }}
                  className="h-full w-[2.8px] origin-center rounded-full bg-[var(--color-ink)] transition-transform duration-75 opacity-85"
                  style={{ transform: "scaleY(0.18)" }}
                />
              ))}
            </div>

            {/* Stop Recording Button */}
            <button
              type="button"
              onClick={stopRecording}
              disabled={status === "transcribing"}
              aria-label="Stop recording"
              title="Stop recording"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper-inset)] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-border)] hover:cursor-pointer active:scale-95 disabled:opacity-40"
            >
              <StopIcon />
            </button>

            {/* Submit / Finish Button (HandWrought Signature Indigo Accent) */}
            <button
              type="button"
              onClick={stopRecording}
              disabled={status === "transcribing"}
              aria-label="Insert dictation"
              title="Insert dictation"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-md transition-colors hover:bg-[var(--color-accent-hover)] hover:cursor-pointer active:scale-95 disabled:opacity-70"
            >
              {status === "transcribing" ? <SpinnerIcon /> : <ArrowUpIcon />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
