import { describe, expect, it } from "vitest";
import { edition78 } from "./edition";
import { applyPreset, NO_EDITS, setBeatMotion, setCutTransition, setIntensity, setMotion, setStoryChange, setTheme } from "./edit-model";
import { setTweak } from "./tweaks";
import { exportSummary, toEditionEdits, toPreset } from "./export";

describe("export", () => {
  it("an untouched editor exports an empty preset and edits with only the edition", () => {
    expect(toPreset(NO_EDITS)).toEqual({ schema: "jorgemasta.lab.video-presets/preset@1" });
    expect(toEditionEdits(NO_EDITS, edition78)).toEqual({
      schema: "jorgemasta.lab.video-presets/edits@1",
      edition: "078",
      preset: {},
      render: {},
    });
  });

  const slide = { kind: "slide", durationFrames: 20, easing: "ease-in-out", direction: "down" } as const;
  const presetOnly = setMotion(setStoryChange(setTheme(setIntensity(applyPreset(NO_EDITS, "golden-hour"), 0.6), "cyan-grid"), { transition: slide }), "pan");
  const goldenAt60 = "saturate(1.09) sepia(0.18) hue-rotate(-4.8deg) contrast(1.03) brightness(1.024)";

  it("a preset-only edit exports its rules, and the edits carry them with no per-beat fixes", () => {
    const rules = {
      look: { preset: "golden-hour", intensity: 0.6, filter: goldenAt60 },
      theme: "cyan-grid",
      storyChange: { transition: slide },
      motion: "pan",
    };
    expect(toPreset(presetOnly)).toEqual({ schema: "jorgemasta.lab.video-presets/preset@1", ...rules });
    const doc = toEditionEdits(presetOnly, edition78);
    expect(doc.preset).toEqual(rules);
    expect(doc.beats).toBeUndefined();
    expect(doc.cuts).toBeUndefined();
    expect(doc.render.filters?.b0).toBe(goldenAt60);
    expect(doc.render.filters?.b1).toBeUndefined(); // a title: not graded
    expect(doc.render.transitions?.b5).toEqual({ ...slide, at: 859 });
    expect(doc.render.noBumper?.[0]).toBe("b5");
    expect(doc.render.theme).toBe("cyan-grid");
    expect(doc.render.motions?.b0).toBe("pan");
  });

  it("keys come out in a fixed order", () => {
    expect(Object.keys(toPreset(presetOnly))).toEqual(["schema", "look", "theme", "storyChange", "motion"]);
    expect(Object.keys(toEditionEdits(presetOnly, edition78).render)).toEqual(["filters", "transitions", "noBumper", "theme", "motions"]);
  });

  it("tweaks on one beat go in the edits only, keyed by beat id with a hint, and leave the preset empty", () => {
    const edits = setBeatMotion(setTweak(NO_EDITS, "b3", { brightness: 1.2, saturation: 0.8 }), "b3", "still");
    expect(toPreset(edits)).toEqual({ schema: "jorgemasta.lab.video-presets/preset@1" });
    const doc = toEditionEdits(edits, edition78);
    expect(doc.preset).toEqual({});
    expect(doc.beats).toEqual({
      b3: { hint: { at: "0:16", says: "What happens when your personal operating…" }, look: { saturation: 0.8, brightness: 1.2 }, motion: "still" },
    });
    expect(doc.render).toEqual({
      filters: { b3: "saturate(0.8) sepia(0) hue-rotate(0deg) contrast(1) brightness(1.2)" },
      motions: { b3: "still" },
    });
  });

  it("a per-cut override goes in the edits by cut id; the Report gets it on the incoming beat", () => {
    const whip = { kind: "whip", durationFrames: 12, easing: "ease-out", direction: "right" } as const;
    const doc = toEditionEdits(setCutTransition(NO_EDITS, "b2-b3", whip), edition78);
    expect(doc.cuts).toEqual({ "b2-b3": { hint: { at: "0:16", says: "What happens when your personal operating…", storyChange: false }, transition: whip } });
    expect(doc.render).toEqual({ transitions: { b3: { ...whip, at: 488 } } });
  });

  it("sums up each document in a line", () => {
    expect(exportSummary(NO_EDITS)).toEqual({ preset: "nothing yet, the generated original", edits: "no one-off fixes" });
    const edits = setCutTransition(setTweak(setTweak(presetOnly, "b0", { hue: 4 }), "b3", { hue: 4 }), "b2-b3", slide);
    expect(exportSummary(edits)).toEqual({ preset: "Golden hour 60%, Cyan grid theme, Slide, Pan", edits: "2 beats tweaked, 1 cut overridden" });
    expect(exportSummary(setBeatMotion(setStoryChange(NO_EDITS, { card: "glitch" }), "b0", "still"))).toEqual({ preset: "Glitch card", edits: "motion changed on 1 photo" });
  });
});
