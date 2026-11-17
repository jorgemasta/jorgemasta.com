import { describe, expect, it } from "vitest";
import { applyPreset, effectiveEdition, lookToCssFilter, NO_EDITS, reset, setIntensity } from "./edit-model";

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
    expect(effectiveEdition(edition, NO_EDITS)).toEqual({ looks: {} });
  });

  it("grades every image and clip beat with a preset at full intensity, and nothing else", () => {
    const edits = applyPreset(NO_EDITS, "newsprint");
    const newsprint = { saturation: 0, contrast: 1.25, brightness: 1.05, warmth: 0.15, hue: 0 };
    expect(effectiveEdition(edition, edits)).toEqual({
      looks: { b0: newsprint, b2: newsprint, b3: newsprint },
    });
  });

  it("scales the preset between the original and full with its intensity", () => {
    const edits = setIntensity(applyPreset(NO_EDITS, "newsprint"), 0.5);
    const halfNewsprint = { saturation: 0.5, contrast: 1.125, brightness: 1.025, warmth: 0.075, hue: 0 };
    expect(effectiveEdition(edition, edits)).toEqual({
      looks: { b0: halfNewsprint, b2: halfNewsprint, b3: halfNewsprint },
    });
  });

  it("renders the original at zero intensity", () => {
    const edits = setIntensity(applyPreset(NO_EDITS, "newsprint"), 0);
    expect(effectiveEdition(edition, edits)).toEqual({ looks: {} });
  });

  it("returns to the generated original on reset", () => {
    const edited = setIntensity(applyPreset(NO_EDITS, "newsprint"), 0.4);
    const after = reset(edited);
    expect(effectiveEdition(edition, after)).toEqual({ looks: {} });
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
