import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage } from "@/lib/serverCredits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(idToken)).uid;
  } catch (err) {
    console.error("verifyIdToken failed:", err);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const usage = await getUsage(uid);
  if (!usage.tier) {
    return NextResponse.json(
      { error: "Voice dictation is available on paid plans — upgrade to unlock it.", code: "paid_feature" },
      { status: 402 }
    );
  }
  if (usage.creditsRemaining <= 0) {
    return NextResponse.json(
      {
        error: "You've used all your credits — buy more anytime to keep dictating.",
        code: "credits_exhausted",
        creditsRemaining: 0,
      },
      { status: 402 }
    );
  }

  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) {
    return NextResponse.json({ error: "Streaming dictation is not configured." }, { status: 503 });
  }

  try {
    const grantRes = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 60 }),
    });

    if (!grantRes.ok) {
      const errText = await grantRes.text().catch(() => "");
      console.error("Deepgram grant failed:", grantRes.status, errText);
      return NextResponse.json(
        { error: `Failed to issue streaming token (${grantRes.status})` },
        { status: 502 }
      );
    }

    const data = await grantRes.json();
    return NextResponse.json({
      token: data.access_token,
      expiresIn: data.expires_in,
    });
  } catch (err) {
    console.error("Error creating Deepgram token:", err);
    return NextResponse.json({ error: "Failed to connect to dictation service." }, { status: 502 });
  }
}
