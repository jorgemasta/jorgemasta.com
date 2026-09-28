# jorgemasta.com

The personal site of Jorge Masta. It presents a product engineer who builds
AI-native products — for product companies first, other builders second.
Current positioning lives in `docs/positioning.md` and is expected to change.
All content lives in the repository as markdown; there is no CMS.

## Language

**Note**:
A short English write-up of something Jorge built, tested, or observed first-hand.
Sometimes it comes out of a Tokenizados episode, but that is one source among
others. The default kind of blog entry (`type: note`).
_Avoid_: post, article (for this kind), tweet

**Article**:
A long-form blog entry written for its own sake, not derived from an episode
(`type: article`).
_Avoid_: essay, long-form post

**Episode**:
A Tokenizados podcast episode. A Note may link to the one it came from via the
`episode` frontmatter field.
_Avoid_: show, recording

**Project**:
A thing Jorge built, shown as proof of work. Either something he is building
now or Earlier work. Distinct from a blog entry: a Project is the artefact, a
Note or Article is writing about one.
_Avoid_: portfolio item, case study, work

**Role**:
A position Jorge held at a company, as an employee or a co-founder. Distinct
from a Project: a Role is where he worked, a Project is what he built.
_Avoid_: job, selected work, position

**Earlier work**:
Projects from 2017–2019, framed as history rather than current focus.
_Avoid_: old projects, legacy

**Draft**:
An entry present in the repository but excluded from the built site
(`draft: true`). Replaces the publish toggle a CMS would provide.
_Avoid_: unpublished, hidden

**Archive**:
A published entry old enough to be marked as no longer current in the UI.
_Avoid_: stale, outdated

**Fact**:
A short, verifiable passage Jorge has approved, visible in the body of the
Project, blog entry, Role or About that backs it (e.g. "Padelful exposes a
public API and an MCP server"). That body is the Fact's owner, and the Fact's
id is namespaced by it (`padelful/mcp`). The smallest thing a Focus can point
at, and the only kind of claim the Concierge may make.
_Avoid_: claim, proof point, metric (a Project's stats are a different thing)

**Focus**:
An ordered set of places on the site that answer one visitor's question —
Projects, Roles, Facts, entries — which the visitor steps through one at a time
while the rest of the page is blurred slightly. Beside each stop, a short note
from the Concierge says why it answers the question. Nothing is reordered: a
Focus points at the canonical site rather than rearranging it. It stays active
across pages until the visitor clears it; the canonical site has no Focus.
_Avoid_: filter, mode, view, lens, adapted view

**Concierge**:
The AI layer that answers a visitor's question by putting the site into a
Focus, navigating between pages, and replying in a sentence or two. It speaks
about Jorge in the third person and never as him.
_Avoid_: chatbot, copilot, assistant, guide, Ask Jorge, AI clone
