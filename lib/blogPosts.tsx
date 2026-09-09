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
  {
    slug: "ai-edits-auto-apply-or-review-first",
    title: "Should AI edits apply automatically, or should you review them first?",
    description:
      "Most AI tools auto-apply by default. I picked friction on purpose for HandWrought: why review-first beats auto-apply-then-undo, and what it actually costs.",
    date: "2026-09-09",
    content: (
      <>
        <p>
          A few weeks into building HandWrought, I watched an AI suggestion quietly replace a sentence I actually
          liked. It wasn&apos;t wrong, exactly, just different, in a way I wouldn&apos;t have caught if I
          hadn&apos;t happened to be paying close attention. That was the moment &quot;should edits apply
          automatically&quot; stopped being a UI detail and started being the actual design of the product.
        </p>

        <h2>Why auto-apply is the default nearly everyone reaches for</h2>
        <p>
          Most AI tools I&apos;ve used lean toward auto-apply, one way or another. You ask, it writes, the text is
          just there now. Undo if you don&apos;t like it. It&apos;s the natural default because it&apos;s the
          smoother demo. Nothing to click, nothing to review, the magic just happens. And for a lot of use cases
          that&apos;s genuinely fine: a slide generator, a quick email draft, something disposable you were never
          going to fuss over anyway.
        </p>
        <p>
          Writing didn&apos;t feel like that to me. A document I&apos;m actually working on isn&apos;t disposable.
          I don&apos;t want to discover, three paragraphs later, that a sentence I liked got quietly swapped for
          something else because I skimmed past it.
        </p>
        <p>
          You&apos;ve probably already made a version of this call without thinking about it. Grammarly underlines
          a suggestion and waits for a click. Notion AI drops the new text in and gives you Keep or Discard.
          ChatGPT&apos;s canvas and Claude&apos;s artifacts will rewrite a selection in place, no confirmation
          needed. Cursor and Copilot, on the code side, apply a whole batch and make you walk the diff afterward if
          you want to check it. Every one of those tools picked a spot on the same slider, from nothing changes
          until you say so to everything changes and you clean up after, and most of them don&apos;t tell you
          where they landed. You find out the first time an edit shows up somewhere you didn&apos;t expect.
        </p>

        <h2>How much do you actually trust a model&apos;s first attempt?</h2>
        <p>
          This is the real question underneath the UI decision, and I don&apos;t think there&apos;s a clean
          answer. Somewhat. Not fully. Enough to ask for help, not enough to hand over the keys.
        </p>
        <p>
          I&apos;ve had AI suggestions that were exactly right, sharper than what I&apos;d have written myself.
          I&apos;ve also had ones that technically did what I asked and still felt wrong: the right words in the
          wrong voice, a rewrite that fixed the sentence I pointed at and broke the rhythm of the one next to it.
          Auto-apply treats both outcomes the same. Review-first doesn&apos;t have to.
        </p>

        <h2>What review-first actually costs you</h2>
        <p>
          I&apos;m not going to pretend this is free. Reviewing every suggestion is friction, full stop, and on a
          long editing session it adds up. There&apos;s a version of this that&apos;s obviously too cautious:
          reviewing a comma fix like it&apos;s a legal contract is its own kind of broken.
        </p>
        <p>
          But the cost of the opposite failure mode is worse and less visible. An auto-applied edit that&apos;s
          subtly wrong doesn&apos;t announce itself. You find out later, if you find out at all, and by then
          you&apos;ve built on top of it.
        </p>
        <p>
          The comparison that actually matters isn&apos;t review versus no review. It&apos;s this review versus
          the workflow I was already running before I built HandWrought: draft a paragraph, switch tabs, paste it
          into ChatGPT, describe the change, wait, copy the answer back, and try to reconstruct what actually
          moved. That&apos;s the slow version. A suggestion you can glance at and accept or reject in place takes a
          few seconds, and you never leave the document. Fast and reviewed aren&apos;t opposites here. Fast and
          reviewed somewhere else was the thing actually costing time.
        </p>

        <h2>Where I landed, building HandWrought</h2>
        <p>
          I picked friction on purpose. Every AI suggestion in HandWrought shows up as a proposed edit sitting
          next to your original text: you accept it, reject it, or ask again, but nothing overwrites your document
          until you say so. That was true on day one and it&apos;s still true now; it was never a feature I added,
          it was closer to a constraint I designed everything else around.
        </p>
        <p>
          There&apos;s a reason propose-then-apply beats apply-then-undo even when undo is right there. Once a
          sentence is sitting in your document, formatted like the rest, reading like it belongs, you&apos;ve
          stopped judging it on its own merits. You&apos;re deciding whether to rip out something that already
          looks finished, and that&apos;s a higher bar than deciding whether to let something in. The text gets
          the benefit of the doubt just by showing up in the right place. Showing the suggestion first keeps the
          burden where it belongs: on the edit, to prove it&apos;s better than what I wrote, not on me to notice
          something&apos;s wrong after it&apos;s already there.
        </p>
        <p>
          The honest reason isn&apos;t some grand philosophy about human agency in the age of AI. It&apos;s
          narrower than that: I didn&apos;t trust my own first draft of an AI edit enough to let it apply itself,
          and I didn&apos;t think anyone else would either, if they actually thought about it instead of just
          accepting the smoother default.
        </p>

        <h2>I don&apos;t think this is settled</h2>
        <p>
          I&apos;ll say the thing I&apos;d want someone to say to me: I&apos;m not certain review-first is the
          permanently correct answer. Trust in a tool builds over time, and it&apos;s plausible that a few years
          from now, for a model with a long enough track record, auto-apply stops being reckless and starts being
          just... normal, the way autocomplete stopped needing a confirmation dialog decades ago.
        </p>
        <p>
          I just don&apos;t think we&apos;re there yet, and I&apos;d rather build for how much I actually trust
          these models today than for how much I wish I did.
        </p>
      </>
    ),
  },
  {
    slug: "accept-or-reject-ai-suggestion",
    title: "When should you accept an AI suggestion, and when should you reject it?",
    description:
      "A practical framework for accepting, rejecting, or asking again on an AI suggestion, including whether rejecting actually costs you a credit.",
    date: "2026-09-09",
    content: (
      <>
        <p>
          Accept a suggestion when it clears three checks: it does what you asked, it sounds like you, and it
          survives the sentences around it. Reject it the moment it changes something you didn&apos;t ask about or
          states something you can&apos;t verify. Ask again, instead of either, when the idea is right but the
          execution isn&apos;t.
        </p>
        <p>
          That&apos;s the actual rule, and it holds regardless of the decision you make: every generation in
          HandWrought is a flat one credit (or one of your five free generations), charged the moment it&apos;s
          created, not when you accept it. Accepting, rejecting, and asking again all cost the same nothing-extra,
          so there&apos;s no version of this where rubber-stamping saves you anything. &quot;Read it
          carefully&quot; isn&apos;t a decision framework on its own, so here&apos;s the more specific version:
          what actually makes a suggestion worth keeping, what&apos;s worth rejecting outright, and what&apos;s
          worth asking again for instead.
        </p>

        <h2>Table of Contents</h2>
        <ul>
          <li>What makes a suggestion worth accepting?</li>
          <li>When is a suggestion worth rejecting outright?</li>
          <li>What if the suggestion is right, but not right for you?</li>
          <li>A quick decision framework</li>
          <li>FAQ</li>
          <li>The short version</li>
        </ul>

        <h2>What makes a suggestion worth accepting?</h2>
        <p>Three checks, in order, and a suggestion has to clear all three:</p>
        <ul>
          <li>Does it do what you actually asked?</li>
          <li>Does it sound like you?</li>
          <li>Does it survive reading the sentence before and after it?</li>
        </ul>
        <p>
          A suggestion can pass the first check and fail the second: technically correct, wrong voice. It can pass
          the first two and fail the third: a good sentence that doesn&apos;t fit where it landed.
        </p>

        <h2>When is a suggestion worth rejecting outright?</h2>
        <p>
          Reject, don&apos;t edit-then-accept, when the suggestion changed something you didn&apos;t ask about:
          scope creep is the most common failure mode, and it&apos;s worth treating as a hard no rather than a
          partial yes. Same for anything that introduces a claim or detail you didn&apos;t write and can&apos;t
          verify on the spot; an AI suggestion confidently adding a fact is exactly the kind of thing the review
          step exists to catch.
        </p>

        <h2>What if the suggestion is right, but not right for you?</h2>
        <p>
          This is the &quot;ask again&quot; case, and it&apos;s different from reject. The idea in the suggestion
          is sound, the direction is right, but the execution isn&apos;t: too formal, too long, missing the
          specific angle you actually meant. Rejecting and starting over from nothing wastes the part that was
          already working. Asking again, pointed at what specifically felt off, is usually faster than describing
          the whole request from scratch a second time.
        </p>

        <h2>A quick decision framework</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Signal</th>
                <th>What it means</th>
                <th>What to do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Does what you asked, sounds like you</td>
                <td>Passed all three checks</td>
                <td>Accept</td>
              </tr>
              <tr>
                <td>Right idea, wrong execution</td>
                <td>Direction&apos;s correct, tone/length/angle is off</td>
                <td>Ask again, pointed at the specific miss</td>
              </tr>
              <tr>
                <td>Changed something you didn&apos;t ask about</td>
                <td>Scope crept beyond the request</td>
                <td>Reject</td>
              </tr>
              <tr>
                <td>Adds a fact or claim you can&apos;t verify</td>
                <td>Confidently wrong is still wrong</td>
                <td>Reject</td>
              </tr>
              <tr>
                <td>Technically correct, wrong voice</td>
                <td>Passes the first check, fails the second</td>
                <td>Reject or ask again, depending on how close it is</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Quick recap, if you just want the short version:</p>
        <ul>
          <li>All three checks pass → accept.</li>
          <li>Right idea, wrong execution → ask again, and say specifically what missed.</li>
          <li>Anything else (scope crept, or you can&apos;t verify a claim it added) → reject.</li>
        </ul>

        <h2>FAQ</h2>

        <h3>Does rejecting a suggestion refund the credit?</h3>
        <p>
          No. Credits (and free generations) are spent when the suggestion is generated, not when you accept it,
          so a rejected suggestion still counts. This is worth knowing going in: rejecting is free to your
          document, not free to your balance. Asking again generates a new suggestion and is a separate charge.
        </p>
        <p>
          One misconception worth naming directly: that isn&apos;t a wasted credit. Rejecting is the review step
          doing exactly what it&apos;s for. The real cost was never rejecting a suggestion: it&apos;s not
          reviewing at all, and letting something wrong through because looking felt like the more expensive
          option.
        </p>

        <h3>Can you edit a suggestion before accepting it?</h3>
        <p>
          The suggestion shows up as a proposed edit you can accept, reject, or ask again on. It&apos;s not a text
          field you type into directly before deciding. If it&apos;s close but not quite right, asking again with
          what specifically to change is the way to get there, not manual editing mid-review.
        </p>

        <h3>Does asking again cost the same as the first request?</h3>
        <p>
          Yes, every generation is flat, one credit (or one free generation), regardless of length or whether
          it&apos;s a first attempt or a fifth. There&apos;s no discount for refining an existing suggestion
          versus starting a new one.
        </p>

        <h3>Is there a limit to how many times you can ask again on the same spot?</h3>
        <p>
          No hard limit: it&apos;s gated by your credits or free generations, not by a retry cap. Whether
          it&apos;s worth the credits to keep refining one suggestion versus starting fresh is a judgment call,
          not a rule the product enforces.
        </p>

        <h2>The short version</h2>
        <p>
          Accept when it passes all three checks. Ask again when the idea&apos;s right but the execution
          isn&apos;t. Reject when it drifted past what you asked or added something you can&apos;t stand behind.
          None of this needs to be automatic. It&apos;s supposed to take a second of actual attention, and that
          second is the whole point of reviewing in the first place.
        </p>
      </>
    ),
  },
  {
    slug: "one-time-purchase-ai-writing-tools",
    title: 'AI writing tools without a subscription: what "one-time purchase" actually means',
    description:
      "Not every one-time-purchase AI writing tool works the same way. What the term actually covers, and how HandWrought's credit packs differ from unlimited-forever tools.",
    date: "2026-09-09",
    content: (
      <>
        <p>
          &quot;One-time purchase&quot; on an AI writing tool means one of two different things, and they
          aren&apos;t interchangeable: pay once for unlimited use forever, or pay once for a fixed amount of use
          that never expires. HandWrought is the second kind. Knowing which one you&apos;re looking at before you
          buy saves you from assuming a claim that isn&apos;t actually being made.
        </p>

        <h2>Table of Contents</h2>
        <ul>
          <li>Why &quot;no subscription&quot; became a real selling point</li>
          <li>The two different things &quot;one-time purchase&quot; can mean</li>
          <li>What HandWrought&apos;s version actually is</li>
          <li>A real comparison</li>
          <li>FAQ</li>
        </ul>

        <h2>Why &quot;no subscription&quot; became a real selling point</h2>
        <p>
          Subscription fatigue is a specific complaint, not just a mood: most people already pay for five, ten,
          fifteen recurring tools, and adding an AI writing subscription on top is a decision made every month,
          not once. A handful of tools compete directly on the alternative. Hemingway Editor sells at $19.99 as a
          one-time purchase. ProWritingAid offers a $399 lifetime plan, explicitly framed against its own monthly
          plan. Smaller tools like Draftsmith ($49) and Toolplay ($11 to $47) exist almost entirely around the
          same pitch: pay once, own it.
        </p>
        <p>That&apos;s a real market. It&apos;s also not one pricing model, even though it usually gets described as one.</p>

        <h2>The two different things &quot;one-time purchase&quot; can mean</h2>
        <p>
          The first kind: pay once, use without limit, forever. Hemingway Editor works this way; it&apos;s a
          desktop tool with no usage metering once you&apos;ve bought it.
        </p>
        <p>
          The second kind: pay once for a fixed amount of use, no expiry, no recurring charge, but not infinite
          either. You use what you paid for, and when it&apos;s gone, you buy more, on your own schedule, not a
          billing cycle&apos;s.
        </p>
        <p>
          Neither is dishonest. They just answer different questions. The first says: never think about cost
          again. The second says: never get charged again without deciding to.
        </p>

        <h2>What HandWrought&apos;s version actually is</h2>
        <p>
          HandWrought is the second kind. Credits are a one-time purchase, not a subscription: $9 for 100
          credits, $19 for 200, $29 for 400. They never expire and never reset on a timer. Buying again adds to
          whatever&apos;s left rather than replacing it. Every generation costs a flat 1 credit, regardless of
          length.
        </p>
        <p>
          The reason isn&apos;t that unlimited-forever was too expensive to offer. It&apos;s that AI inference has
          a real, ongoing per-generation cost that a flat unlimited fee has to price in somehow, usually by
          capping quality, capping length, or quietly assuming most buyers won&apos;t actually use it heavily. A
          metered one-time purchase is the more honest version of the same constraint: the cost structure is
          visible instead of hidden in the fine print.
        </p>

        <h2>A real comparison</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Price</th>
                <th>What &quot;one-time&quot; means here</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hemingway Editor</td>
                <td>$19.99 once</td>
                <td>Unlimited use, forever, no metering</td>
              </tr>
              <tr>
                <td>ProWritingAid (lifetime)</td>
                <td>$399 once</td>
                <td>Unlimited use, forever, on the lifetime tier</td>
              </tr>
              <tr>
                <td>Draftsmith</td>
                <td>$49 once</td>
                <td>Unlimited use, forever, desktop only</td>
              </tr>
              <tr>
                <td>Toolplay</td>
                <td>$11-$47 once</td>
                <td>Unlimited use, forever, per tool license</td>
              </tr>
              <tr>
                <td>HandWrought</td>
                <td>$9 / $19 / $29 once</td>
                <td>Fixed credits, never expire, buy more anytime</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>FAQ</h2>

        <h3>Is HandWrought actually free to try first?</h3>
        <p>Yes. Guest mode gives five free generations with no signup, before any purchase decision.</p>

        <h3>Do unused credits ever expire?</h3>
        <p>No. There&apos;s no reset timer and no use-it-or-lose-it window. Credits sit until you use them.</p>

        <h3>What happens if I buy more credits while I still have some left?</h3>
        <p>
          The new credits add to your existing balance. Buying again doesn&apos;t replace or reset what&apos;s
          already there.
        </p>

        <h3>Why not just offer unlimited generations for a flat one-time fee?</h3>
        <p>
          Because that fee would still have to price in unlimited AI inference cost somehow, and that cost
          doesn&apos;t disappear just because the pricing page says &quot;unlimited.&quot; A flat, metered credit
          is the more honest version of the same limit.
        </p>
      </>
    ),
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
