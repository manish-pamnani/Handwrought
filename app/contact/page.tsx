import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Contact — HandWrought",
  description: "Get in touch with HandWrought for support, billing questions, or anything else.",
};

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        HandWrought is an AI writing companion built and run by Manish Pamnani. For support, billing questions, or
        anything else, email:
      </p>

      <p>
        <a href="mailto:handwrought.support@gmail.com" className="font-semibold">
          handwrought.support@gmail.com
        </a>
      </p>

      <p>We aim to respond within 2 business days.</p>

      <p>
        For refund requests, see our <a href="/refund">Refund Policy</a>.
      </p>
    </LegalPage>
  );
}
