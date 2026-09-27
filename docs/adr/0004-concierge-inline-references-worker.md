---
status: proposed
---

# The Concierge streams text with inline references, from a Worker behind AI Gateway

The Concierge has to move the page while its answer is still arriving: the
visitor should see the first Project light up as the sentence that names it
streams in. So the model returns **plain streamed text with inline `[[id]]`
references**, not tool calls or a structured list of UI actions. The client
parses references as they arrive, turns each one into a chip and a stop in the
Focus, and drops any id the site doesn't know about. That drop is the grounding
guarantee: the Concierge can only point at things that exist on the site.

The model call runs in a Worker script on the same domain, in front of the
static assets (the "API route later" that ADR 0003 left room for). The Worker
sends requests through Cloudflare AI Gateway, which provides the spend budget,
logging and the switch between providers. Every page stays statically built.
The whole site uses Astro's `ClientRouter` with the Concierge panel persisted,
so the conversation stays on screen while the page changes beside it.

## Considered options

- **Tool calls or JSON-schema actions** (`focus`, `navigate`, `clear`, …). These
  are cleaner to validate, but actions only arrive once the model has finished
  them, so text and page can't move together. Structured-output passthrough on
  AI Gateway's OpenAI-compatible endpoint was also unverified, and not every
  candidate model supports it. With plain text, any OpenAI-compatible model
  works.
- **Full page loads with the conversation restored from `sessionStorage`.**
  Simpler, but the panel flickers on every navigation, which breaks "the chat
  stays still, the website changes".

## Consequences

The site is no longer purely static: it now depends on a Worker script and a
model provider. If either fails, the Concierge goes away but the canonical site
keeps working. Client-side routing affects every page's scripts, scroll
restoration and analytics. Answers depend on the model sticking to the `[[id]]`
format; a malformed reference loses one stop but never breaks the page.
