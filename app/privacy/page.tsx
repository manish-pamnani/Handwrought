import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — HandWrought",
  description: "What HandWrought collects, why, and who else sees it — account data, documents, AI requests, and payments.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>Last updated: August 2026</p>

      <p>
        HandWrought is operated by Manish Pamnani (&quot;we&quot;, &quot;us&quot;). This page explains what data we
        collect, why, and who else sees it.
      </p>

      <h2>Account data</h2>
      <p>
        We use Firebase Authentication (Google) to manage sign-up and sign-in. We store your email address and an
        authentication record; we never see or store your password directly (Firebase handles that). We also store,
        against your account, your remaining AI generation credits and, if you&apos;ve purchased credits,
        your credit tier and the associated Paddle transaction ID.
      </p>

      <h2>Your documents</h2>
      <p>
        Documents and chat history you create in HandWrought are stored in your own browser&apos;s local storage,
        not on our servers. Clearing your browser data will remove them.
      </p>

      <h2>AI features (Gemini API key and content)</h2>
      <p>
        By default, AI editing actions run against a shared Google Gemini API key that we provide: the relevant
        document text is sent to our server, forwarded to Google&apos;s Gemini API using our key, and the response
        is returned to your browser — this happens in transit only; we don&apos;t log or persist your document
        content server-side. If you supply your own Google Gemini API key in Settings instead, it&apos;s stored only
        in your browser and sent to our server the same way, in transit only, never stored.
      </p>

      <h2>Payments</h2>
      <p>
        Payments are handled entirely by Paddle.com Market Limited, our payment processor and merchant of record.
        Paddle collects and processes your payment details, billing address, and tax information directly — we
        never see or store your card details. See{" "}
        <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noreferrer">
          Paddle&apos;s Privacy Policy
        </a>{" "}
        for how they handle payment data.
      </p>

      <h2>Analytics</h2>
      <p>
        We use Google Analytics to understand how visitors use HandWrought (e.g. which pages are viewed, general
        usage patterns). Google Analytics sets cookies in your browser and collects information such as your IP
        address, device/browser type, and pages visited. See{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          Google&apos;s Privacy Policy
        </a>{" "}
        for how Google handles this data.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No selling or sharing your data with advertisers.</li>
        <li>No tracking scripts beyond Google Analytics described above.</li>
      </ul>

      <h2>Third parties we rely on</h2>
      <ul>
        <li>Firebase (Google) — authentication and our account database (Firestore).</li>
        <li>Google Gemini API — powers AI editing features, using our shared API key by default or your own key if you add one in Settings.</li>
        <li>Google Analytics — usage analytics, described above.</li>
        <li>Paddle.com Market Limited — payment processing and billing, as merchant of record.</li>
        <li>Resend — sends transactional email (e.g. waitlist confirmation) to the address you provide.</li>
        <li>Our hosting provider — serves the application; standard request logs (e.g. IP address) may be retained briefly for security and abuse prevention.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can request a copy of your account data or ask us to delete your account and associated data at any
        time by emailing <a href="mailto:manishpamnani169@gmail.com">manishpamnani169@gmail.com</a>. Deleting your
        account does not affect billing records Paddle is required to retain for tax/legal purposes.
      </p>

      <h2>Children</h2>
      <p>HandWrought is not directed at children under 16, and we don&apos;t knowingly collect data from them.</p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. We&apos;ll update the &quot;Last updated&quot; date above when
        we do.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email{" "}
        <a href="mailto:manishpamnani169@gmail.com">manishpamnani169@gmail.com</a> or visit our{" "}
        <a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  );
}
