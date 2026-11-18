import { describe, expect, it } from "vitest";
import { applyPreset, effectiveEdition, NO_EDITS, setIntensity } from "./edit-model";
import { clearTweak, clearTweakParam, setTweak, tweakedBeats } from "./tweaks";

const edition = {
  beats: [
    { id: "b0", visualKind: "image" },
    { id: "b1", visualKind: "title" },
    { id: "b2", visualKind: "gif" },
  ],
} as const;

const punch = { saturation: 1.35, contrast: 1.2, brightness: 1, warmth: 0, hue: 0 };

describe("per-beat tweaks", () => {
  it("a tweak changes only its own beat", () => {
    const edits = setTweak(applyPreset(NO_EDITS, "punch"), "b0", { brightness: 1.2 });
    expect(effectiveEdition(edition, edits).looks).toEqual({
      b0: { ...punch, brightness: 1.2 },
      b2: punch,
    });
  });

  it("keeps the tweaked parameters when the preset changes; the rest follow the new preset", () => {
    const tweaked = setTweak(applyPreset(NO_EDITS, "punch"), "b0", { brightness: 1.2 });
    const edits = applyPreset(tweaked, "newsprint");
    const newsprint = { saturation: 0, contrast: 1.25, brightness: 1.05, warmth: 0.15, hue: 0 };
    expect(effectiveEdition(edition, edits).looks).toEqual({
      b0: { ...newsprint, brightness: 1.2 },
      b2: newsprint,
    });
  });

  it("keeps the tweaked parameters when the intensity changes; the rest scale with it", () => {
    const tweaked = setTweak(applyPreset(NO_EDITS, "newsprint"), "b0", { saturation: 0.8 });
    const edits = setIntensity(tweaked, 0.5);
    const halfNewsprint = { saturation: 0.5, contrast: 1.125, brightness: 1.025, warmth: 0.075, hue: 0 };
    expect(effectiveEdition(edition, edits).looks).toEqual({
      b0: { ...halfNewsprint, saturation: 0.8 },
      b2: halfNewsprint,
    });
  });

  it("keeps a tweak with no preset, or at zero intensity, over the original look", () => {
    const original = { saturation: 1, contrast: 1, brightness: 1, warmth: 0, hue: 0 };
    const noPreset = setTweak(NO_EDITS, "b2", { warmth: 0.4 });
    expect(effectiveEdition(edition, noPreset).looks).toEqual({ b2: { ...original, warmth: 0.4 } });
    const zero = setIntensity(setTweak(applyPreset(NO_EDITS, "punch"), "b2", { warmth: 0.4 }), 0);
    expect(effectiveEdition(edition, zero).looks).toEqual({ b2: { ...original, warmth: 0.4 } });
  });

  it("returns the beat to the current preset when its tweak is removed", () => {
    const tweaked = setTweak(applyPreset(NO_EDITS, "punch"), "b0", { brightness: 1.2, hue: 20 });
    const edits = clearTweak(applyPreset(tweaked, "newsprint"), "b0");
    const newsprint = { saturation: 0, contrast: 1.25, brightness: 1.05, warmth: 0.15, hue: 0 };
    expect(effectiveEdition(edition, edits).looks).toEqual({ b0: newsprint, b2: newsprint });
    expect(tweakedBeats(edits)).toEqual([]);
  });

  it("hands one parameter back to the preset, and drops the tweak when none is left", () => {
    const tweaked = setTweak(applyPreset(NO_EDITS, "punch"), "b0", { brightness: 1.2, hue: 20 });
    const one = clearTweakParam(tweaked, "b0", "hue");
    expect(effectiveEdition(edition, one).looks.b0).toEqual({ ...punch, brightness: 1.2 });
    expect(tweakedBeats(one)).toEqual(["b0"]);
    const none = clearTweakParam(one, "b0", "brightness");
    expect(effectiveEdition(edition, none).looks.b0).toEqual(punch);
    expect(tweakedBeats(none)).toEqual([]);
  });
});
