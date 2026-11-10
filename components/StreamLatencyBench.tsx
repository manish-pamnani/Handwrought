"use client";

// Public page (/landing): the naive way to stream model output into an
// editor, with live keystroke-latency measurement. The comparison is the real
// app at `/`, which never streams tokens into React state: the model's reply
// arrives whole and lands in the editor once, while typing stays editable.
//
// Self-contained on purpose: its own editor and state, no auth, no API calls,
// no credits, nothing persisted. It never touches a user's real document.
//
//   naive:    every token is appended to page-level React state. The sync
//             effect then replaces the whole editor document via setContent
//             (same pattern as DocumentPanel's external-sync effect), ~50x/sec.
//             While you type, your keystrokes and the stream race: keystrokes
//             get overwritten and land out of order. That's the real failure.
//
// Latency per keystroke = OS event timestamp -> frame after it was handled
// (rAF -> setTimeout, the standard "next paint" approximation), so time spent
// queued behind a busy main thread counts. Long tasks via PerformanceObserver.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { EDITOR_EXTENSIONS, getMarkdown } from "@/lib/richTextExtensions";

const TOKEN_INTERVAL_MS = 20; // ~50 tokens/sec, roughly a real model's stream rate
const RUN_MS = 30_000;

const STREAM_TEXT = `What made the difference was not a better model or a faster server. It was deciding, deliberately, what the interface is allowed to re-render while the user is still typing. Every piece of state has a cost, and the most expensive state is the kind that changes fifty times a second while sitting at the very top of the component tree. When that state also happens to own the document, every token the model produces becomes a full round trip through parsing, layout and paint, and the cursor has to wait its turn behind all of it. The fix is to let the stream accumulate somewhere cheap, keep the editor's own transaction path free for the person typing, and commit the result once, at a boundary, where it belongs. The writer never notices the stream. They only notice that the words they typed appeared the moment they typed them, and that the suggestion landed in one clean piece when it was ready.`;

const TOKENS = STREAM_TEXT.match(/\s+|[^\s]{1,4}/g) ?? [];

const LONG_DOC_TOPICS = [
  "Why editors feel slow",
  "Where re-renders come from",
  "State that lives too high",
  "The cost of parsing on every change",
  "Measuring input latency",
  "What users actually notice",
  "Batching and boundaries",
  "Keeping the main thread free",
];

function buildLongDocument(sections = 40): string {
  const paras = [
    "Most performance problems in front-end code are not mysterious. They come from a small number of decisions about where state lives and how often it changes, made early, when the data was small and everything felt instant. The happy path is forgiving. Production content is not.",
    "A text editor is an unusually sensitive place for these decisions because the user is the clock. Every keystroke is a deadline, and anything else competing for the main thread at that moment shows up directly as latency the person can feel under their fingers.",
    "The tempting pattern is to treat the document as ordinary React state, update it whenever anything changes, and let the framework sort out the rest. That works until the document is long, the updates are frequent, and the work done per update grows with the size of the document rather than the size of the change.",
    "The useful question is never just whether something is fast, but what it costs per update and how many updates per second it will see. A ten millisecond operation is free once and ruinous fifty times a second.",
  ];
  const out: string[] = ["# Notes on responsive editing", ""];
  for (let i = 0; i < sections; i++) {
    out.push(`## ${i + 1}. ${LONG_DOC_TOPICS[i % LONG_DOC_TOPICS.length]}`, "");
    for (let p = 0; p < 3; p++) out.push(paras[(i + p) % paras.length], "");
  }
  return out.join("\n");
}

type Run = {
  startedAt: number;
  keyLatencies: number[];
  longTaskMs: number;
};

type Stats = {
  keys: number;
  median: number;
  p95: number;
  max: number;
  over100: number;
  blockedMs: number;
  elapsedS: number;
};

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function computeStats(run: Run): Stats {
  const s = [...run.keyLatencies].sort((a, b) => a - b);
  return {
    keys: s.length,
    median: Math.round(pct(s, 50)),
    p95: Math.round(pct(s, 95)),
    max: Math.round(s[s.length - 1] ?? 0),
    over100: s.filter((x) => x > 100).length,
    blockedMs: Math.round(run.longTaskMs),
    elapsedS: Math.round((performance.now() - run.startedAt) / 1000),
  };
}

function StatsLine({ label, stats, live }: { label: string; stats: Stats | null; live: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-[var(--color-ink-muted)]">
      <span className={`w-[72px] ${live ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]"}`}>{label}</span>
      {stats ? (
        <>
          <span>{stats.keys} keys</span>
          <span>median {stats.median} ms</span>
          <span>p95 {stats.p95} ms</span>
          <span>max {stats.max} ms</span>
          <span>{stats.over100} over 100 ms</span>
          <span>blocked {stats.blockedMs} ms</span>
          <span>{stats.elapsedS}s</span>
        </>
      ) : (
        <span>not run</span>
      )}
    </div>
  );
}

