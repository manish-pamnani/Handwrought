"use client";

import Link from "next/link";
import Modal from "./Modal";

// Keyboard shortcuts verified directly against the installed extension
// source (node_modules/@tiptap/extension-*), not guessed — StarterKit +
// Highlight is the actual EDITOR_EXTENSIONS set (lib/richTextExtensions.ts).
// Only listing ones confirmed there; leaving off anything unverified rather
// than guessing at a binding.
const SHORTCUTS: Array<[string, string]> = [
  ["Bold", "⌘B"],
  ["Italic", "⌘I"],
  ["Underline", "⌘U"],
  ["Strikethrough", "⌘⇧S"],
  ["Bullet list", "⌘⇧8"],
  ["Numbered list", "⌘⇧7"],
  ["Blockquote", "⌘⇧B"],
  ["Code block", "⌘⌥C"],
  ["Undo", "⌘Z"],
  ["Redo", "⌘⇧Z"],
];

// External links live on-domain (/docs, /blog, /contact) rather than a
// separate subdomain — deliberate, see the SEO audit: a brand-new domain
// can't afford to split its own authority the way Excalidraw's
// plus.excalidraw.com blog does. A YouTube link (the fourth item in the
// Excalidraw modal this was modeled on) is left out on purpose — there's no
// real HandWrought channel yet, and a dead/placeholder link is worse than
// no link. Add it here once one exists.
const LINKS: Array<{ label: string; href: string }> = [
  { label: "Documentation", href: "/docs" },
  { label: "Read our blog", href: "/blog" },
  { label: "Found an issue? Tell us", href: "/contact" },
];

export default function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Help">
      <div className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 font-sans text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-inset)]"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <p className="mt-5 mb-2 font-sans text-xs font-semibold text-[var(--color-ink)]">Keyboard shortcuts</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {SHORTCUTS.map(([label, keys]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="font-sans text-[12.5px] text-[var(--color-ink-muted)]">{label}</span>
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-paper-inset)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink)]">
              {keys}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
