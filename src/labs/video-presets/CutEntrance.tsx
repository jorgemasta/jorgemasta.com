// A transition as the player draws it: the incoming beat entering over its own
// first frames. It sits inside the beat's <Sequence>, so it can only start on
// the cut and end within the beat: the beat's timing on the voice is untouched.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { EASING_CURVES, poseAt, poseStyle, type Transition } from "./transitions";

export const CutEntrance: React.FC<{ transition: Transition; children: React.ReactNode }> = ({ transition, children }) => {
  const frame = useCurrentFrame(); // relative to the incoming beat's first frame (the cut)
  const d = transition.durationFrames;
  if (transition.kind === "cut" || d <= 0 || frame >= d) return <>{children}</>;
  const p = interpolate(frame, [0, d], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...EASING_CURVES[transition.easing]),
  });
  return <AbsoluteFill style={{ ...poseStyle(poseAt(transition, p)), willChange: "transform" }}>{children}</AbsoluteFill>;
};
