"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import DocumentPanel, { type DocumentPanelHandle } from "@/components/DocumentPanel";
import AuthGate from "@/components/AuthGate";
import SettingsModal from "@/components/SettingsModal";
import GenerateModal from "@/components/GenerateModal";
import UpgradeModal from "@/components/UpgradeModal";
import AuthForm from "@/components/AuthForm";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/AuthContext";
import { useAccess } from "@/lib/useAccess";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/apiKeyStorage";
import { LANGUAGES, TONES } from "@/lib/constants";
import type { ChatApiResponse, ChatApiError, ChatMessage, Suggestion, SuggestionMode } from "@/lib/types";

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

const FEATURES = [
  {
    title: "Inline suggestions",
    description:
      "Ask for a rewrite, an expansion, or a new paragraph. Suggestions land right where your cursor is, with multiple options to choose from.",
  },
  {
    title: "Try free, bring your own key later",
    description:
      "Start writing immediately with HandWrought's shared key — add your own free Gemini key anytime for unlimited, full-quality generations.",
  },
  {
    title: "Tone & language control",
    description: `Generate in ${LANGUAGES.length} languages and ${TONES.length} tones — from Formal to Casual — without leaving the page.`,
  },
  {
    title: "Real formatting toolbar",
    description: "Headings, lists, tables, highlights, and images — a proper document, not a plain textbox.",
  },
];

const STEPS = [
  {
    title: "Just start writing",
    description: "Land straight in the editor — no signup, no setup. Try it free with HandWrought's shared key.",
  },
  { title: "Write", description: "Draft in a distraction-free editor built for long-form writing." },
  {
    title: "Ask for a hand",
    description: "Select text or place your cursor, describe what you need, and review AI suggestions inline.",
  },
  { title: "Accept & export", description: "Keep what works, discard what doesn't, and export your draft as Markdown." },
];

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
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [degradedAccepted, setDegradedAccepted] = useState(false);
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
        if (saved.documentText?.trim()) setGenerateOpen(false);
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
    if (!apiKey && !access.lifetimeAccess && access.creditsRemaining <= 0 && !degradedAccepted) {
      setUpgradeOpen(true);
      return;
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
          setUpgradeOpen(true);
          return;
        }
        const msg = data && "error" in data ? data.error : "Sorry — I couldn't reach the writing assistant. Please try again.";
        setMessages((m) => [...m, { id: makeId(), role: "assistant", content: msg, isError: true }]);
        return;
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
    <div className="flex flex-col">
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
          />
        </main>

        {!pendingSuggestion && (
          <button
            type="button"
            onClick={() => setGenerateOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 font-sans text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Ask AI to write
          </button>
        )}
      </div>

      <section className="border-t border-[var(--color-border)] bg-[var(--color-paper-inset)] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            Everything you need to write, nothing you don&apos;t
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
                <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{f.title}</h3>
                <p className="mt-2 font-sans text-sm text-[var(--color-ink-muted)]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-10 flex flex-col gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-tint)] font-mono text-xs font-semibold text-[var(--color-accent)]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)]">{step.title}</h3>
                  <p className="mt-1 font-sans text-sm text-[var(--color-ink-muted)]">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-8 border-t border-[var(--color-border)] px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-md">
          <h2 className="text-center font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            Simple, one-time pricing
          </h2>
          <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-inset)] p-6">
            <p className="font-sans text-sm font-medium text-[var(--color-ink-muted)]">Lifetime access</p>
            <p className="mt-1 font-serif text-4xl font-semibold text-[var(--color-ink)]">
              $9.99 <span className="font-sans text-base font-normal text-[var(--color-ink-muted)]">one-time</span>
            </p>
            <ul className="mt-5 flex flex-col gap-2 font-sans text-sm text-[var(--color-ink)]">
              <li>Unlimited, full-quality generations with our key</li>
              <li>All languages and tones</li>
              <li>Full formatting toolbar & Markdown export</li>
              <li>Free updates, forever</li>
            </ul>
            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Buy now
            </Link>
            <p className="mt-3 text-center font-sans text-xs text-[var(--color-ink-muted)]">
              Or keep using HandWrought&apos;s shared key for free, or bring your own — no purchase required.
            </p>
            <p className="mt-2 text-center font-sans text-xs text-[var(--color-ink-muted)]">
              First 150 buyers:{" "}
              <Link href="/checkout?promo=EARLYBIRD50" className="text-[var(--color-accent)] underline">
                get it for $4.99
              </Link>
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] px-5 py-6 text-center font-sans text-xs text-[var(--color-ink-muted)]">
        <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
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
        © {new Date().getFullYear()} HandWrought.
      </footer>

      <GenerateModal
        open={generateOpen && hydrated}
        onClose={() => setGenerateOpen(false)}
        onGenerate={handleSend}
        isThinking={isThinking}
        hasApiKey={!!apiKey}
        lifetimeAccess={access.lifetimeAccess}
        creditsRemaining={access.creditsRemaining}
        onOpenSettings={() => {
          setGenerateOpen(false);
          setSettingsOpen(true);
        }}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onContinueDegraded={() => setDegradedAccepted(true)}
        onOpenSettings={() => setSettingsOpen(true)}
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
