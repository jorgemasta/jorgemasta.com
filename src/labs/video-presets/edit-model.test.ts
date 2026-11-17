import { describe, expect, it } from "vitest";
import { applyPreset, effectiveEdition, hasEdits, lookToCssFilter, NO_EDITS, reset, setCutTransition, setDefaultTransition, setIntensity } from "./edit-model";
import type { Transition } from "./transitions";

// A small edition: one beat of each relevant kind.
const edition = {
  beats: [
    { id: "b0", visualKind: "image" },
    { id: "b1", visualKind: "title" },
    { id: "b2", visualKind: "gif" },
    { id: "b3", visualKind: "story" },
    { id: "b4", visualKind: "chart" },
  ],
} as const;

describe("effectiveEdition", () => {
  it("returns the generated original when there are no edits", () => {
    expect(effectiveEdition(edition, NO_EDITS)).toMatchObject({ looks: {}, transitions: {} });
  });

  it("grades every image and clip beat with a preset at full intensity, and nothing else", () => {
    const edits = applyPreset(NO_EDITS, "newsprint");
    const newsprint = { saturation: 0, contrast: 1.25, brightness: 1.05, warmth: 0.15, hue: 0 };
    expect(effectiveEdition(edition, edits).looks).toEqual({ b0: newsprint, b2: newsprint, b3: newsprint });
  });

  it("scales the preset between the original and full with its intensity", () => {
    const edits = setIntensity(applyPreset(NO_EDITS, "newsprint"), 0.5);
    const halfNewsprint = { saturation: 0.5, contrast: 1.125, brightness: 1.025, warmth: 0.075, hue: 0 };
    expect(effectiveEdition(edition, edits).looks).toEqual({ b0: halfNewsprint, b2: halfNewsprint, b3: halfNewsprint });
  });

  it("renders the original at zero intensity", () => {
    const edits = setIntensity(applyPreset(NO_EDITS, "newsprint"), 0);
    expect(effectiveEdition(edition, edits).looks).toEqual({});
  });

  it("returns to the generated original on reset: no look, tweak, transition, theme, story card or motion", () => {
    const after = reset();
    expect(after).toEqual({
      preset: null,
      custom: null,
      intensity: 1,
      tweaks: {},
      defaultTransition: null,
      cutTransitions: {},
      theme: null,
      storyCard: null,
      motion: null,
      beatMotions: {},
    });
    expect(effectiveEdition(edition, after)).toEqual(effectiveEdition(edition, NO_EDITS));
    // and a preset applied after a reset starts again from full intensity
    expect(effectiveEdition(edition, applyPreset(after, "newsprint")).looks.b0).toMatchObject({ saturation: 0 });
  });
});

describe("lookToCssFilter", () => {
  it("writes a look as the CSS filter the player applies", () => {
    expect(lookToCssFilter({ saturation: 0.5, contrast: 1.125, brightness: 1.025, warmth: 0.075, hue: -8 })).toBe(
      "saturate(0.5) sepia(0.075) hue-rotate(-8deg) contrast(1.125) brightness(1.025)",
    );
  });
});

describe("transitions", () => {
  // Four beats over two stories: b0–b1 in the cold open, b2 starts a story, b3 starts the next.
  const edition = {
    beats: [
      { id: "b0", visualKind: "image", to: 100 },
      { id: "b1", visualKind: "title", to: 200 },
      { id: "b2", visualKind: "story", to: 300 },
      { id: "b3", visualKind: "story", to: 310 },
    ],
    cuts: [
      { id: "b0-b1", at: 100, toBeat: "b1", storyChange: false },
      { id: "b1-b2", at: 200, toBeat: "b2", storyChange: true },
      { id: "b2-b3", at: 300, toBeat: "b3", storyChange: true },
    ],
  } as const;
  const slide: Transition = { kind: "slide", durationFrames: 8, easing: "ease-in-out", direction: "right" };

  it("plays the default transition on every story change, starting on the cut, and leaves other cuts as generated", () => {
    const edits = setDefaultTransition(NO_EDITS, slide);
    expect(effectiveEdition(edition, edits).transitions).toEqual({
      "b1-b2": { ...slide, at: 200, source: "default" },
      "b2-b3": { ...slide, at: 300, source: "default" },
    });
  });

  const whip: Transition = { kind: "whip", durationFrames: 6, easing: "ease-out", direction: "left" };

  it("lets one cut override the default, on that cut only", () => {
    const edits = setCutTransition(setDefaultTransition(NO_EDITS, slide), "b2-b3", whip);
    expect(effectiveEdition(edition, edits).transitions).toEqual({
      "b1-b2": { ...slide, at: 200, source: "default" },
      "b2-b3": { ...whip, at: 300, source: "override" },
    });
  });

  it("lets a cut between two beats of a story carry an override with no default set", () => {
    const edits = setCutTransition(NO_EDITS, "b0-b1", whip);
    expect(effectiveEdition(edition, edits).transitions).toEqual({ "b0-b1": { ...whip, at: 100, source: "override" } });
  });

  it("returns a cut to the default when its override is removed", () => {
    const edits = setCutTransition(setCutTransition(setDefaultTransition(NO_EDITS, slide), "b2-b3", whip), "b2-b3", null);
    expect(effectiveEdition(edition, edits).transitions["b2-b3"]).toEqual({ ...slide, at: 300, source: "default" });
  });

  it("keeps every beat on the voice: a transition starts on its cut and ends within the incoming beat", () => {
    // b3 runs 300–310: a 30-frame slide into it is cut to its 10 frames rather than delaying anything.
    const long = { ...slide, durationFrames: 30 };
    const edits = setDefaultTransition(NO_EDITS, long);
    expect(effectiveEdition(edition, edits).transitions).toEqual({
      "b1-b2": { ...long, at: 200, source: "default" },
      "b2-b3": { ...long, durationFrames: 10, at: 300, source: "default" },
    });
  });
});

describe("hasEdits: whether there is anything for Reset to undo", () => {
  const whip: Transition = { kind: "whip", durationFrames: 8, easing: "ease-out", direction: "right" };

  it("is false for the generated original, and after undoing every edit by hand", () => {
    expect(hasEdits(NO_EDITS)).toBe(false);
    expect(hasEdits(setCutTransition(setCutTransition(NO_EDITS, "b0-b1", whip), "b0-b1", null))).toBe(false);
    expect(hasEdits(applyPreset(applyPreset(NO_EDITS, "punch"), null))).toBe(false);
  });

  it("is true once a look, a tweak or a transition is set", () => {
    expect(hasEdits(applyPreset(NO_EDITS, "punch"))).toBe(true);
    expect(hasEdits({ ...NO_EDITS, tweaks: { b0: { hue: 10 } } })).toBe(true);
    expect(hasEdits(setDefaultTransition(NO_EDITS, whip))).toBe(true);
    expect(hasEdits(setCutTransition(NO_EDITS, "b2-b3", whip))).toBe(true);
  });
});
