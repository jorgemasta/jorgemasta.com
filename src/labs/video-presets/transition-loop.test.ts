import { describe, expect, it } from "vitest";
import { edition78 } from "./edition";
import { loopStep, planLoop } from "./transition-loop";

// Edition 78 runs at 30 fps; its story changes include 2081 and 3047 (beat-timeline.test.ts).
describe("planLoop: the frames a transition replays over", () => {
  it("plays from a second before the next story change to a second after the transition, three times", () => {
    expect(planLoop(edition78, 1500, { durationFrames: 9 })).toEqual({
      cut: expect.objectContaining({ at: 2081 }),
      from: 2051,
      end: 2120,
      rest: 2090,
      still: 2085,
      repeats: 3,
    });
  });

  it("plays a picked cut, wherever the playhead is, even one that is not a story change", () => {
    const cut = edition78.cuts.find((c) => c.at === 1050)!;
    expect(cut.storyChange).toBe(false);
    expect(planLoop(edition78, 4000, { durationFrames: 12, cut, repeats: 1 })).toMatchObject({ cut, from: 1020, end: 1092, rest: 1062, repeats: 1 });
  });

  it("stops each run at the video's last frame when the cut is near the end", () => {
    const last = edition78.durationInFrames - 1;
    const cut = { ...edition78.cuts.at(-1)!, at: last - 20 };
    expect(planLoop(edition78, 0, { durationFrames: 12, cut })).toMatchObject({ end: last, rest: last - 8 });
  });
});

describe("loopStep: what the player does as each frame plays", () => {
  const plan = planLoop(edition78, 1500, { durationFrames: 9 })!; // 2051 → 2120, rest 2090

  it("keeps playing until the run reaches its end", () => {
    expect(loopStep(plan, 1, 2051)).toEqual({ kind: "play" });
    expect(loopStep(plan, 2, 2119)).toEqual({ kind: "play" });
  });

  it("goes back to the start for the next run", () => {
    expect(loopStep(plan, 1, 2120)).toEqual({ kind: "again", run: 2, seekTo: 2051 });
    expect(loopStep(plan, 2, 2122)).toEqual({ kind: "again", run: 3, seekTo: 2051 });
  });

  it("pauses just after the transition once the last run ends", () => {
    expect(loopStep(plan, 3, 2120)).toEqual({ kind: "done", seekTo: 2090 });
  });

  it("ends a single run (\"Try it\") at its first end", () => {
    const once = planLoop(edition78, 1500, { durationFrames: 9, repeats: 1 })!;
    expect(loopStep(once, 1, 2120)).toEqual({ kind: "done", seekTo: 2090 });
  });
});
