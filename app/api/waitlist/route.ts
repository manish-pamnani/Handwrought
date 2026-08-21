import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendWaitlistConfirmation } from "@/lib/resend";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const ref = getAdminDb().collection("lifetimeWaitlist").doc(email);
  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({ email, createdAt: new Date().toISOString() });
    // Best-effort — a Resend outage or missing API key shouldn't fail the
    // waitlist signup itself, since the Firestore write (the thing that
    // actually matters) already succeeded.
    try {
      await sendWaitlistConfirmation(email);
    } catch (err) {
      console.error("waitlist confirmation email failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
