import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage, accrueDictationSeconds, logUsageEvent } from "@/lib/serverCredits";
import { DICTATION_SECONDS_PER_CREDIT, DICTATION_MAX_CLIP_SECONDS } from "@/lib/constants";

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
    return NextResponse.json({ error: "Paid plan required", code: "paid_feature" }, { status: 402 });
  }

  const body = await request.json().catch(() => null);
  const rawDuration = Number(body?.durationSeconds);
  if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const durationSeconds = Math.min(DICTATION_MAX_CLIP_SECONDS, Math.round(rawDuration));

  try {
    const { creditsRemaining, creditsSpent } = await accrueDictationSeconds(
      uid,
      durationSeconds,
      DICTATION_SECONDS_PER_CREDIT
    );

    if (creditsSpent > 0) {
      await logUsageEvent(uid, "dictate", "credit");
    }

    return NextResponse.json({ creditsRemaining, creditsSpent });
  } catch (err) {
    console.error("accrue dictation seconds failed:", err);
    return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
  }
}
