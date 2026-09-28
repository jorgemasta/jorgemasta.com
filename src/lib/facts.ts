/**
 * A Fact is a passage already visible in its owner's body, marked with a name
 * unique within that owner. Its id is namespaced by the owner: `padelful/mcp`.
 */
export type Fact = { name: string; text: string };

/**
 * Marks a Fact in a markdown body: `<span data-fact="mcp">…</span>`. Plain
 * inline HTML, so the passage renders like the text around it; the
 * `fact-anchors` markdown plugin swaps the attribute for the Fact's anchor.
 * Facts can't nest.
 */
const MARKDOWN_FACT = /<span data-fact="([^"]*)">([\s\S]*?)<\/span>/g;

/** The opening tag of a markdown Fact, as the markdown parser hands it over. */
export const MARKDOWN_FACT_OPENING = /^<span data-fact="([^"]*)">$/;

/**
 * The Facts annotated in a markdown body, in order. Throws on `data-fact`
 * markup it can't read, so a typo fails the build instead of silently
 * leaving a Fact out. `owner` only names the body in the error.
 */
export function factsInMarkdown(owner: string, body: string): Fact[] {
  const facts = [...body.matchAll(MARKDOWN_FACT)].map(([, name, text]) => ({ name, text: text.trim() }));
  if (facts.length !== body.split("data-fact").length - 1) {
    throw new Error(
      `${owner} has data-fact markup that doesn't parse. ` +
        'Mark a Fact exactly as <span data-fact="name">passage</span>, without nesting.'
    );
  }
  return facts;
}

/** A markdown body as a reader sees it: Fact annotations removed, passages kept. */
export const withoutFactMarkup = (body: string) => body.replace(MARKDOWN_FACT, "$2");

/**
 * Text written in code or data rather than markdown (Roles, About), with some
 * passages marked as Facts: the equivalent of `<span data-fact>` for them.
 * Rendered by `Prose.astro`.
 */
export type Prose = string | (string | { fact: string; text: string })[];

/** Prose as a list of plain strings and Facts. */
export const segments = (prose: Prose) => (typeof prose === "string" ? [prose] : prose);

/** Prose as a reader sees it. */
export const proseText = (prose: Prose) =>
  segments(prose)
    .map((segment) => (typeof segment === "string" ? segment : segment.text))
    .join("");

/** The Facts marked in some prose, in order. */
export const factsInProse = (prose: Prose): Fact[] =>
  segments(prose).flatMap((segment) =>
    typeof segment === "string" ? [] : [{ name: segment.fact, text: segment.text }]
  );
