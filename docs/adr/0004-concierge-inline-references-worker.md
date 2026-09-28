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

A reference may carry a short note, `[[id|note]]`: why that place answers the
visitor's question. The note isn't shown in the chat; it sits beside the stop
while it's spotlit, because the stop is what the visitor is looking at. This is
the one piece of model-written text shown on the page itself, so it's marked as
the Concierge's, set as plain text, cut to about 140 characters, and the prompt
holds it to claims the stop's content supports. Shared Focus links carry ids
only, so a shared Focus has no notes.

The model call runs in a Worker script on the same domain, in front of the
static assets (the "API route later" that ADR 0003 left room for). The Worker
sends requests through Cloudflare AI Gateway, which provides the spend budget,
logging and the switch between providers. Every page stays statically built.
The site already navigates with Astro's `ClientRouter`; the Concierge panel is
persisted across those navigations, so the conversation stays on screen while
the page changes beside it.

Both ends use the AI SDK: `streamText` in the Worker, with an OpenAI-compatible
provider pointed at AI Gateway's `/compat` endpoint, and `useChat` in the panel.
Models are paid through AI Gateway's Unified Billing, so the Worker holds only a
gateway token, not a provider key. We don't use `ai-gateway-provider` with a
native provider route: those routes don't get billing credentials for every
model (see #34). The panel is
therefore a React island, the site's only one. The `[[id]]` protocol is ours;
the AI SDK only carries the stream.

## Considered options

- **Tool calls or JSON-schema actions** (`focus`, `navigate`, `clear`, …). These
  are cleaner to validate, but actions only arrive once the model has finished
  them, so text and page can't move together. Structured-output passthrough on
  AI Gateway's OpenAI-compatible endpoint is unverified, and not every
  candidate model supports it. With plain text, any OpenAI-compatible model
  works.
- **Full page loads with the conversation restored from `sessionStorage`.**
  Simpler, but the panel flickers on every navigation, which breaks "the chat
  stays still, the website changes".

## Consequences

The site is no longer purely static: it now depends on a Worker script and a
model provider. If either fails, the Concierge goes away but the canonical site
keeps working. Any page script the Concierge adds must survive client-side
navigation. Answers depend on the model sticking to the `[[id]]` format; a
malformed reference loses one stop but never breaks the page. A note is
generated text next to Jorge's own content: an ungrounded note would read as if
the site said it. The "Concierge" mark, the length cap and the grounding rule
contain that risk; they don't remove it.
