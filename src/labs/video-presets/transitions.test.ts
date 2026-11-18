import { describe, expect, it } from "vitest";
import { exitPoseAt, hasMotion, poseAt, transitionPreset, TRANSITIONS, type Transition } from "./transitions";

describe("hasMotion", () => {
  it("is false only for a dry cut, which has no duration, easing or direction", () => {
    expect(TRANSITIONS.filter((t) => !hasMotion(t.settings)).map((t) => t.id)).toEqual(["cut"]);
  });
});

const slide = (direction: Transition["direction"]): Transition => ({ kind: "slide", durationFrames: 20, easing: "linear", direction });

describe("exitPoseAt: the outgoing beat, pushed out by the next one", () => {
  it("is pushed the opposite way in lockstep with a slide, so the two beats stay edge to edge", () => {
    expect(exitPoseAt(slide("right"), 0.25)).toMatchObject({ x: -25, y: 0, opacity: 1 });
    expect(poseAt(slide("right"), 0.25).x).toBe(75); // B's leading edge meets A's trailing edge
    expect(exitPoseAt(slide("down"), 0.5)).toMatchObject({ x: 0, y: -50 });
  });

  it("starts at rest and ends fully off-frame", () => {
    expect(exitPoseAt(slide("left"), 0)).toEqual({ x: 0, y: 0, scale: 1, blur: 0, opacity: 1 });
    expect(exitPoseAt(slide("left"), 1)).toMatchObject({ x: 100, y: 0 });
  });

  it("smears as a whip throws it out", () => {
    const whip: Transition = { kind: "whip", durationFrames: 12, easing: "linear", direction: "up" };
    expect(exitPoseAt(whip, 0)).toMatchObject({ y: 0, blur: 0 });
    expect(exitPoseAt(whip, 0.5)).toMatchObject({ y: 50, blur: 27 });
    expect(exitPoseAt(whip, 1)).toMatchObject({ y: 100, blur: 36 });
  });

  it("swells a little and fades under a zoom in, shrinks under a zoom out", () => {
    const zoom = (direction: "in" | "out"): Transition => ({ kind: "zoom", durationFrames: 18, easing: "linear", direction });
    expect(exitPoseAt(zoom("in"), 0.5)).toMatchObject({ x: 0, y: 0, scale: 1.1, opacity: 0.5 });
    expect(exitPoseAt(zoom("in"), 1)).toMatchObject({ scale: 1.2, opacity: 0 });
    expect(exitPoseAt(zoom("out"), 1).scale).toBeCloseTo(0.85);
  });

  it("crossfades with a zoom: halfway through, both beats show", () => {
    const zoom: Transition = { kind: "zoom", durationFrames: 18, easing: "linear", direction: "in" };
    expect(poseAt(zoom, 0.5).opacity).toBeGreaterThan(0.4);
    expect(poseAt(zoom, 0.5).opacity).toBeLessThan(1);
    expect(exitPoseAt(zoom, 0.5).opacity).toBeGreaterThan(0);
    expect(poseAt(zoom, 1).opacity).toBe(1);
  });

  it("leaves a dry cut's outgoing beat alone", () => {
    expect(exitPoseAt(transitionPreset("cut").settings, 0.5)).toEqual({ x: 0, y: 0, scale: 1, blur: 0, opacity: 1 });
  });
});

describe("the transition defaults", () => {
  it("last long enough to read as a scene change: whip under slide under a story card", () => {
    const frames = (k: "whip" | "slide" | "zoom") => transitionPreset(k).settings.durationFrames;
    expect(frames("whip")).toBeGreaterThanOrEqual(12);
    expect(frames("slide")).toBeGreaterThanOrEqual(18);
    expect(frames("zoom")).toBeGreaterThanOrEqual(16);
    expect(frames("whip")).toBeLessThan(frames("slide"));
  });
});
