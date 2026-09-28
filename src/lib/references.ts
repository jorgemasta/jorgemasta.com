/**
 * The Concierge's answers are plain text with inline `[[id]]` references to
 * registry targets, each with an optional note, `[[id|note]]` (ADR 0004). The client parses the whole text so far on
 * every streamed update, so a reference split across chunks resolves as soon
 * as it's complete.
 */
import type { UIMessage } from "ai";

/** A chat message's text, with any non-text parts left out. */
export const messageText = (message: UIMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");

export type AnswerPart = { type: "text"; text: string } | { type: "reference"; id: string };

export type Answer = {
  /** What the visitor sees: text, with a chip wherever a known reference was. */
  parts: AnswerPart[];
  /** The known ids referenced, in order of first appearance: the answer's stops. */
  references: string[];
  /** Why each stop answers the question, by id: the first note its references carry. */
  notes: Record<string, string>;
};

/** A complete reference, with the whitespace before it, its id and its note. */
const REFERENCE = /(\s*)\[\[\s*([^[\]|]+?)\s*(?:\|([^[\]]*))?\]\]/g;

/** Short enough to sit beside a stop without covering the page. */
const NOTE_LENGTH = 140;

/** A note as shown: one line of whitespace, cut at a word with an ellipsis if too long. */
function note(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= NOTE_LENGTH) return clean;
  const cut = clean.slice(0, NOTE_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:]+$/, "")}…`;
}

/** The start of a reference still streaming in: `[`, `[[pad` or `[[padelful]`. */
const UNFINISHED_REFERENCE = /\[(\[[^[\]]*\]?)?$/;

/**
 * An answer's text as parts and references. References to ids the site
 * doesn't have are dropped, which is what keeps the Concierge grounded.
 */
export function parseAnswer(text: string, isKnown: (id: string) => boolean): Answer {
  const parts: AnswerPart[] = [];
  const references: string[] = [];
  const notes: Record<string, string> = {};
  const addText = (text: string) => {
    if (!text) return;
    const last = parts.at(-1);
    if (last?.type === "text") last.text += text;
    else parts.push({ type: "text", text });
  };

  const visible = text.replace(UNFINISHED_REFERENCE, "");
  let from = 0;
  for (const match of visible.matchAll(REFERENCE)) {
    const [whole, space, id, text = ""] = match;
    addText(visible.slice(from, match.index));
    from = match.index + whole.length;
    if (!isKnown(id)) continue;
    addText(space);
    parts.push({ type: "reference", id });
    if (!references.includes(id)) references.push(id);
    if (!notes[id] && note(text)) notes[id] = note(text);
  }
  addText(visible.slice(from));

  return { parts, references, notes };
}
