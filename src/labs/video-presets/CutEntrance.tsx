// A transition as the player draws it: the incoming beat entering over its own
// first frames, and the outgoing beat leaving under it. The entrance sits
// inside the incoming beat's <Sequence>, so it starts on the cut and ends within
// the beat; the exit sits inside the outgoing beat's, which the Report draws on
// for the transition's frames (its sound is not extended). Every beat's timing
// on the voice is untouched.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { EASING_CURVES, exitPoseAt, hasMotion, poseAt, poseStyle, type Pose, type Transition } from "./transitions";

/** How far through the transition (eased) `frame` frames after the cut is, or undefined outside it. */
const progress = (t: Transition, frame: number): number | undefined => {
  const d = t.durationFrames;
  if (!hasMotion(t) || d <= 0 || frame < 0 || frame >= d) return undefined;
  return interpolate(frame, [0, d], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...EASING_CURVES[t.easing]),
  });
};

// Always the same wrapper, posed or at rest, so the beat is never remounted
// (a clip would reload) as the transition starts or ends.
const Posed: React.FC<{ pose?: Pose; children: React.ReactNode }> = ({ pose, children }) => (
  <AbsoluteFill style={pose ? { ...poseStyle(pose), willChange: "transform" } : undefined}>{children}</AbsoluteFill>
);

export const CutEntrance: React.FC<{ transition: Transition; children: React.ReactNode }> = ({ transition, children }) => {
  const frame = useCurrentFrame(); // relative to the incoming beat's first frame (the cut)
  const p = progress(transition, frame);
  return <Posed pose={p === undefined ? undefined : poseAt(transition, p)}>{children}</Posed>;
};

/** The outgoing beat, from the cut (`cutAt` frames into its own Sequence) to the end of the transition into the next one. */
export const CutExit: React.FC<{ transition: Transition; cutAt: number; children: React.ReactNode }> = ({ transition, cutAt, children }) => {
  const frame = useCurrentFrame(); // relative to the outgoing beat's first frame
  const p = progress(transition, frame - cutAt);
  return <Posed pose={p === undefined ? undefined : exitPoseAt(transition, p)}>{children}</Posed>;
};