export default function StreamLatencyBench() {
  // The naive path's "owner" of the document: page-level React state.
  const [documentText, setDocumentText] = useState(buildLongDocument);
  const lastEmitted = useRef(documentText);

  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const runRef = useRef<Run | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const editorDomRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: documentText,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const markdown = getMarkdown(editor);
      lastEmitted.current = markdown;
      setDocumentText(markdown);
    },
  });

  // External state -> editor sync: replace the whole document whenever state
  // changes from anywhere but the editor itself. Caret is restored by
  // position so the stream doesn't just throw it to the end.
  useEffect(() => {
    if (!editor || documentText === lastEmitted.current) return;
    lastEmitted.current = documentText;
    const { from, to } = editor.state.selection;
    editor.commands.setContent(documentText);
    const doc = editor.state.doc;
    const clamp = (pos: number) => Math.min(pos, doc.content.size);
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.between(doc.resolve(clamp(from)), doc.resolve(clamp(to))))
    );
  }, [documentText, editor]);

  function clearTimers() {
    for (const t of timersRef.current) {
      clearInterval(t);
      clearTimeout(t);
    }
    timersRef.current = [];
  }

  function stop() {
    clearTimers();
    const run = runRef.current;
    runRef.current = null;
    setRunning(false);
    if (!run) return;
    // Let in-flight keystroke measurements land before the final numbers.
    setTimeout(() => setStats(computeStats(run)), 300);
  }

  function begin() {
    if (runRef.current) stop();
    const run: Run = { startedAt: performance.now(), keyLatencies: [], longTaskMs: 0 };
    runRef.current = run;
    setRunning(true);
    setStats(computeStats(run));
    timersRef.current.push(setTimeout(stop, RUN_MS));
    // Live readout, once a second.
    timersRef.current.push(
      setInterval(() => {
        if (runRef.current === run) setStats(computeStats(run));
      }, 1000)
    );
    editor?.commands.focus();
  }

  function runNaive() {
    begin();
    let i = 0;
    setDocumentText((prev) => prev + "\n\n");
    timersRef.current.push(
      setInterval(() => {
        const token = TOKENS[i % TOKENS.length];
        const paragraphBreak = i > 0 && i % TOKENS.length === 0 ? "\n\n" : "";
        i++;
        // Every token through page-level document state.
        setDocumentText((prev) => prev + paragraphBreak + token);
      }, TOKEN_INTERVAL_MS)
    );
  }

  function reset() {
    stop();
    setDocumentText(buildLongDocument());
    setStats(null);
  }

  // Keystroke latency (editor keystrokes only) + long tasks.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const run = runRef.current;
      if (!run || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!editorDomRef.current?.contains(e.target as Node)) return;
      if (e.key.length !== 1 && e.key !== "Backspace" && e.key !== "Enter") return;
      const pressedAt = e.timeStamp;
      requestAnimationFrame(() =>
        setTimeout(() => {
          if (runRef.current === run) run.keyLatencies.push(performance.now() - pressedAt);
        }, 0)
      );
    }
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        const run = runRef.current;
        if (!run) return;
        for (const entry of list.getEntries()) run.longTaskMs += entry.duration;
      });
      observer.observe({ type: "longtask", buffered: false });
    } catch {
      // longtask unsupported outside Chromium; keystroke latency still works
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      observer?.disconnect();
      clearTimers();
    };
  }, []);

  const btn =
    "rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-[13px] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)] disabled:opacity-40";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="mr-2 font-sans text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
              HandWrought
            </Link>
            <button className={btn} onClick={runNaive} disabled={running}>
              Start stream
            </button>
            <button className={btn} onClick={stop} disabled={!running}>
              Stop
            </button>
            <button className={btn} onClick={reset} disabled={running}>
              Reset
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <StatsLine label="typing" stats={stats} live={running} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8">
        <div ref={editorDomRef} className="prose-doc font-serif text-[19px] leading-[1.9] text-[var(--color-ink)]">
          <EditorContent editor={editor} />
        </div>
      </main>

      <footer className="border-t border-[var(--color-border)] px-4 py-4 text-center font-sans text-[12px] text-[var(--color-ink-muted)] sm:px-8">
        This page streams every token straight into the document, 30 seconds per run. HandWrought&apos;s{" "}
        <Link href="/" className="underline">
          editor
        </Link>{" "}
        doesn&apos;t work this way.
      </footer>
    </div>
  );
}
