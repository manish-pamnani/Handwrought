"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import type { ChatMessage, Selection } from "@/lib/types";

type ChatPanelProps = {
  messages: ChatMessage[];
  isThinking: boolean;
  selection: Selection;
  onSend: (text: string) => void;
};

const ChatPanel = forwardRef<HTMLTextAreaElement, ChatPanelProps>(function ChatPanel(
  { messages, isThinking, selection, onSend },
  chatInputRef
) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSelection = selection.end > selection.start;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-paper-inset)]">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-6 text-center font-sans text-sm text-[var(--color-ink-muted)]">
            Ask for a rewrite, an idea, or just talk through the draft.
          </p>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%]">
              {m.role === "assistant" && (
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent)]">
                  Assistant
                </div>
              )}
              <div
                className={`rounded-2xl px-3.5 py-2 font-sans text-[13.5px] leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-[var(--color-accent)] text-white"
                    : m.isError
                      ? "rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink-muted)]"
                      : "rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)]"
                }`}
              >
                {m.content}
              </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-paper)] px-3.5 py-2 font-sans text-[13px] italic text-[var(--color-ink-muted)]">
              thinking…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-paper)] p-3">
        {hasSelection && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-tint)] px-2.5 py-1 font-mono text-[10px] text-[var(--color-accent)]">
            {selection.end - selection.start} chars selected
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={chatInputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to chat…"
            rows={1}
            style={{ fieldSizing: "content" } as React.CSSProperties}
            className="max-h-32 flex-1 resize-none overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 font-sans text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-tint)]"
          />
          <button
            onClick={handleSubmit}
            aria-label="Send"
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h11M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChatPanel;
