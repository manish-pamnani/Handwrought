"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import DocumentPanel, { type DocumentPanelHandle } from "@/components/DocumentPanel";
import DocumentComposer from "@/components/DocumentComposer";
import GuidedAnnotations from "@/components/GuidedAnnotations";
import AuthGate from "@/components/AuthGate";
import RefreshLoader from "@/components/RefreshLoader";
import SettingsModal from "@/components/SettingsModal";
import PaywallModal from "@/components/PaywallModal";
import ImportModal from "@/components/ImportModal";
import AuthForm from "@/components/AuthForm";
import Modal from "@/components/Modal";
import HelpModal from "@/components/HelpModal";
import DictationButton from "@/components/DictationButton";
import { useAuth } from "@/lib/AuthContext";
import { useAccess } from "@/lib/useAccess";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/apiKeyStorage";
import { buildArticleInstruction } from "@/lib/outlinePrompt";
import { generateMockOutline } from "@/lib/mockOutline";
import { trackFirstOutlineGenerated, trackSuggestionReviewed, trackPaywallShown } from "@/lib/analytics";
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
  // Help modal lives outside AuthGate (and Home's own loading gate) so it's
  // part of the server-rendered HTML — both gates render only RefreshLoader
  // until Firebase resolves on the client, which crawlers never wait for.
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <AuthGate>
        <Home onOpenHelp={() => setHelpOpen(true)} />
      </AuthGate>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

