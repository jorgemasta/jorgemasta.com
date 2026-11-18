// When a transition (or story card) is picked, the video replays it a few times
// around its cut. This plans that loop and says what to do on each frame; the
// player glue lives in use-transition-loop.ts.
import { storyChangeToTry } from "./beat-timeline";
import type { Cut, EditionTimeline } from "./timeline";

export type LoopPlan = {
  cut: Cut;
  /** Where each run starts: a second before the cut. */
  from: number;
  /** Where each run ends: a second after the transition. */
  end: number;
  /** Where the player rests once the loop is done: the frame just after the transition. */
  rest: number;
  /** With reduced motion, the still shown instead: halfway through the transition. */
  still: number;
  repeats: number;
};

export const planLoop = (
  timeline: EditionTimeline,
  frame: number,
  { durationFrames, cut: picked, repeats = 3 }: { durationFrames: number; cut?: Cut; repeats?: number },
): LoopPlan | undefined => {
  // The cut picked on the timeline, else the next story change from the playhead.
  const at = picked ? { cut: picked, from: Math.max(0, picked.at - timeline.fps) } : storyChangeToTry(timeline, frame);
  if (!at) return undefined;
  const { cut, from } = at;
  const last = timeline.durationInFrames - 1;
  return {
    cut,
    from,
    end: Math.min(last, cut.at + durationFrames + timeline.fps),
    rest: Math.min(last, cut.at + durationFrames),
    still: cut.at + Math.floor(durationFrames / 2),
    repeats,
  };
};

export type LoopAction =
  | { kind: "play" }
  /** Start run `run` (counted from 1): seek back to the start. */
  | { kind: "again"; run: number; seekTo: number }
  /** The last run is over: pause on `seekTo`. */
  | { kind: "done"; seekTo: number };

/** On a frame of run `run` (from 1): play on, start the next run, or stop. */
export const loopStep = (plan: LoopPlan, run: number, frame: number): LoopAction => {
  if (frame < plan.end) return { kind: "play" };
  if (run >= plan.repeats) return { kind: "done", seekTo: plan.rest };
  return { kind: "again", run: run + 1, seekTo: plan.from };
};
