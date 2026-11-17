import { describe, expect, it } from "vitest";
import { edition78 } from "./edition";
import { findAt, formatTime, imageAt, nextStoryChange, outline, splitAtWord, storyChangeToTry, tweakableBeatAt } from "./beat-timeline";

// Frame ranges of edition 78 (see timeline.test.ts): cold open b0–b4 (0–754),
// intro 754–859, b5 "Muse Spaces" 859–1050 with the voice resuming at 873, …,
// last beat b31 5000–5120 (edition.test.ts).
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
    expect(findAt(edition78, 5119).beat?.id).toBe("b31");
    expect(findAt(edition78, 5120).beat).toBeNull();
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

// Story changes in edition 78: into b5 at 859 (after the intro), b12 at 2081, b19 at 3047, b23 at 3769, b27 at 4449.
describe("nextStoryChange: the story change \"Try it\" plays from the playhead", () => {
  it("is the first story change from the start", () => {
    expect(nextStoryChange(edition78, 0)?.at).toBe(859);
  });

  it("is the one still ahead of the playhead", () => {
    expect(nextStoryChange(edition78, 860)?.at).toBe(2081);
    expect(nextStoryChange(edition78, 3000)?.at).toBe(3047);
  });

  it("includes a story change exactly on the playhead", () => {
    expect(nextStoryChange(edition78, 2081)?.at).toBe(2081);
  });

  it("wraps around to the first one past the last", () => {
    expect(nextStoryChange(edition78, 4500)?.at).toBe(859);
  });
});

describe("tweakableBeatAt: the beat the phone's Tweak button opens", () => {
  it("is the beat on screen when its visual is a photo", () => {
    expect(tweakableBeatAt(edition78, 0)?.id).toBe("b0"); // image
    expect(tweakableBeatAt(edition78, 1500)?.id).toBe("b8"); // sequence of photos
  });

  it("is nothing on a beat no look grades", () => {
    expect(tweakableBeatAt(edition78, 200)).toBeNull(); // b1, a title card
    expect(tweakableBeatAt(edition78, 4400)).toBeNull(); // b26, a logo
  });

  it("is nothing during the intro sting", () => {
    expect(tweakableBeatAt(edition78, 800)).toBeNull();
  });
});

describe("imageAt: the photo the look thumbnails show", () => {
  it("is the photo of the beat on screen", () => {
    expect(imageAt(edition78, 0)).toBe("real:muse-spaces-og.png"); // b0
    expect(imageAt(edition78, 500)).toBe("real:muse-voice-og.jpg"); // b3
    expect(imageAt(edition78, 2100)).toBe("real:cultfit-og.png"); // b12, a story card
  });

  it("is the first photo of a sequence", () => {
    expect(imageAt(edition78, 3300)).toBe("real:biobasics-story.png"); // b20
  });

  it("is the last photo shown before a beat with none", () => {
    expect(imageAt(edition78, 200)).toBe("real:muse-spaces-og.png"); // b1, a title card
    expect(imageAt(edition78, 800)).toBe("real:muse-voice-og.jpg"); // the intro, after b3
    expect(imageAt(edition78, 4900)).toBe("real:perplexity-teammate.png"); // b30, versus
  });
});

describe("storyChangeToTry: where \"Try it\" seeks and which story change it plays", () => {
  it("plays the next story change from a second before it", () => {
    expect(storyChangeToTry(edition78, 1500)).toEqual({ cut: expect.objectContaining({ at: 2081 }), from: 2051 });
  });

  it("replays a story change that played in the last two seconds, so trying it again repeats it", () => {
    expect(storyChangeToTry(edition78, 2081 + 45)?.cut.at).toBe(2081);
    expect(storyChangeToTry(edition78, 2081 + 61)?.cut.at).toBe(3047);
  });
});
