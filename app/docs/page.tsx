import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { FREE_GENERATIONS_LIMIT, TIER_NAMES, TIER_CREDITS, TIERS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Documentation — HandWrought",
  description:
    "How HandWrought works: the review-in-place editing flow, importing existing drafts, credits, and bringing your own Gemini API key.",
};

export default function DocsPage() {
  return (
    <LegalPage title="Documentation">
      <p>
        HandWrought is an AI writing companion — the AI lives inside your document, not in a separate chat tab you
        keep copying in and out of. This page covers how the actual editing flow, credits, and import work.
      </p>

      <h2>The review flow</h2>
      <p>
        Ask for a change in the chat panel — a sharper opening line, a tighter paragraph, a different tone. The
        suggestion doesn&apos;t just appear as text in the chat: it lands inside your document as a reviewable, in-place
        edit. You accept it, reject it, or ask again. Nothing is applied automatically, and nothing leaves your
        document to get edited somewhere else.
      </p>
      <p>
        Depending on what you ask for, a suggestion arrives one of three ways: appended to the end of what you&apos;re
        writing, inserted at your cursor, or as a replacement for text you&apos;ve selected. All three show up the same
        way — as a proposed change you review before it becomes part of your document.
      </p>

      <h2>Trying it for free</h2>
      <p>
        Guest mode gives you {FREE_GENERATIONS_LIMIT} free generations with no signup — enough to try the review
        flow on something you&apos;re actually writing before deciding whether to create an account.
      </p>

      <h2>Credits</h2>
      <p>
        Once you sign up, credits are a one-time purchase, not a subscription: buy a pack, use it whenever, no
        expiry. Buying again adds to whatever you have left rather than replacing it.
      </p>
      <ul>
        {TIERS.map((tier) => (
          <li key={tier}>
            {TIER_NAMES[tier]} — {TIER_CREDITS[tier]} credits
          </li>
        ))}
      </ul>
      <p>
        See the full breakdown on the <a href="/pricing">pricing page</a>.
      </p>

      <h2>Importing an existing draft</h2>
      <p>
        You don&apos;t have to start blank. Import a draft you already have — .txt and .md files import free; PDF and
        Word documents (.pdf, .doc, .docx) use 1 credit, the same as a generation.
      </p>

      <h2>Bring your own API key</h2>
      <p>
        By default, AI requests run against a shared Gemini key HandWrought provides. If you&apos;d rather use your own
        Google Gemini API key, add it in Settings — it&apos;s stored only in your browser, sent to our server in
        transit only, and never billed against your credits.
      </p>

      <h2>Where your documents live</h2>
      <p>
        Documents and chat history are stored in your own browser&apos;s local storage, not on our servers. Clearing
        your browser data will remove them — see the <a href="/privacy">privacy policy</a> for the full detail on
        what we do and don&apos;t store.
      </p>

      <h2>Questions</h2>
      <p>
        Anything not covered here — <a href="/contact">get in touch</a>.
      </p>
    </LegalPage>
  );
}