function Home({ onOpenHelp }: { onOpenHelp: () => void }) {
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
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [showPolishUpsell, setShowPolishUpsell] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [welcomeTopic, setWelcomeTopic] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const documentPanelRef = useRef<DocumentPanelHandle>(null);
  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLSpanElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const centerSlotRef = useRef<HTMLDivElement>(null);
  const headerSlotRef = useRef<HTMLDivElement>(null);
  // Shared with DocumentPanel's own Enter-in-editor handler so the one-time
  // onboarding outline generation can't fire twice (composer submit vs. Enter key).
  const outlineFiredRef = useRef(false);
  // Separate from hasStartedWriting on purpose: the welcome backdrop fades
  // immediately on submit (so the drafting document is visible), but the
  // composer pill should stay put, centered, until the draft actually lands
  // — flying to the header reads as "generation's done, do more from up
  // here" rather than "still working, and also the box just moved".
  const [composerDocked, setComposerDocked] = useState(false);

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

  // Docks the composer pill into the header as soon as onboarding has
  // latched — a plain editor focus has nothing to wait on, and kicking off
  // the one-shot outline generation should dock right away too, so
  // "drafting your article…" reads in its header-docked spot with the
  // (now-disabled) editor beneath it, rather than the pill sitting parked
  // in the center until the draft actually lands. Adjusting state during
  // render on a hasStartedWriting transition, rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [prevHasStartedWriting, setPrevHasStartedWriting] = useState(hasStartedWriting);
  if (hasStartedWriting !== prevHasStartedWriting) {
    setPrevHasStartedWriting(hasStartedWriting);
    if (hasStartedWriting) setComposerDocked(true);
  }

  /** `wholeDocument` is for the header composer's whole-document instructions
   *  (e.g. "fix grammar throughout") — it tells the model the entire
   *  document is "selected" (so REPLACE_SELECTION is actually legal per its
   *  own rules) and forces the resulting suggestion's range to span the full
   *  document client-side, regardless of which mode comes back, so the
   *  review UI swaps in place instead of appending below the old draft. */
  // Centralizes every credits-exhausted → paywall trigger (handleSend's
  // pre-flight and mid-stream checks, the outline entry points, ImportModal,
  // DictationButton) so the paywall_shown event fires exactly once per real
  // exhaustion, regardless of which path hit it. TopBar's manual "Upgrade"
  // link opens the paywall directly via setPaywallOpen and intentionally
  // skips this — that's a voluntary view, not an exhaustion signal.
  function openPaywallFromExhaustion(reason: "credits_exhausted" | "dictation_gated" = "credits_exhausted") {
    setPaywallOpen(true);
    trackPaywallShown(reason);
  }

  async function handleSend(text: string, opts?: { wholeDocument?: boolean; autoAccept?: boolean }): Promise<boolean> {
    if (!apiKey && access.creditsRemaining <= 0) {
      openPaywallFromExhaustion();
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
    // Captured now, at send time, and reused when applying the response —
    // the selection can change while the request is in flight (the user
    // clicks elsewhere, types into the quick-edit freeform box, etc.), so
    // re-reading editor.state.selection after the await would risk applying
    // the replacement to the wrong (or a stale/collapsed) range.
    let capturedSelectionRange: { from: number; to: number } | null = null;
    if (opts?.wholeDocument) {
      selectedText = documentText;
    } else if (editor) {
      const { from, to } = editor.state.selection;
      const docSize = editor.state.doc.content.size;
      if (to > from) {
        selectedText = editor.state.doc.textBetween(from, to, "\n");
        capturedSelectionRange = { from, to };
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
        }),
      });
      const data: ChatApiResponse | ChatApiError | null = await res.json().catch(() => null);
      if (!res.ok || !data || "error" in data) {
        if (data && "code" in data && data.code === "credits_exhausted") {
          openPaywallFromExhaustion();
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

        if (opts?.wholeDocument) {
          rangeStart = 0;
          rangeEnd = docSize;
        } else if (mode === "append") {
          rangeStart = rangeEnd = docSize;
        } else if (mode === "insert_at_cursor") {
          rangeStart = rangeEnd = editor?.state.selection.to ?? docSize;
        } else if (capturedSelectionRange) {
          rangeStart = capturedSelectionRange.from;
          rangeEnd = capturedSelectionRange.to;
        } else {
          rangeStart = rangeEnd = docSize;
          fellBackToAppend = true;
        }

        const assistantId = makeId();
        let content = data.comment || FALLBACK_COMMENT[mode];
        if (fellBackToAppend) {
          content += " (Nothing was selected, so I added this to the end instead.)";
        }

        if (opts?.autoAccept) {
          // First-time article generation: commit straight to the document,
          // no Accept/Reject — the credit is already spent either way, so
          // making users reject a full draft just wastes it for nothing.
          // The upsell nudge is the escape valve instead.
          editor?.chain().insertContentAt({ from: rangeStart, to: rangeEnd }, data.suggestion.options[0]).focus().run();
          setMessages((m) => [...m, { id: assistantId, role: "assistant", content, suggestionMode: mode }]);
          setShowPolishUpsell(true);
        } else {
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
            wholeDocument: !!opts?.wholeDocument,
          });
        }
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
      setDocumentText(text);
      setShowPolishUpsell(true);
      setOutlineStatus("idle");
      return;
    }

    // Same pre-flight the paywall check inside handleSend does — skip the
    // "drafting…"/error status entirely when we already know it'll just
    // bounce straight to the paywall, so the two don't show at once.
    if (!apiKey && access.creditsRemaining <= 0) {
      openPaywallFromExhaustion();
      return;
    }
    setOutlineStatus("drafting");
    const ok = await handleSend(buildArticleInstruction(topic), { autoAccept: true });
    setOutlineStatus(ok ? "idle" : "error");
    if (ok) trackFirstOutlineGenerated();
  }

  function handleTopicChange(value: string) {
    setWelcomeTopic(value);
    if (composerError) setComposerError(null);
  }

  // Before onboarding finishes, submitting the composer behaves exactly like
  // it always has: a one-shot outline generation, guarded against firing
  // twice (composer submit vs. Enter-in-editor) by outlineFiredRef, and it
  // latches hasStartedWriting — which is what starts the pill's dock-to-header
  // animation. After that, the exact same pill (now living in the header)
  // becomes a reusable whole-document instruction box: each submit just goes
  // straight through handleSend with the full document as context, the same
  // path SelectionToolbar's per-selection quick actions use.
  function startOnboardingOutline(topic: string) {
    if (outlineFiredRef.current || pendingSuggestion) return;

    // Gate here, before anything latches — hasStartedWriting/outlineFiredRef
    // flipping first (then relying on handleOutlineEnter's own check) meant
    // an out-of-credit guest lost the welcome screen (chips included) to a
    // paywall with no generation behind it, and outlineFiredRef being latched
    // left them permanently stuck even after dismissing the paywall — same
    // credits_exhausted signal handleSend/handleOutlineEnter already use.
    if (!apiKey && access.creditsRemaining <= 0) {
      openPaywallFromExhaustion();
      return;
    }

    outlineFiredRef.current = true;
    setHasStartedWriting(true);
    setWelcomeTopic("");
    handleOutlineEnter(topic);
  }

  async function handleComposerSubmit() {
    const value = welcomeTopic.trim();
    if (!value) return;

    if (!hasStartedWriting) {
      startOnboardingOutline(value);
      return;
    }

    if (isThinking || pendingSuggestion) return;
    setComposerError(null);
    const ok = await handleSend(value, { wholeDocument: true });
    if (ok) {
      setWelcomeTopic("");
    } else {
      setComposerError("Something went wrong — try again.");
    }
  }

  // Landing-page example chips (WelcomeOverlay) — only meaningful before
  // onboarding has latched, same guard startOnboardingOutline already
  // enforces via outlineFiredRef/pendingSuggestion.
  function handleSelectExample(topic: string) {
    if (hasStartedWriting) return;
    startOnboardingOutline(topic);
  }

  // ImportModal hands back already-parsed markdown — no AI call involved, so
  // it skips handleOutlineEnter/outlineFiredRef entirely and goes straight
  // into the document, same as an accepted suggestion would.
  function handleImportComplete(markdown: string) {
    setDocumentText(markdown);
    setHasStartedWriting(true);
    setImportOpen(false);
  }

  function handleAccept() {
    setPendingSuggestion(null);
    trackSuggestionReviewed("accepted");
  }

  function handleReject() {
    setPendingSuggestion(null);
    trackSuggestionReviewed("rejected");
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

  // Wait for the credits fetch and the localStorage read to both finish
  // before painting anything — otherwise the guest UI briefly renders with
  // defaulted/fallback values (e.g. "5 tries left" before the real count
  // loads, or the welcome card before we know there's already a saved
  // document) and then visibly corrects itself a moment later.
  if (access.state === "loading" || !hydrated) {
    return <RefreshLoader />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar
        documentText={documentText}
        documentPanelRef={documentPanelRef}
        isGuest={isGuest}
        user={user}
        tier={access.tier}
        creditsRemaining={access.creditsRemaining}
        onSignOut={() => signOutUser()}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSignUp={() => setSignUpOpen(true)}
        creditsRef={creditsRef}
        headerSlotRef={headerSlotRef}
        composerDocked={composerDocked}
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
          tier={access.tier}
          centerSlotRef={centerSlotRef}
          outlineFiredRef={outlineFiredRef}
          onSelectExample={handleSelectExample}
          onOpenImport={() => setImportOpen(true)}
          showPolishUpsell={showPolishUpsell}
          onDismissPolishUpsell={() => setShowPolishUpsell(false)}
        />
      </main>

      <DocumentComposer
        docked={composerDocked}
        centerSlotRef={centerSlotRef}
        headerSlotRef={headerSlotRef}
        topic={welcomeTopic}
        onTopicChange={handleTopicChange}
        onSubmit={handleComposerSubmit}
        disabled={isThinking || !!pendingSuggestion}
        error={composerError}
      />

      <GuidedAnnotations
        active={!hasStartedWriting}
        toolbarRef={toolbarRowRef}
        creditsRef={creditsRef}
        helpRef={helpButtonRef}
      />

      {/* Paid-tier perk (see app/api/dictate/route.ts) — gates itself on
          access.tier and triggers the shared paywall when a free/guest user
          clicks it or a paid user's credits run out mid-use. */}
      <DictationButton
        user={user!}
        tier={access.tier}
        getEditor={() => documentPanelRef.current?.getEditor() ?? null}
        onCreditsRemaining={access.setCreditsRemaining}
        onPaywall={() => openPaywallFromExhaustion(access.tier ? "credits_exhausted" : "dictation_gated")}
      />

      {/* Fixed to the viewport corner, same reasoning as the terms/privacy
          nav below — a persistent affordance, not part of the document's
          own layout. Mirrors Excalidraw's "Shortcuts & help" placement. */}
      <button
        ref={helpButtonRef}
        onClick={onOpenHelp}
        aria-label="Shortcuts & help"
        className="fixed right-5 bottom-5 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] font-sans text-sm font-semibold text-[var(--color-ink-muted)] shadow-sm transition-colors hover:bg-[var(--color-paper-inset)] hover:text-[var(--color-ink)]"
      >
        ?
      </button>

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

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportComplete}
        apiKey={apiKey}
        onCreditsRemaining={access.setCreditsRemaining}
        onCreditsExhausted={openPaywallFromExhaustion}
      />

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />

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
