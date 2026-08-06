"use client";

import { useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import GeneratorPanel from "@/components/GeneratorPanel";
import DocumentPanel, { type DocumentPanelHandle } from "@/components/DocumentPanel";
import AuthGate from "@/components/AuthGate";
import AccessGate from "@/components/AccessGate";
import SettingsModal from "@/components/SettingsModal";
import { useAuth } from "@/lib/AuthContext";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/apiKeyStorage";
import type { ChatApiResponse, ChatMessage, Suggestion, SuggestionMode } from "@/lib/types";

const CURSOR_CONTEXT_CHARS = 200;

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

export default function Page() {
  return (
    <AuthGate>
      <AccessGate>
        <Home />
      </AccessGate>
    </AuthGate>
  );
}

function Home() {
  const { user, signOutUser } = useAuth();
  // AuthGate only ever renders Home once `user` is non-null, so this is safe.
  const uid = user!.uid;
  const storageKey = `handwrought:v1:${uid}`;

  const [documentText, setDocumentText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingSuggestion, setPendingSuggestion] = useState<Suggestion | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const documentPanelRef = useRef<DocumentPanelHandle>(null);

  // Load any saved session on mount. This one-time hydration from an
  // external store (localStorage) necessarily sets state from an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { documentText?: string; messages?: ChatMessage[] };
        if (typeof saved.documentText === "string") setDocumentText(saved.documentText);
        if (Array.isArray(saved.messages)) setMessages(saved.messages);
      }
    } catch {
      // corrupted/blocked storage — start fresh
    }
    setApiKeyState(getApiKey(uid));
    setHydrated(true);
  }, [storageKey, uid]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist document + chat history for the session.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ documentText, messages }));
    } catch {
      // storage full/unavailable — non-fatal
    }
  }, [documentText, messages, hydrated, storageKey]);

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    if (!apiKey) {
      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "assistant",
          content: "Add your Gemini API key in Settings to generate text.",
          isError: true,
        },
      ]);
      return;
    }

    setIsThinking(true);

    const editor = documentPanelRef.current?.getEditor() ?? null;
    let selectedText: string | null = null;
    let cursorContextBefore = "";
    let cursorContextAfter = "";
    if (editor) {
      const { from, to } = editor.state.selection;
      const docSize = editor.state.doc.content.size;
      if (to > from) {
        selectedText = editor.state.doc.textBetween(from, to, "\n");
      } else {
        cursorContextBefore = editor.state.doc.textBetween(Math.max(0, from - CURSOR_CONTEXT_CHARS), from, "\n");
        cursorContextAfter = editor.state.doc.textBetween(to, Math.min(docSize, to + CURSOR_CONTEXT_CHARS), "\n");
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          document: documentText,
          selectedText,
          cursorContextBefore,
          cursorContextAfter,
          apiKey,
        }),
      });
      const data: ChatApiResponse | { error: string } | null = await res.json().catch(() => null);
      if (!res.ok || !data || "error" in data) {
        const msg = data && "error" in data ? data.error : "Sorry — I couldn't reach the writing assistant. Please try again.";
        setMessages((m) => [...m, { id: makeId(), role: "assistant", content: msg, isError: true }]);
        return;
      }

      if (data.suggestion) {
        const mode = data.suggestion.mode;
        const docSize = editor?.state.doc.content.size ?? 0;
        let rangeStart: number;
        let rangeEnd: number;
        let fellBackToAppend = false;

        if (mode === "append") {
          rangeStart = rangeEnd = docSize;
        } else if (mode === "insert_at_cursor") {
          rangeStart = rangeEnd = editor?.state.selection.to ?? docSize;
        } else {
          const sel = editor?.state.selection;
          if (sel && sel.to > sel.from) {
            rangeStart = sel.from;
            rangeEnd = sel.to;
          } else {
            rangeStart = rangeEnd = docSize;
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
          text: data.suggestion.options[0],
          options: data.suggestion.options,
          optionIndex: 0,
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
    // The actual document mutation already happened in DocumentPanel (it
    // owns the live editor); this just clears the pending-suggestion state.
    setPendingSuggestion(null);
  }

  function handleReject() {
    setPendingSuggestion(null);
  }

  function handleEditSuggestionText(text: string) {
    setPendingSuggestion((prev) => (prev ? { ...prev, text } : prev));
  }

  function handleSelectOption(index: number) {
    setPendingSuggestion((prev) => (prev ? { ...prev, optionIndex: index, text: prev.options[index] } : prev));
  }

  function handleSaveApiKey(key: string) {
    setApiKey(uid, key);
    setApiKeyState(key);
  }

  function handleClearApiKey() {
    clearApiKey(uid);
    setApiKeyState(null);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar
        documentText={documentText}
        documentPanelRef={documentPanelRef}
        userEmail={user!.email ?? "Account"}
        onSignOut={() => signOutUser()}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex shrink-0 flex-col border-b border-[var(--color-border)] md:h-full md:w-[380px] md:border-b-0 md:border-r">
          <button
            onClick={() => setOptionsOpen((o) => !o)}
            className="flex items-center justify-between px-4 py-3 font-sans text-sm font-medium text-[var(--color-ink)] md:hidden"
          >
            Generation options
            <span className={`text-[var(--color-ink-muted)] transition-transform ${optionsOpen ? "rotate-180" : ""}`}>⌄</span>
          </button>
          <div className={`${optionsOpen ? "flex h-[55vh]" : "hidden"} flex-col md:flex md:h-full`}>
            <GeneratorPanel
              onGenerate={handleSend}
              isThinking={isThinking}
              hasApiKey={!!apiKey}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <DocumentPanel
            ref={documentPanelRef}
            documentText={documentText}
            onChangeDocument={setDocumentText}
            pendingSuggestion={pendingSuggestion}
            onEditSuggestionText={handleEditSuggestionText}
            onAccept={handleAccept}
            onReject={handleReject}
            onSelectOption={handleSelectOption}
            onQuickEdit={handleSend}
            isThinking={isThinking}
          />
        </div>
      </main>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSave={handleSaveApiKey}
        onClear={handleClearApiKey}
      />
    </div>
  );
}
