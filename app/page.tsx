"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import DocumentPanel, { type DocumentPanelHandle } from "@/components/DocumentPanel";
import GuidedAnnotations from "@/components/GuidedAnnotations";
import AuthGate from "@/components/AuthGate";
import SettingsModal from "@/components/SettingsModal";
import GenerateModal from "@/components/GenerateModal";
import PaywallModal from "@/components/PaywallModal";
import AuthForm from "@/components/AuthForm";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/AuthContext";
import { useAccess } from "@/lib/useAccess";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/apiKeyStorage";
import { buildArticleInstruction } from "@/lib/outlinePrompt";
import { generateMockOutline } from "@/lib/mockOutline";
import type { ChatApiResponse, ChatApiError, ChatMessage, Suggestion, SuggestionMode } from "@/lib/types";

const CURSOR_CONTEXT_CHARS = 200;

// TEMP, for testing without spending API tokens: when true, skips the real
// /api/chat call and uses a canned Lorem Ipsum outline instead. Off by
// default now that this hits the real article-generation flow again.
const USE_MOCK_OUTLINE = false;

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

export default function LandingPage() {
  return (
    <AuthGate>
      <Home />
    </AuthGate>
  );
}

function Home() {
  const { user, signOutUser } = useAuth();
  // AuthGate guarantees `user` is non-null (anonymous guests included) by the time Home renders.
  const uid = user!.uid;
  const isGuest = user!.isAnonymous;
  const storageKey = `handwrought:v1:${uid}`;
  const access = useAccess();

  const [documentText, setDocumentText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingSuggestion, setPendingSuggestion] = useState<Suggestion | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [outlineStatus, setOutlineStatus] = useState<"idle" | "drafting" | "error">("idle");
  const [hydrated, setHydrated] = useState(false);
  const [hasStartedWriting, setHasStartedWriting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [degradedAccepted, setDegradedAccepted] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const documentPanelRef = useRef<DocumentPanelHandle>(null);
  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLSpanElement>(null);

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
        if (saved.documentText?.trim()) setHasStartedWriting(true);
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

  async function handleSend(text: string): Promise<boolean> {
    if (!apiKey && !access.lifetimeAccess && access.creditsRemaining <= 0 && !degradedAccepted) {
      setPaywallOpen(true);
      return false;
    }

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
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
      const token = await user!.getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: nextMessages,
          document: documentText,
          selectedText,
          cursorContextBefore,
          cursorContextAfter,
          apiKey,
          acceptDegraded: degradedAccepted,
        }),
      });
      const data: ChatApiResponse | ChatApiError | null = await res.json().catch(() => null);
      if (!res.ok || !data || "error" in data) {
        if (data && "code" in data && data.code === "credits_exhausted") {
          setPaywallOpen(true);
          return false;
        }
        const msg = data && "error" in data ? data.error : "Sorry — I couldn't reach the writing assistant. Please try again.";
        setMessages((m) => [...m, { id: makeId(), role: "assistant", content: msg, isError: true }]);
        return false;
      }

      if (typeof data.creditsRemaining === "number") {
        access.setCreditsRemaining(data.creditsRemaining);
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
      return true;
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
      return false;
    } finally {
      setIsThinking(false);
    }
  }

  async function handleOutlineEnter(topic: string) {
    if (USE_MOCK_OUTLINE) {
      setOutlineStatus("drafting");
      await new Promise((resolve) => setTimeout(resolve, 500)); // mimic real latency for the status line
      const text = generateMockOutline(topic);
      setPendingSuggestion({
        messageId: makeId(),
        mode: "append",
        text,
        options: [text],
        optionIndex: 0,
        rangeStart: 0,
        rangeEnd: 0,
        fellBackToAppend: false,
      });
      setOutlineStatus("idle");
      return;
    }

    // Same pre-flight the paywall check inside handleSend does — skip the
    // "drafting…"/error status entirely when we already know it'll just
    // bounce straight to the paywall, so the two don't show at once.
    if (!apiKey && !access.lifetimeAccess && access.creditsRemaining <= 0 && !degradedAccepted) {
      setPaywallOpen(true);
      return;
    }
    setOutlineStatus("drafting");
    const ok = await handleSend(buildArticleInstruction(topic));
    setOutlineStatus(ok ? "idle" : "error");
  }

  function handleAccept() {
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
        isGuest={isGuest}
        userEmail={user!.email}
        lifetimeAccess={access.lifetimeAccess}
        creditsRemaining={access.creditsRemaining}
        onSignOut={() => signOutUser()}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSignUp={() => setSignUpOpen(true)}
        creditsRef={creditsRef}
      />
      <main className="min-h-0 flex-1">
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
          onOutlineEnter={handleOutlineEnter}
          outlineStatus={outlineStatus}
          showWelcome={!hasStartedWriting}
          onEditorFocus={() => setHasStartedWriting(true)}
          toolbarRowRef={toolbarRowRef}
          creditsRemaining={access.creditsRemaining}
          lifetimeAccess={access.lifetimeAccess}
        />
      </main>

      {/* {!pendingSuggestion && (
        <button
          type="button"
          onClick={() => setGenerateOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 font-sans text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Ask AI to write
        </button>
      )} */}

      <GuidedAnnotations active={!hasStartedWriting} toolbarRef={toolbarRowRef} creditsRef={creditsRef} />

      {/* Fixed and out of the editor's own document flow on purpose — this
          must never be able to affect the editor's size, no matter what
          state the document is in. */}
      <nav className="fixed bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 font-sans text-[11px] text-[var(--color-ink-muted)] opacity-60 transition-opacity hover:opacity-100">
        <Link href="/terms" className="hover:text-[var(--color-ink)]">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-[var(--color-ink)]">
          Privacy
        </Link>
        <Link href="/refund" className="hover:text-[var(--color-ink)]">
          Refund Policy
        </Link>
        <Link href="/contact" className="hover:text-[var(--color-ink)]">
          Contact
        </Link>
      </nav>

      <GenerateModal
        open={generateOpen && hydrated}
        onClose={() => setGenerateOpen(false)}
        onGenerate={(text) => {
          handleSend(text);
        }}
        isThinking={isThinking}
        hasApiKey={!!apiKey}
        lifetimeAccess={access.lifetimeAccess}
        creditsRemaining={access.creditsRemaining}
        onOpenSettings={() => {
          setGenerateOpen(false);
          setSettingsOpen(true);
        }}
      />

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onContinueFree={() => setDegradedAccepted(true)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        creditsRemaining={access.creditsRemaining}
        onSave={handleSaveApiKey}
        onClear={handleClearApiKey}
      />

      <Modal open={signUpOpen} onClose={() => setSignUpOpen(false)} title="Save your work">
        <AuthForm onSuccess={() => setSignUpOpen(false)} />
      </Modal>
    </div>
  );
}
