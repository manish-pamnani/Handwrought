import { NextResponse } from "next/server";
import { getPaddleInstance } from "@/lib/paddleServer";
import { processEvent } from "@/lib/paddleWebhookHandlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ?? "";

  if (!signature || !rawBody) {
    return NextResponse.json({ error: "Missing signature or body" }, { status: 400 });
  }

  try {
    const paddle = getPaddleInstance();
    // Throws on signature mismatch, expired timestamp, or malformed event —
    // caught below and turned into a non-2xx so Paddle retries.
    const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);

    if (event) {
      await processEvent(event);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Signature failure, wrong/rotated secret, and handler errors all land
    // here indistinguishably — one non-2xx for all of them, so Paddle's
    // retry budget covers a rotated secret recovering after redeploy too.
    console.error("Paddle webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
