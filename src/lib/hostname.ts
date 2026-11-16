// Server-only: node:url is not available in the browser bundle, so this
// stays out of utils.ts, which client code (focus.ts, references.ts) imports.
import { domainToUnicode } from "node:url";

/** The hostname as people type it: no www, and an IDN in its own script rather than punycode. */
export function hostname(url: string) {
  return domainToUnicode(new URL(url).hostname).replace(/^www\./, "");
}

/**
 * Splits off the last character so it can share a no-wrap span with the arrow:
 * `overflow-wrap: anywhere` would otherwise break before the no-break space and
 * leave the arrow alone on its own line.
 */
export function withTail(text: string) {
  const chars = Array.from(text);
  return { head: chars.slice(0, -1).join(""), tail: chars.at(-1) ?? "" };
}
