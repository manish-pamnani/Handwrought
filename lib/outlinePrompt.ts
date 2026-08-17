export function buildArticleInstruction(topic: string): string {
  return (
    `Write a complete, well-structured draft article about: "${topic}". ` +
    `Format it in Markdown: a single "# " title heading, then a short introduction paragraph, ` +
    `then a few sections each starting with a "## " heading followed by full prose paragraphs ` +
    `(not bullet points), and a brief conclusion. Write real, finished sentences throughout — ` +
    `this should read as a ready draft, not an outline.`
  );
}
