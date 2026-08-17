import { NextResponse } from "next/server";
import { getPaddleInstance } from "@/lib/paddleServer";
import { processEvent } from "@/lib/paddleWebhookHandlers";
import { isPaddleIp } from "@/lib/paddleIpAllowlist";

export const runtime = "nodejs";

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  // IP allowlist is scoped to production: Paddle's published list
  // (https://api.paddle.com/ips) is documented as their live delivery IPs,
  // and sandbox deliveries aren't guaranteed to originate from the same
  // ranges — enforcing this in sandbox risks silently breaking local/staging
  // webhook testing. The HMAC signature check below is the check that
  // actually matters in every environment; this is defense-in-depth for live.
  if (process.env.NEXT_PUBLIC_PADDLE_ENV === "production") {
    const clientIp = getClientIp(request);
    let allowed = false;
    try {
      allowed = !!clientIp && (await isPaddleIp(clientIp));
    } catch (err) {
      console.error("Paddle IP allowlist check failed:", err);
      // Fail closed but let Paddle retry — this is almost certainly a
      // transient fetch issue, not a real forged request.
      return NextResponse.json({ error: "Could not verify source" }, { status: 503 });
    }
    if (!allowed) {
      console.error(`Paddle webhook rejected: source IP ${clientIp ?? "unknown"} is not a known Paddle IP`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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
