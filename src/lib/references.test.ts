import { describe, expect, it } from "vitest";
import { parseAnswer } from "./references";

const known = new Set(["padelful", "destilados", "padelful/mcp"]);
const parse = (text: string) => parseAnswer(text, (id) => known.has(id));

/** The answer as the visitor reads it, with each chip shown as `{id}`. */
const shown = (text: string) =>
  parse(text)
    .parts.map((part) => (part.type === "text" ? part.text : `{${part.id}}`))
    .join("");

describe("parseAnswer", () => {
  it("leaves an answer without references as text", () => {
    expect(parse("Jorge builds products.")).toEqual({
      parts: [{ type: "text", text: "Jorge builds products." }],
      references: [],
      notes: {},
    });
  });

  it("turns each reference into a chip where it appears", () => {
    expect(parse("He builds Padelful [[padelful]] and Destilados [[destilados]].")).toEqual({
      parts: [
        { type: "text", text: "He builds Padelful " },
        { type: "reference", id: "padelful" },
        { type: "text", text: " and Destilados " },
        { type: "reference", id: "destilados" },
        { type: "text", text: "." },
      ],
      references: ["padelful", "destilados"],
      notes: {},
    });
  });

  it("lists references in order of first appearance, once each", () => {
    expect(parse("[[destilados]] [[padelful/mcp]] [[destilados]] [[padelful]]").references).toEqual([
      "destilados",
      "padelful/mcp",
      "padelful",
    ]);
  });

  it("drops references to ids the site doesn't have, and the space before them", () => {
    const answer = parse("See Padelful [[padelful]], his blog [[made-up]] and more [[padelful-mcp]].");

    expect(answer.references).toEqual(["padelful"]);
    expect(shown("See Padelful [[padelful]], his blog [[made-up]] and more [[padelful-mcp]].")).toBe(
      "See Padelful {padelful}, his blog and more."
    );
  });

  it("tolerates spaces inside the brackets", () => {
    expect(parse("Padelful [[ padelful ]].").references).toEqual(["padelful"]);
  });

  it("never shows a reference that is still streaming", () => {
    for (const partial of ["Padelful [", "Padelful [[", "Padelful [[pad", "Padelful [[padelful", "Padelful [[padelful]"]) {
      expect(shown(partial)).toBe("Padelful ");
      expect(parse(partial).references).toEqual([]);
    }
  });

  it("resolves a reference split across streamed chunks once it completes", () => {
    const chunks = ["He builds Pad", "elful [[pad", "elf", "ul]] and more", "."];
    const updates = chunks.map((_, i) => shown(chunks.slice(0, i + 1).join("")));

    expect(updates).toEqual([
      "He builds Pad",
      "He builds Padelful ",
      "He builds Padelful ",
      "He builds Padelful {padelful} and more",
      "He builds Padelful {padelful} and more.",
    ]);
  });

  it("keeps a reference's note for its stop, out of the text the visitor reads", () => {
    const answer = parse("He builds Padelful [[padelful|What he is building now]] and more.");

    expect(answer.references).toEqual(["padelful"]);
    expect(answer.notes).toEqual({ padelful: "What he is building now" });
    expect(shown("He builds Padelful [[padelful|What he is building now]] and more.")).toBe(
      "He builds Padelful {padelful} and more."
    );
  });

  it("keeps the first note an id gets, and tolerates spaces around the bar", () => {
    const answer = parse("[[padelful]] [[ padelful | Built with MCP ]] [[padelful|Later note]] [[destilados|  ]]");

    expect(answer.references).toEqual(["padelful", "destilados"]);
    expect(answer.notes).toEqual({ padelful: "Built with MCP" });
  });

  it("drops the note of an id the site doesn't have", () => {
    expect(parse("See [[made-up|Invented claim]].").notes).toEqual({});
  });

  it("cuts a note too long to sit beside a stop", () => {
    const long = "word ".repeat(60).trim();
    const note = parse(`[[padelful|${long}]]`).notes.padelful;

    expect(note.length).toBeLessThanOrEqual(141);
    expect(note.endsWith("…")).toBe(true);
  });

  it("never shows a reference whose note is still streaming", () => {
    for (const partial of ["Padelful [[padelful|", "Padelful [[padelful|What he", "Padelful [[padelful|What he is]"]) {
      expect(shown(partial)).toBe("Padelful ");
      expect(parse(partial).notes).toEqual({});
    }
  });

  it("keeps a single bracket that isn't at the end", () => {
    expect(shown("Stats [1] and [a]")).toBe("Stats [1] and [a]");
  });
});
