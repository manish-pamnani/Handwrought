---
name: blog-writer
description: Write or revise a HandWrought blog post end to end — competitor research, first-person founder voice, verified-facts-only discipline, structural anti-AI-tell rules (including the em-dash finding), and HandWrought's own dogfooding workflow. Use whenever drafting a new post for lib/blogPosts.tsx, or revising an existing one.
---

# HandWrought Blog Writer

Built from what actually worked across the first three posts this session, merged with the useful parts of a generic "expert-practitioner article" prompt template — keeping what's empirically proven, dropping what conflicts with it. Two things this skill has that a generic version wouldn't: a real audit finding (em-dash overuse, not just banned words) with real numbers behind it, and HandWrought's own dogfooding workflow, which is the actual differentiator, not a nice-to-have.

## Step 0: Which mode is this post?

Two proven modes, don't force a topic into the wrong one:

- **Personal essay** (posts #1, #2): first-person founder narrative, a real decision or moment as the spine, no TOC/table/FAQ scaffolding. Right for "why I built X" / "why I chose Y" topics.
- **Structured decision-guide** (post #3): TOC, H2s phrased as real questions, a comparison table, an FAQ section, answer-first opening. Right for "how do I decide X" / practical-reference topics — also the better fit for AI-search/answer-engine pickup.

## Step 1: Research the actual competition (structured-guide mode; optional but useful for essays)

Search the primary keyword/topic. Read what's actually ranking. Then note, briefly, before writing:

1. The one-line job the searcher is actually trying to get done.
2. What every ranking page already covers — the table stakes to include.
3. What they all miss, get wrong, or explain badly. Write to close that gap specifically, not to cover the same ground better.

Real example from this session: researching "AI writing tool" + "no subscription" surfaced that ProWritingAid, Hemingway, and several smaller tools compete explicitly on one-time-purchase pricing, a real validated cluster none of the first three posts targeted directly.

## Step 2: Hard rules on truth (the most important step, not negotiable)

- Never invent facts, statistics, study names, dates, prices, or people. Ever.
- Never fabricate personal experience or anecdotes. A real example from this session: a competitor-supplied article opened with "a food blogger I know" and "a sophomore" as if real, specific incidents. They were almost certainly invented. Don't do that. Where a real anecdote would help and none exists, write `[YOUR EXAMPLE: ...]` and leave it for a human to fill in or cut.
- **Product claims get verified against the actual code, not assumed.** Not "the AI probably highlights the change somehow", grep the real implementation first. This session caught a shaped draft asserting a "character-level diff overlay" that isn't what the code does (it's region-based highlighting, `highlightRects` in `DocumentPanel.tsx`) — and separately verified the credit-consumption-timing claim in post #3 directly against `app/api/chat/route.ts` before writing it as fact.
- **External claims get verified via search, not assumed.** The Gemini API training-data claim in post #1's FAQ was corrected after an actual search confirmed the paid-tier-vs-free-tier distinction, rather than trusting the shaped draft's confident phrasing.
- At the end of drafting, list every claim you're not fully confident about, so it can be checked before publishing.

## Step 3: Voice

- Vary paragraph length the way you'd vary sentence length. Some paragraphs are one line. Don't open every section with a topic sentence followed by three supporting sentences — that rhythm is itself a tell, independent of word choice.
- Cut hedging ("can," "may," "often," "generally," "it depends") when it's filler. **Keep it when the uncertainty is real and specific** — post #2's closing section ("I don't think this is settled... I'm not certain review-first is the permanently correct answer") is genuine, considered uncertainty, not a hedge, and it's some of the strongest writing in the piece. Don't sand that down chasing false confidence.
- Concrete over abstract, with real numbers: "every generation is a flat one credit" beats "generations are affordable," and it's only usable because it's actually true, not because it sounds specific.

## Step 4: Banned AI tells

**Em-dashes are the single biggest finding from this session, bigger than any word list.** Audited against the first three drafts before cleanup: post #1 had 22 in the actual content, post #2 had 6, post #3 had 12. Zero flagged words showed up in any of them. Convert every em-dash: comma for most parenthetical breaks, colon before an explanation or list, parentheses for a true aside, period when it's really two sentences pretending to be one (watch for comma splices when doing this conversion by hand — two independent clauses need a period or semicolon, not just a comma). Keep at most one or two per full piece, and only for genuine, deliberate emphasis.

Words to avoid: delve, leverage, robust, seamless, comprehensive, pivotal, crucial, foster, unlock, elevate, game-changer, landscape (figurative), tapestry, testament, navigate (figurative), furthermore, moreover, at its core, in today's [anything], it's worth noting, it's important to note, in conclusion, at the end of the day.

Structural tells beyond vocabulary: "not only X but also Y," stacked "moreover/furthermore," a conclusion that just restates the intro, defaulting to lists of exactly three items, opening every section the same way.

## Step 5: Structure by mode

- **Structured-guide mode**: open with the actual answer in the first two sentences, no throat-clearing. Post #3's fix was concrete: it used to open with framing ("here's the more specific version..."), now it opens by stating the accept/reject/ask-again rule directly, then backs into a real quantified fact (the flat-credit-timing detail) before any setup.
- **Personal-essay mode**: open on a specific moment, not an abstraction. Generate 3-4 distinct hook options (concrete scene, direct question, name-the-industry-default-then-break-from-it, etc.) and pick one deliberately rather than defaulting to the first draft — this is now standard, not optional.
- Either mode: mark internal-link spots as `[INTERNAL LINK: topic]` and video/screenshot spots as an HTML/JSX comment (invisible in the rendered page, not literal bracketed text — post #1's shaped draft briefly had a literal `[origin-story.mp4]` string rendered on the live page before this was caught).
- When grounding an argument, name real competitor tools and mechanisms where you actually know them (post #2's Grammarly/Notion AI/ChatGPT Canvas/Cursor/Copilot paragraph), not vague gestures at "most AI tools."

## Step 6: HandWrought's own workflow — the part a generic prompt doesn't have

This is the actual differentiator, not a nice-to-have step to skip under time pressure:

1. Claude drafts raw material only, not a finished piece, real headers already in place if it's structured-guide mode.
2. Generate the hook alternatives (Step 5) before finalizing.
3. **The user imports the raw draft into HandWrought itself and shapes it there**, using the product's own accept/reject/ask-again review flow. This is deliberate dogfooding: it produces the content and doubles as real material for a build-in-public screen recording. Claude does not do this step — it's the user's, in their own browser, using the actual product.
4. User sends back the shaped output. Claude does the cleanup pass: check for duplicated content (a real, repeated failure mode — the shaping pass has added a new paragraph without removing the old one more than once), voice drift into generic phrasing, unverified technical/factual claims (Step 2), leftover literal placeholder text, and heading-level consistency.
5. Wire the finalized piece into `lib/blogPosts.tsx` as real hand-authored JSX (`<h2>`/`<h3>`/`<p>`/`<a>`, styled via `LegalPage`'s shared selectors) — no markdown/MDX pipeline exists in this codebase, don't introduce one for blog posts specifically.

## Step 7: Self-edit checklist before showing the user

- `grep -c '—'` the draft. Should be 0-2, not more.
- Grep the banned-word list (Step 4). Any hits, rewrite them.
- Any sentence carrying no real information? Cut it.
- Any three consecutive sentences the same length? Break the rhythm.
- Any point made twice across two sections in two different voices? Merge or cut one.
- Any claim about the product's own behavior that wasn't actually checked against the code?
- Confirm no invented facts, anecdotes, or citations remain unflagged.

## Output, once finalized

- The finished post content (JSX, ready for `lib/blogPosts.tsx`).
- SEO pack: title tag (under 60 chars), meta description (under 155 chars, this is the actual `description` field on the `BlogPost` type), URL slug.
- The list of claims/sources still needing verification, and any `[YOUR EXAMPLE: ...]` / `[INTERNAL LINK: ...]` placeholders still open.

## Related

Full workflow history and the reasoning behind each rule lives in project memory (`handwrought_blog_writing_workflow.md`) — this skill formalizes and supersedes that file's process description; the memory file now just points here.
