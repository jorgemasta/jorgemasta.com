import { describe, expect, it } from "vitest";
import { effectiveEdition, NO_EDITS, setCutTransition, setTheme } from "./edit-model";
import { chosenOn, pickOption, STORY_CHANGE_OPTIONS, storyChangeStatus } from "./story-changes";
import type { Transition } from "./transitions";

// An amber-paper edition (its card: Band), two story changes and a cut inside a story.
const edition = {
  theme: "amber-paper",
  beats: [
    { id: "b0", visualKind: "image", to: 100 },
    { id: "b1", visualKind: "title", to: 200 },
    { id: "b2", visualKind: "story", to: 300 },
    { id: "b3", visualKind: "story", to: 400 },
  ],
  cuts: [
    { id: "b0-b1", at: 100, toBeat: "b1", storyChange: false },
    { id: "b1-b2", at: 200, toBeat: "b2", storyChange: true },
    { id: "b2-b3", at: 300, toBeat: "b3", storyChange: true },
  ],
} as const;

const option = (name: string) => STORY_CHANGE_OPTIONS.find((o) => o.name === name)!;

describe("the story change options", () => {
  it("are four cards and four transitions, every name different", () => {
    expect(STORY_CHANGE_OPTIONS.filter((o) => o.kind === "card").map((o) => o.name)).toEqual(["Band", "Glitch", "Wipe", "Pop"]);
    expect(STORY_CHANGE_OPTIONS.filter((o) => o.kind === "transition").map((o) => o.name)).toEqual(["Cut", "Whip", "Slide", "Zoom"]);
  });
});

describe("picking for every story change", () => {
  it("starts on the theme's card", () => {
    expect(chosenOn(edition, NO_EDITS, null)).toEqual({ kind: "card", id: "band" });
  });

  it("only ever has one option chosen: card, then transition, then card again", () => {
    const glitch = pickOption(edition, NO_EDITS, null, option("Glitch"));
    expect(chosenOn(edition, glitch, null)).toEqual({ kind: "card", id: "glitch" });
    const slide = pickOption(edition, glitch, null, option("Slide"));
    expect(chosenOn(edition, slide, null)).toEqual({ kind: "transition", id: "slide" });
    expect(effectiveEdition(edition, slide).transitions["b1-b2"]).toMatchObject({ kind: "slide", durationFrames: 20 });
    const pop = pickOption(edition, slide, null, option("Pop"));
    expect(chosenOn(edition, pop, null)).toEqual({ kind: "card", id: "zoom" });
    expect(effectiveEdition(edition, pop).transitions).toEqual({});
  });

  it("picking the theme's card follows the theme, so a theme change brings its own card", () => {
    const edits = pickOption(edition, pickOption(edition, NO_EDITS, null, option("Wipe")), null, option("Band"));
    expect(edits.storyCard).toBeNull();
    expect(chosenOn(edition, setTheme(edits, "violet-grain"), null)).toEqual({ kind: "card", id: "glitch" });
  });

  it("re-picking the transition on keeps its adjusted settings; another starts from its preset", () => {
    const tuned: Transition = { kind: "slide", durationFrames: 9, easing: "linear", direction: "left" };
    const edits = { ...NO_EDITS, defaultTransition: tuned };
    expect(pickOption(edition, edits, null, option("Slide")).defaultTransition).toEqual(tuned);
    expect(pickOption(edition, edits, null, option("Whip")).defaultTransition).toMatchObject({ kind: "whip", durationFrames: 12 });
  });
});

describe("picking for one cut", () => {
  const whip: Transition = { kind: "whip", durationFrames: 12, easing: "ease-out", direction: "right" };

  it("chooses nothing while the cut follows the default, then the transition picked for it", () => {
    expect(chosenOn(edition, NO_EDITS, "b2-b3")).toBeNull();
    const edits = pickOption(edition, NO_EDITS, "b2-b3", option("Whip"));
    expect(chosenOn(edition, edits, "b2-b3")).toEqual({ kind: "transition", id: "whip" });
    expect(effectiveEdition(edition, edits).transitions).toEqual({ "b2-b3": { ...whip, at: 300, source: "override" } });
    expect(chosenOn(edition, edits, null)).toEqual({ kind: "card", id: "band" });
  });

  it("a transition picked for a cut starts from the default's settings when it is the same kind", () => {
    const tuned: Transition = { ...whip, durationFrames: 6 };
    const edits = pickOption(edition, { ...NO_EDITS, defaultTransition: tuned }, "b2-b3", option("Whip"));
    expect(edits.cutTransitions["b2-b3"]).toEqual(tuned);
  });

  it("can't take a card: it leaves the edits as they are", () => {
    expect(pickOption(edition, NO_EDITS, "b2-b3", option("Glitch"))).toBe(NO_EDITS);
  });
});

describe("the status line", () => {
  it("names the card on every story change", () => {
    expect(storyChangeStatus(edition, NO_EDITS, undefined, 30)).toBe("Story changes: the Band card.");
  });

  it("names the transition, and counts the cuts overridden", () => {
    const edits = setCutTransition(pickOption(edition, NO_EDITS, null, option("Slide")), "b0-b1", { kind: "cut", durationFrames: 0, easing: "linear", direction: "left" });
    expect(storyChangeStatus(edition, edits, undefined, 30)).toBe("Story changes: Slide, no card · 1 cut overridden.");
  });

  it("on a picked cut, says what plays there and whether it overrides the default", () => {
    const b2b3 = { id: "b2-b3", at: 300, toBeat: "b3", toBeatIndex: 3, storyChange: true } as const;
    expect(storyChangeStatus(edition, NO_EDITS, b2b3, 30)).toBe("Cut into beat 4 at 0:10 follows the default: the Band card.");
    const edits = pickOption(edition, NO_EDITS, "b2-b3", option("Whip"));
    expect(storyChangeStatus(edition, edits, b2b3, 30)).toBe("Cut into beat 4 at 0:10: Whip, no card (overrides the default).");
    const inside = { id: "b0-b1", at: 100, toBeat: "b1", toBeatIndex: 1, storyChange: false } as const;
    expect(storyChangeStatus(edition, NO_EDITS, inside, 30)).toBe("Cut into beat 2 at 0:03 follows the default: a plain cut.");
  });
});
