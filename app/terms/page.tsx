import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms & Conditions — HandWrought" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>Last updated: August 2026</p>

      <p>
        HandWrought is operated by Manish Pamnani, a sole proprietor (&quot;we&quot;, &quot;us&quot;). These terms
        govern your use of the HandWrought website and editor (the &quot;Service&quot;). By creating an account or
        purchasing access, you agree to these terms.
      </p>

      <h2>The Service</h2>
      <p>
        HandWrought is a web-based writing editor with AI-assisted editing features (outline generation, tone
        changes, synonyms, rephrasing, shortening, expanding, and grammar fixes). By default, these features run
        against a shared Google Gemini API key that we provide — new accounts get a limited number of free
        generations, and a credit pack unlocks a larger, non-expiring balance of AI generations. You can also supply your own
        Google Gemini API key in Settings to run AI features against your own quota instead, which is never stored
        on our servers.
      </p>

      <h2>Accounts</h2>
      <p>
        You need an account to use HandWrought. You&apos;re responsible for keeping your account credentials secure
        and for all activity under your account.
      </p>

      <h2>Payment and access</h2>
      <p>
        New accounts get a limited number of free AI generations, no payment required. A HandWrought credit pack
        is a one-time purchase — not a subscription — for AI generations. Credits do not expire and buying
        another pack adds to any credits you already have. Payments are processed by Paddle.com Market
        Ltd, our payment processor and merchant of record — Paddle handles your payment details, receipts, and
        applicable tax; we never see or store your card details. See our{" "}
        <a href="/refund">Refund Policy</a> for cancellation and refund terms.
      </p>

      <h2>Your content</h2>
      <p>
        Documents you write in HandWrought are yours. Document text is stored in your browser, not on our servers.
        When you use an AI feature, the relevant text is sent (via our server, which does not log or persist it) to
        Google&apos;s Gemini API using your own API key, and the response is returned to your browser.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use HandWrought to generate content that is illegal, infringes others&apos; rights, or violates
        Google&apos;s Gemini API usage policies. We may suspend accounts that abuse the Service or violate these
        terms.
      </p>

      <h2>No warranty</h2>
      <p>
        The Service is provided &quot;as is&quot;. AI-generated suggestions may be inaccurate — review them before
        use. We don&apos;t guarantee the Service will be uninterrupted or error-free.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. We&apos;ll update the &quot;Last updated&quot; date above when
        we do. Continued use of the Service after a change means you accept the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Reach us at <a href="mailto:manishpamnani169@gmail.com">manishpamnani169@gmail.com</a>{" "}
        or visit our <a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  );
}
