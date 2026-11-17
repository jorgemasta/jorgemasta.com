import { describe, expect, it } from "vitest";
import { setTweak } from "./tweaks";
import { applyPreset, effectiveEdition, hasEdits, reset, NO_EDITS, setCustomLook, setIntensity, setBeatMotion, setMotion, setStoryCard, setTheme } from "./edit-model";

// An amber-paper edition: two photo beats with their scripted motions, a title, and a GIF.
const edition = {
  theme: "amber-paper",
  beats: [
    { id: "b0", visualKind: "image", visual: { type: "image", motion: "punch" } },
    { id: "b1", visualKind: "title", visual: { type: "title" } },
    { id: "b2", visualKind: "image", visual: { type: "image" } }, // no motion in the script: the renderer zooms
    { id: "b3", visualKind: "gif", visual: { type: "gif" } },
  ],
} as const;

describe("the whole-video options with no edits", () => {
  it("plays the edition's own theme, its story card and every photo's scripted motion", () => {
    const out = effectiveEdition(edition, NO_EDITS);
    expect(out.theme).toEqual({ name: "amber-paper", accent2: "#ffb547", texture: "paper", source: "edition" });
    expect(out.storyCard).toEqual({ style: "band", source: "theme" });
    expect(out.motions).toEqual({
      b0: { motion: "punch", source: "script" },
      b2: { motion: "zoom", source: "script" },
    });
  });
});

describe("theme", () => {
  it("a theme change sets the accent, the texture and the story card the theme brings", () => {
    const out = effectiveEdition(edition, setTheme(NO_EDITS, "cyan-grid"));
    expect(out.theme).toEqual({ name: "cyan-grid", accent2: "#4fd1ff", texture: "grid", source: "visitor" });
    expect(out.storyCard).toEqual({ style: "wipe", source: "theme" });
  });

  it("choosing the edition's own theme again, or none, is the original", () => {
    expect(effectiveEdition(edition, setTheme(setTheme(NO_EDITS, "pink-scan"), null)).theme.source).toBe("edition");
    expect(effectiveEdition(edition, setTheme(NO_EDITS, "amber-paper")).theme).toEqual({
      name: "amber-paper",
      accent2: "#ffb547",
      texture: "paper",
      source: "edition",
    });
  });
});

describe("story card style", () => {
  it("an explicit style overrides the theme's, whichever theme is on", () => {
    const zoomCard = setStoryCard(NO_EDITS, "zoom");
    expect(effectiveEdition(edition, zoomCard).storyCard).toEqual({ style: "zoom", source: "visitor" });
    expect(effectiveEdition(edition, setTheme(zoomCard, "cyan-grid")).storyCard).toEqual({ style: "zoom", source: "visitor" });
  });

  it("follows the theme again once the explicit style is removed", () => {
    const edits = setStoryCard(setStoryCard(setTheme(NO_EDITS, "violet-grain"), "band"), null);
    expect(effectiveEdition(edition, edits).storyCard).toEqual({ style: "glitch", source: "theme" });
  });
});

describe("image motion", () => {
  it("a default motion moves every photo; a per-beat override wins on its beat", () => {
    const edits = setBeatMotion(setMotion(NO_EDITS, "still"), "b2", "pan");
    expect(effectiveEdition(edition, edits).motions).toEqual({
      b0: { motion: "still", source: "default" },
      b2: { motion: "pan", source: "override" },
    });
  });

  it("an override works with no default, and removing it returns the beat to its scripted motion", () => {
    const shaken = setBeatMotion(NO_EDITS, "b0", "shake");
    expect(effectiveEdition(edition, shaken).motions).toEqual({
      b0: { motion: "shake", source: "override" },
      b2: { motion: "zoom", source: "script" },
    });
    expect(effectiveEdition(edition, setBeatMotion(shaken, "b0", null)).motions.b0).toEqual({ motion: "punch", source: "script" });
  });

  it("removing the default returns every photo without an override to its script", () => {
    const edits = setMotion(setBeatMotion(setMotion(NO_EDITS, "pan"), "b0", "still"), null);
    expect(effectiveEdition(edition, edits).motions).toEqual({
      b0: { motion: "still", source: "override" },
      b2: { motion: "zoom", source: "script" },
    });
  });
});

