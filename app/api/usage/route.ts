import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsage, getUsageEvents } from "@/lib/serverCredits";

export const runtime = "nodejs";

// Backs the /plans-and-credits/usage page: the same aggregate access data as
// /api/access, plus a recent-events log for the history list.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("verifyIdToken failed:", err);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const [usage, events] = await Promise.all([getUsage(uid), getUsageEvents(uid)]);

  return NextResponse.json({ ...usage, events });
}
