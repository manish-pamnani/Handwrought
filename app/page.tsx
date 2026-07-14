"use client";

import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import DocumentPanel from "@/components/DocumentPanel";
import type { ChatApiResponse, ChatMessage, Selection, Suggestion, SuggestionMode } from "@/lib/types";

const STORAGE_KEY = "handwrought:v1";

const FALLBACK_COMMENT: Record<SuggestionMode, string> = {
  append: "Proposed an addition →",
  insert_at_cursor: "Proposed an insertion →",
  replace_selection: "Proposed a replacement for your selection →",
};

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Home() {
  const [documentText, setDocumentText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [pendingSuggestion, setPendingSuggestion] = useState<Suggestion | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Load any saved session on mount. This one-time hydration from an
  // external store (localStorage) necessarily sets state from an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { documentText?: string; messages?: ChatMessage[] };
        if (typeof saved.documentText === "string") setDocumentText(saved.documentText);
        if (Array.isArray(saved.messages)) setMessages(saved.messages);
      }
    } catch {
      // corrupted/blocked storage — start fresh
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist document + chat history for the session.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ documentText, messages }));
    } catch {
      // storage full/unavailable — non-fatal
    }
  }, [documentText, messages, hydrated]);

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, document: documentText, selection }),
      });
      if (!res.ok) throw new Error("request failed");
      const data: ChatApiResponse = await res.json();

      if (data.suggestion) {
        const mode = data.suggestion.mode;
        let rangeStart: number;
        let rangeEnd: number;
        let fellBackToAppend = false;

        if (mode === "append") {
          rangeStart = rangeEnd = documentText.length;
        } else if (mode === "insert_at_cursor") {
          rangeStart = rangeEnd = selection.end;
        } else {
          const hasSelection = selection.end > selection.start;
          if (hasSelection) {
            rangeStart = selection.start;
            rangeEnd = selection.end;
          } else {
            rangeStart = rangeEnd = documentText.length;
            fellBackToAppend = true;
          }
        }

        const assistantId = makeId();
        let content = data.comment || FALLBACK_COMMENT[mode];
        if (fellBackToAppend) {
          content += " (Nothing was selected, so I added this to the end instead.)";
        }

        setMessages((m) => [...m, { id: assistantId, role: "assistant", content, suggestionMode: mode }]);
        setPendingSuggestion({
          messageId: assistantId,
          mode,
          text: data.suggestion.content,
          rangeStart,
          rangeEnd,
          fellBackToAppend,
        });
      } else {
        setMessages((m) => [...m, { id: makeId(), role: "assistant", content: data.comment }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "assistant",
          content: "Sorry — I couldn't reach the writing assistant. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleAccept() {
    if (!pendingSuggestion) return;
    const newText =
      documentText.slice(0, pendingSuggestion.rangeStart) +
      pendingSuggestion.text +
      documentText.slice(pendingSuggestion.rangeEnd);
    const cursor = pendingSuggestion.rangeStart + pendingSuggestion.text.length;
    setDocumentText(newText);
    setSelection({ start: cursor, end: cursor });
    setPendingSuggestion(null);
  }

  function handleReject() {
    setPendingSuggestion(null);
  }

  function handleEditSuggestionText(text: string) {
    setPendingSuggestion((prev) => (prev ? { ...prev, text } : prev));
  }

  function handleAskAI() {
    chatInputRef.current?.focus();
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar documentText={documentText} />
      <main className="flex flex-1 overflow-hidden">
        <div className="w-[380px] shrink-0 border-r border-[var(--color-border)]">
          <ChatPanel
            ref={chatInputRef}
            messages={messages}
            isThinking={isThinking}
            selection={selection}
            onSend={handleSend}
          />
        </div>
        <div className="flex-1">
          <DocumentPanel
            documentText={documentText}
            onChangeDocument={setDocumentText}
            selection={selection}
            onChangeSelection={setSelection}
            pendingSuggestion={pendingSuggestion}
            onEditSuggestionText={handleEditSuggestionText}
            onAccept={handleAccept}
            onReject={handleReject}
            onAskAI={handleAskAI}
          />
        </div>
      </main>
    </div>
  );
}
