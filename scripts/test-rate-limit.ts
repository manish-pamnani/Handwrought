// One-off verification for lib/rateLimit.ts's checkRateLimit() — exercises
// the real Firestore-backed limiter directly (no HTTP, no browser, no
// Firebase Auth token needed) so it can be checked fast and in isolation.
// Cleans up its own test doc afterward. DELETE this file once verified, or
// keep it around as a smoke test — it's harmless to leave, it only ever
// touches its own "test:" scoped key.
//
// Run with: npx tsx --env-file=.env.local scripts/test-rate-limit.ts

import { checkRateLimit } from "@/lib/rateLimit";
import { getAdminDb } from "@/lib/firebaseAdmin";

const TEST_KEY = "verify-DELETE-ME";
const SCOPE = "test";
const LIMIT = 3;

async function main() {
  console.log(`Requesting ${LIMIT + 2} times against a limit of ${LIMIT}...\n`);

  const results: boolean[] = [];
  for (let i = 1; i <= LIMIT + 2; i++) {
    const allowed = await checkRateLimit(SCOPE, TEST_KEY, LIMIT);
    results.push(allowed);
    console.log(`  request ${i}: ${allowed ? "allowed" : "BLOCKED (429)"}`);
  }

  const expected = [true, true, true, false, false];
  const pass = JSON.stringify(results) === JSON.stringify(expected);

  console.log(`\n${pass ? "✅ PASS" : "❌ FAIL"} — first ${LIMIT} allowed, the rest blocked, as expected.`);
  if (!pass) {
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(results)}`);
  }

  // Clean up the test doc so it doesn't linger in Firestore.
  await getAdminDb().collection("rateLimits").doc(`${SCOPE}:${TEST_KEY}`).delete();
  console.log("\nTest doc cleaned up.");

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
