import { Resend } from "resend";

let client: Resend | null = null;

function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set — cannot send transactional email.");
    }
    client = new Resend(apiKey);
  }
  return client;
}

const FROM = "HandWrought <waitlist@handwrought.online>";

function waitlistConfirmationHtml(): string {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1e1b17; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #64594a; margin: 0 0 24px;">HandWrought</p>
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">You're on the list</h1>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
        Thanks for joining the waitlist for credits — a one-time purchase, no subscription. Your credits never
        expire, so you can use them whenever you like. We're still finishing the details, and the moment it's
        ready to buy, you'll be the first to know.
      </p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 14px;">
        In the meantime, your free credits are still yours to use — nothing about this changes how you write today.
      </p>
      <p style="font-size: 15px; line-height: 1.6; margin: 28px 0 0; color: #64594a;">
        — HandWrought<br />
        <em>Written by hand, shaped by AI.</em>
      </p>
    </div>
  `.trim();
}

function waitlistConfirmationText(): string {
  return (
    "You're on the list.\n\n" +
    "Thanks for joining the waitlist for credits — a one-time purchase, no subscription. Your credits never " +
    "expire, so you can use them whenever you like. We're still finishing the details, and the moment it's " +
    "ready to buy, you'll be the first to know.\n\n" +
    "In the meantime, your free credits are still yours to use — nothing about this changes how you write today.\n\n" +
    "— HandWrought\n" +
    "Written by hand, shaped by AI."
  );
}

export async function sendWaitlistConfirmation(email: string): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're on the list",
    html: waitlistConfirmationHtml(),
    text: waitlistConfirmationText(),
  });
  if (error) {
    throw new Error(`Resend rejected the waitlist confirmation email: ${error.message}`);
  }
}
