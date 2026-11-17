import { describe, expect, it } from "vitest";
import published from "./destilados-snapshot/editions/078/timeline.en.json";
import { edition78 } from "./edition";
import { effectiveEdition, NO_EDITS } from "./edit-model";

// `timeline.en.json` is the timeline the pipeline actually rendered for the
// published video (from Antonio's edition-78 media), vendored as the reference.
describe("edition 78 as the Lab plays it", () => {
  it("lasts exactly as long as the published video", () => {
    expect(edition78.durationInFrames).toBe(5120);
    expect(edition78.report.durationInFrames).toBe(published.durationInFrames);
  });

  it("plays in the theme it was published in, with each photo's scripted motion", () => {
    expect(edition78.theme).toBe("amber-paper");
    expect(effectiveEdition(edition78, NO_EDITS).motions).toEqual({
      b0: { motion: "zoom", source: "script" },
      b3: { motion: "punch", source: "script" },
      b9: { motion: "zoom", source: "script" },
      b14: { motion: "punch", source: "script" },
      b25: { motion: "zoom", source: "script" },
    });
  });

  it("puts the intro and the voice split where the published render did", () => {
    expect(edition78.introAtFrame).toBe(published.introAtFrame);
    expect(edition78.voiceSplitSec).toBeCloseTo(published.voiceSplitSec, 6);
  });

  it("shows every beat on the published frames", () => {
    expect(edition78.beats.map((b) => [b.from, b.to])).toEqual(published.beats.map((b) => [b.from, b.to]));
  });

  it("renders each beat's visual as published (image sizes, OCR text boxes, GIF credits)", () => {
    expect(edition78.report.beats.map((b) => b.visual)).toEqual(published.beats.map((b) => b.visual));
    expect(edition78.report.beats.map((b) => b.sfx)).toEqual(published.beats.map((b) => b.sfx));
  });
});
