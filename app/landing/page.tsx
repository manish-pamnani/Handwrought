import type { Metadata } from "next";
import StreamLatencyBench from "@/components/StreamLatencyBench";

export const metadata: Metadata = {
  title: "Streaming into an editor — HandWrought",
  description: "What streaming model output token by token into an editor does to typing.",
  // Public and shareable, but kept out of search results so it doesn't
  // compete with the real homepage.
  robots: { index: false, follow: true },
};

export default function StreamingComparisonPage() {
  return <StreamLatencyBench />;
}
