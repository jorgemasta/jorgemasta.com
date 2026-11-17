import { describe, expect, it } from "vitest";
import { edition78 } from "./edition";
import { findAt, formatTime, outline, splitAtWord } from "./beat-timeline";

// Frame ranges of edition 78 (see timeline.test.ts): cold open b0–b4 (0–754),
// intro 754–859, b5 "Muse Spaces" 859–1050 with the voice resuming at 873, …,
// last beat b31 5000–5122.
describe("findAt: the beat and word playing at a frame", () => {
  it("finds the first beat and its first word at frame 0", () => {
    const { beat, word } = findAt(edition78, 0);
    expect(beat?.id).toBe("b0");
    expect(word?.text).toBe("Describe");
  });

  it("finds nothing during the intro sting", () => {
    expect(findAt(edition78, 800)).toEqual({ beat: null, word: null });
  });

  it("finds the beat but no word in the silence after the intro", () => {
    const { beat, word } = findAt(edition78, 860);
    expect(beat?.id).toBe("b5");
    expect(word).toBeNull();
  });

  it("switches beat exactly on the cut frame", () => {
    expect(findAt(edition78, 1049).beat?.id).toBe("b5");
    expect(findAt(edition78, 1050).beat?.id).toBe("b6");
  });

  it("finds nothing past the end", () => {
    expect(findAt(edition78, 5121).beat?.id).toBe("b31");
    expect(findAt(edition78, 5122).beat).toBeNull();
  });
});

describe("outline: the beats grouped into the sections the timeline lists", () => {
  const sections = outline(edition78);

  it("opens with the cold open, then one section per chapter, each starting where it plays", () => {
    expect(sections.map((s) => [s.title, s.chapterIndex, s.from])).toEqual([
      ["Cold open", null, 0],
      ["Muse Spaces", 0, 859],
      ["Cult.fit + Codex", 1, 2081],
      ["BioBasicsBench", 2, 3047],
      ["Axiom · Lean", 3, 3769],
      ["Perplexity Max", 4, 4449],
    ]);
  });

  it("lists every beat once, in order, under its section", () => {
    expect(sections.map((s) => s.beats.map((b) => b.index))).toEqual([
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22],
      [23, 24, 25, 26],
      [27, 28, 29, 30, 31],
    ]);
  });
});

describe("splitAtWord: a beat's text around the word being spoken", () => {
  const b0 = edition78.beats[0];

  it("cuts the text around the spoken word, keeping its punctuation and spacing", () => {
    expect(splitAtWord(b0, b0.words[2])).toEqual({
      before: "Describe a ",
      word: "shopping",
      after: " hub, a wedding planner, or a school dashboard — and Muse builds the mini-app for you.",
    });
  });

  it("leaves the whole text unhighlighted between words", () => {
    expect(splitAtWord(b0, null)).toEqual({ before: b0.say, word: "", after: "" });
  });
});

describe("formatTime: a frame as the m:ss the player shows", () => {
  it("rounds down to the second", () => {
    expect(formatTime(0, 30)).toBe("0:00");
    expect(formatTime(859, 30)).toBe("0:28");
    expect(formatTime(5121, 30)).toBe("2:50");
  });
});
