import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Refund Policy — HandWrought" };

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>Last updated: July 2026</p>

      <h2>Lifetime Access</h2>
      <p>
        If HandWrought Lifetime Access isn&apos;t right for you, email us within <strong>14 days</strong> of your
        purchase and we&apos;ll issue a full refund — no questions asked, no need to justify why.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href="mailto:manishpamnani169@gmail.com">manishpamnani169@gmail.com</a> with the email address you
        purchased with (or your Paddle order confirmation). We aim to respond within 2 business days. Refunds are
        processed by Paddle, our payment processor, back to your original payment method — this can take a few
        business days to appear depending on your bank or card provider.
      </p>

      <h2>After 14 days</h2>
      <p>
        We&apos;re unable to offer refunds for requests made more than 14 days after purchase, except where required
        by law.
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