describe("Custom look", () => {
  const custom = { saturation: 0.6, contrast: 1.3, brightness: 0.9, warmth: 0.2, hue: 10 };

  it("grades every image and clip beat with the visitor's five values", () => {
    const edits = applyPreset(setCustomLook(NO_EDITS, custom), "custom");
    expect(effectiveEdition(edition, edits).looks).toEqual({ b0: custom, b2: custom, b3: custom });
  });

  it("scales with intensity like any preset", () => {
    const edits = setIntensity(applyPreset(setCustomLook(NO_EDITS, custom), "custom"), 0.5);
    const half = { saturation: 0.8, contrast: 1.15, brightness: 0.95, warmth: 0.1, hue: 5 };
    expect(effectiveEdition(edition, edits).looks.b0).toEqual(half);
  });

  it("a tweaked beat keeps the parameters set on it; the rest follow Custom, and change with it", () => {
    const tweaked = setTweak(applyPreset(setCustomLook(NO_EDITS, custom), "custom"), "b2", { brightness: 1.4 });
    expect(effectiveEdition(edition, tweaked).looks.b2).toEqual({ ...custom, brightness: 1.4 });
    const moved = setCustomLook(tweaked, { contrast: 0.8, brightness: 1.1 });
    expect(effectiveEdition(edition, moved).looks).toEqual({
      b0: { ...custom, contrast: 0.8, brightness: 1.1 },
      b2: { ...custom, contrast: 0.8, brightness: 1.4 },
      b3: { ...custom, contrast: 0.8, brightness: 1.1 },
    });
  });

  it("starts from the preset applied when it is picked, so a preset can be adjusted into Custom", () => {
    const edits = applyPreset(applyPreset(NO_EDITS, "newsprint"), "custom");
    expect(effectiveEdition(edition, edits).looks.b0).toEqual({ saturation: 0, contrast: 1.25, brightness: 1.05, warmth: 0.15, hue: 0 });
  });

  it("keeps its values while another preset is applied, and plays them again when picked again", () => {
    const edits = applyPreset(applyPreset(applyPreset(setCustomLook(NO_EDITS, custom), "custom"), "punch"), "custom");
    expect(effectiveEdition(edition, edits).looks.b0).toEqual(custom);
  });
});

describe("reset", () => {
  it("clears the theme, the story card, the motions and the Custom look along with everything else", () => {
    const custom = { saturation: 0.6, contrast: 1.3, brightness: 0.9, warmth: 0.2, hue: 10 };
    const everything = setBeatMotion(
      setMotion(setStoryCard(setTheme(applyPreset(setCustomLook(NO_EDITS, custom), "custom"), "pink-scan"), "zoom"), "pan"),
      "b0",
      "still",
    );
    expect(hasEdits(everything)).toBe(true);
    const out = effectiveEdition(edition, reset());
    expect(out.looks).toEqual({});
    expect(out.theme.name).toBe("amber-paper");
    expect(out.storyCard).toEqual({ style: "band", source: "theme" });
    expect(out.motions).toEqual({ b0: { motion: "punch", source: "script" }, b2: { motion: "zoom", source: "script" } });
    // a Custom picked after a reset starts again from the original
    expect(effectiveEdition(edition, applyPreset(reset(), "custom")).looks).toEqual({});
  });

  it("has something to undo once any one of the new options is set", () => {
    expect(hasEdits(setTheme(NO_EDITS, "cyan-grid"))).toBe(true);
    expect(hasEdits(setStoryCard(NO_EDITS, "wipe"))).toBe(true);
    expect(hasEdits(setMotion(NO_EDITS, "still"))).toBe(true);
    expect(hasEdits(setBeatMotion(NO_EDITS, "b0", "pan"))).toBe(true);
    expect(hasEdits(setBeatMotion(setBeatMotion(NO_EDITS, "b0", "pan"), "b0", null))).toBe(false);
  });
});
