import type { ReactNode } from "react";

// Single source of truth for blog content — the index page and the
// individual post route both read from this array, and the sitemap maps
// over it too, so adding a real post later is just adding an entry here,
// no route/plumbing changes needed. `content` is hand-authored JSX (real
// <h2>/<h3>/<p>/<a>, styled by LegalPage's shared selectors) rather than a
// markdown string — no markdown pipeline exists in this codebase, and
// every other content page (privacy/terms/refund/docs) already follows
// this same hand-authored-JSX pattern.
export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date, e.g. "2026-09-10"
  content: ReactNode;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "stopped-copy-pasting-into-chatgpt",
    title: "Why I stopped copy-pasting into ChatGPT while I write",
    description:
      "Draft here, ask there, paste back: why that workflow broke down, and what I built instead: AI edits that land inside the document, not a separate chat tab.",
    date: "2026-09-10",
    content: (
      <>
        <p>
          For a while, my writing process looked like this: draft a paragraph, open a new tab, paste it into
          ChatGPT, describe what I wanted changed, wait, copy the answer, switch back, paste it in, and then try to
          remember what I&apos;d actually changed and why. Every single time. It worked. It just never stopped
          feeling like friction. The AI was helpful, but it was helpful somewhere else, in a chat window that had
          no idea what my document actually looked like five minutes ago, or what I&apos;d already tried and
          rejected.
        </p>

        <p>
          It worked fine for small things: a tweet, an email, a short first draft. But once things got longer, the
          workflow broke down, and I&apos;d be back at zero: staring at a screen, work piling up, no good way
          forward.
        </p>

        <video
          controls
          preload="metadata"
          className="w-full rounded-lg border border-[var(--color-border)]"
          src="/blog/origin-story.mp4"
        />

        <h2>Why the tab-switching wasn&apos;t the real problem</h2>
        <p>
          The friction wasn&apos;t the switching. It was that every suggestion arrived as a wall of text I had to
          reconcile against my own document by hand. Did it change the whole paragraph or just one line? Did it
          keep my formatting? Did it quietly drop the sentence I liked?
        </p>
        <p>
          I couldn&apos;t tell without reading both versions side by side, which defeated half the point of asking
          for help in the first place. The longer the piece got, the worse this compounded: every round of feedback
          meant holding two versions of the document in my head at once, and past a certain length, that just
          stopped working.
        </p>

        <h2>What I built instead: AI edits that land inside the document</h2>
        <p>
          So about five weeks ago I started building something to fix that for myself. Not a smarter chatbot. A
          different shape entirely. HandWrought puts the AI inside the document instead of next to it. You ask for
          a change (a sharper opening line, a tighter paragraph, a different tone) and it shows up as a
          suggestion in place, right where the text already lives. You review it, accept it, reject it, or ask
          again. Nothing gets applied automatically. Nothing leaves the page to get edited somewhere else and then
          have to find its way back.
        </p>
        <p>
          It sounds like a small difference. In practice it changes what &quot;asking for help&quot; feels like.
          You&apos;re not managing two versions of your document in your head anymore. There&apos;s just one
          document, and a suggestion is either part of it or it isn&apos;t yet.
        </p>
        <p>
          I&apos;m not claiming this is a completely novel idea: plenty of tools are chasing the same instinct
          these days, from Canvas-style ChatGPT interfaces to other inline editors. What I wanted was specifically
          the review step to be non-negotiable: never auto-apply, always show what changed, always let me say no.
          That&apos;s less about being first and more about being honest with myself about how much I actually
          trust an AI&apos;s first draft of an edit, which is: somewhat, not fully, and I want to see it before
          it&apos;s mine.
        </p>
        <p>
          Guest mode gets you five free generations, no signup, if you want to try this on something you&apos;re
          actually writing rather than take my word for it. Credits after that are a one-time purchase, not a
          subscription, a detail that matters more to me than it probably should, but I didn&apos;t want to build
          something that nickel-and-dimes people monthly for a tool they might only need in bursts.
        </p>

        <h2>How it actually works, step by step</h2>
        <p>
          There&apos;s no separate chat window doing the real work here. You ask for a change (either by
          highlighting a stretch of text or just placing your cursor where something needs fixing) and only that
          relevant piece of context goes along with the request, not your whole document.
        </p>

        <video
          controls
          preload="metadata"
          className="w-full rounded-lg border border-[var(--color-border)]"
          src="/blog/ai-edits.mp4"
        />

        <p>
          What comes back isn&apos;t a fresh block of text dropped in to replace what you had. It&apos;s a proposed
          edit, highlighted right over the exact stretch it would change, sitting next to your original. You see
          both before anything is decided: accept it to keep it, reject it to discard it, or ask again if
          it&apos;s not quite right. Nothing overwrites your document until you say so.
        </p>

        <h2>Where it&apos;s still rough</h2>
        <p>
          Building this alone in five weeks means there are real gaps, and the seams still show. A formatting bug
          forced me to pull docx/pdf export recently so I could rebuild it properly instead of patching around it.
          It&apos;s not back yet. It&apos;s also only been public for about a week, so there&apos;s still plenty I
          haven&apos;t found yet.
        </p>
        <p>
          But the thing that made me start, the constant tax of copy-pasting between tabs, is actually gone for
          me now, and that was the whole point.
        </p>
        <p>
          Written with HandWrought. Try it free at{" "}
          <a href="https://handwrought.online">handwrought.online</a>. Five generations, no signup required.
        </p>

        <h2>Frequently Asked Questions</h2>

        <h3>Why a one-time purchase instead of a subscription?</h3>
        <p>
          Credits are a one-time purchase: buy a pack, use it whenever, no expiry, no monthly charge. I wanted the
          pricing to match how a tool like this actually gets used: in bursts, not every single day, so paying for
          it every month regardless felt like the wrong model for a first-time, unproven product.
        </p>

        <h3>Is my writing data used to train AI models?</h3>
        <p>
          For the shared Gemini key HandWrought provides by default: no. Paid-tier Gemini API usage isn&apos;t used
          by Google to improve their models, only logged briefly for abuse/compliance purposes. If you bring your
          own Gemini API key instead, that depends on your own key&apos;s plan with Google, not on HandWrought.
          Same as it would with any tool you point your own key at.
        </p>

        <h3>Does it work with a draft I already have, or only blank documents?</h3>
        <p>
          You don&apos;t have to start blank. You can import an existing draft and start shaping it right away.
          Plain text and markdown import free; PDF and Word documents use 1 credit, same as a generation.
        </p>

        <h3>What happens to my document, and is it stored anywhere?</h3>
        <p>
          Documents and chat history live in your own browser&apos;s local storage, not on our servers. Clearing
          your browser data removes them. AI requests send the relevant text to our server in transit only, to
          reach Gemini&apos;s API and back. It isn&apos;t logged or persisted server-side.
        </p>
      </>
    ),
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
