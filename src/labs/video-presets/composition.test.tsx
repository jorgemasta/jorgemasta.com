// The player's composition hands the Report exactly the `render` the export writes.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReportProps } from "./destilados-snapshot/src/Report";

const seen: { props?: ReportProps } = {};
vi.mock("./destilados-snapshot/src/Report", () => ({
  Report: (props: ReportProps) => {
    seen.props = props;
    return null;
  },
}));

const { LabComposition } = await import("./composition");
const { EDITION, edition78 } = await import("./edition");
const { applyPreset, effectiveEdition, NO_EDITS, setCutTransition, setStoryChange } = await import("./edit-model");
const { setTweak } = await import("./tweaks");
const { toEditionEdits } = await import("./export");

describe("the composition and the export", () => {
  it("the Report gets the export's render: its props, and an entrance and exit on each transition's beats", () => {
    const slide = { kind: "slide", durationFrames: 20, easing: "ease-in-out", direction: "down" } as const;
    const edits = setCutTransition(setStoryChange(setTweak(applyPreset(NO_EDITS, "noir"), "b3", { hue: 10 }), { card: "glitch" }), "b2-b3", slide);
    renderToStaticMarkup(<LabComposition edition={EDITION} report={edition78.report} cuts={edition78.cuts} effective={effectiveEdition(edition78, edits)} />);
    const { edition, lang, timeline, entrance, exit, ...data } = seen.props!;
    // `transitions` reaches the Report as `entrance` and `exit`, the rest as props of the same name.
    const { transitions, ...props } = toEditionEdits(edits, edition78).render;
    expect(Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))).toEqual(props);
    expect(transitions).toEqual({ b3: { ...slide, at: 488 } });
    expect(exit?.("b3")?.frames).toBe(20);
    expect(exit?.("b4")).toBeUndefined();
    expect(entrance?.("b4", "plain")).toBe("plain");
  });
});
