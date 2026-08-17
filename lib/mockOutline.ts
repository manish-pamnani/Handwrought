const LOREM_HEADINGS = [
  "Lorem ipsum dolor sit amet",
  "Consectetur adipiscing elit",
  "Sed do eiusmod tempor incididunt",
  "Ut labore et dolore magna aliqua",
  "Ut enim ad minim veniam",
];

function titleCase(topic: string): string {
  return topic
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/**
 * TEMP, no network call: stands in for the real outline generation while
 * testing the Enter-to-outline flow, so we're not burning API tokens on
 * every keystroke test. Swap the call site back to the real `handleSend`
 * path once done testing.
 */
export function generateMockOutline(topic: string): string {
  const subCount = 3 + Math.floor(Math.random() * 3); // 3-5
  const subs = LOREM_HEADINGS.slice(0, subCount).map((h) => `## ${h}`).join("\n\n");
  return `# ${titleCase(topic)}\n\n${subs}`;
}
