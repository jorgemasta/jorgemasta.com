// The Lab's transition library: how one beat hands over to the next. Each
// transition is a named set of the same few settings (kind, duration, easing,
// direction), which the visitor can open and adjust.
//
// A transition never moves a beat. It plays over the opening frames of the
// incoming beat, starting on the cut, so every beat stays where the voice puts
// it (overlapping beats, as Remotion's TransitionSeries does, would shorten the
// video and drift the pictures away from the voice). The outgoing beat stays
// drawn under it for those frames, leaving the way the next one pushes it, so
// the change reads as one scene replacing another.

import { clamp } from "./math";

export type TransitionKind = "cut" | "whip" | "slide" | "zoom";
export type TransitionEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "overshoot";
/** Where the incoming beat comes from (whip, slide), or which way it scales (zoom). */
export type TransitionDirection = "left" | "right" | "up" | "down" | "in" | "out";

export type Transition = {
  kind: TransitionKind;
  /** Length in frames (30 fps). A cut has none. */
  durationFrames: number;
  easing: TransitionEasing;
  direction: TransitionDirection;
};

export type TransitionPreset = { id: TransitionKind; name: string; blurb: string; settings: Transition };

export const TRANSITIONS = [
  {
    id: "cut",
    name: "Cut",
    blurb: "A dry cut, no card.",
    settings: { kind: "cut", durationFrames: 0, easing: "linear", direction: "left" },
  },
  {
    id: "whip",
    name: "Whip",
    blurb: "The next beat throws this one out in a blur.",
    settings: { kind: "whip", durationFrames: 12, easing: "ease-out", direction: "right" },
  },
  {
    id: "slide",
    name: "Slide",
    blurb: "The next beat pushes this one out.",
    settings: { kind: "slide", durationFrames: 20, easing: "ease-in-out", direction: "right" },
  },
  {
    id: "zoom",
    name: "Zoom",
    blurb: "The next beat punches in as this one fades.",
    settings: { kind: "zoom", durationFrames: 18, easing: "overshoot", direction: "in" },
  },
] as const satisfies readonly TransitionPreset[];

export const transitionPreset = (kind: TransitionKind): TransitionPreset => TRANSITIONS.find((t) => t.id === kind)!;

/** Whether a transition moves at all. A cut doesn't: its duration, easing and direction mean nothing. */
export const hasMotion = (t: Pick<Transition, "kind">): boolean => t.kind !== "cut";

/** The directions that mean something for each kind. */
export const DIRECTIONS: Record<TransitionKind, readonly TransitionDirection[]> = {
  cut: [],
  whip: ["left", "right", "up", "down"],
  slide: ["left", "right", "up", "down"],
  zoom: ["in", "out"],
};

export const EASINGS: readonly TransitionEasing[] = ["linear", "ease-in", "ease-out", "ease-in-out", "overshoot"];

/**
 * Each easing as a cubic Bézier, shared by the player (Remotion's
 * `Easing.bezier`) and the editor's small previews (CSS), so both move alike.
 */
export const EASING_CURVES: Record<TransitionEasing, readonly [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  "ease-in": [0.32, 0, 0.67, 0],
  "ease-out": [0.33, 1, 0.68, 1],
  "ease-in-out": [0.65, 0, 0.35, 1],
  overshoot: [0.34, 1.56, 0.64, 1],
};

export const cssEasing = (e: TransitionEasing): string => `cubic-bezier(${EASING_CURVES[e].join(", ")})`;

/**
 * The incoming beat's pose `p` (0–1) of the way through a transition: where it
 * sits (in % of the frame), its scale, blur and opacity. 1 is the beat at rest.
 */
export type Pose = { x: number; y: number; scale: number; blur: number; opacity: number };

export const poseAt = (t: Transition, p: number): Pose => {
  const rest: Pose = { x: 0, y: 0, scale: 1, blur: 0, opacity: 1 };
  const left = 1 - p; // how far there is still to go
  const away = (d: number) => ({
    x: t.direction === "left" ? -d : t.direction === "right" ? d : 0,
    y: t.direction === "up" ? -d : t.direction === "down" ? d : 0,
  });
  switch (t.kind) {
    case "cut":
      return rest;
    case "slide":
      return { ...rest, ...away(100 * left) };
    case "whip":
      // Comes in fast from off-frame, smeared until it lands.
      return { ...rest, ...away(100 * left), blur: 36 * clamp(left * 1.5, 0, 1) };
    case "zoom":
      // Fades in over most of it, a crossfade with the outgoing beat fading under it.
      return { ...rest, scale: 1 + (t.direction === "out" ? -0.45 : 0.6) * left, opacity: clamp(p * 1.25, 0, 1) };
  }
};

/**
 * The outgoing beat's pose `p` (0–1) of the way through the same transition: 0
 * is the beat as it was on the cut. A slide pushes it out the opposite way in
 * lockstep with the incoming beat (edge to edge), a whip throws it out with the
 * same smear, a zoom scales it a little and fades it under the incoming beat.
 */
export const exitPoseAt = (t: Transition, p: number): Pose => {
  const rest: Pose = { x: 0, y: 0, scale: 1, blur: 0, opacity: 1 };
  const toward = (d: number) => ({
    x: t.direction === "left" ? d : t.direction === "right" ? -d : 0,
    y: t.direction === "up" ? d : t.direction === "down" ? -d : 0,
  });
  switch (t.kind) {
    case "cut":
      return rest;
    case "slide":
      return { ...rest, ...toward(100 * p) };
    case "whip":
      return { ...rest, ...toward(100 * p), blur: 36 * clamp(p * 1.5, 0, 1) };
    case "zoom":
      return { ...rest, scale: 1 + (t.direction === "out" ? -0.15 : 0.2) * p, opacity: clamp(1 - p, 0, 1) };
  }
};

/** A pose as CSS (transform, filter, opacity). */
export const poseStyle = (pose: Pose): { transform: string; filter?: string; opacity: number } => ({
  transform: `translate(${pose.x}%, ${pose.y}%) scale(${pose.scale})`,
  filter: pose.blur > 0 ? `blur(${pose.blur}px)` : undefined,
  opacity: pose.opacity,
});

/** Duration bounds the settings panel offers, in frames. */
export const MIN_FRAMES = 4;
export const MAX_FRAMES = 30;

/** Adjusts a transition's settings, keeping them valid for its kind. */
export const adjustTransition = (t: Transition, change: Partial<Omit<Transition, "kind">>): Transition => {
  const next = { ...t, ...change };
  if (!hasMotion(t)) return { ...next, durationFrames: 0 };
  next.durationFrames = Math.round(clamp(next.durationFrames, MIN_FRAMES, MAX_FRAMES));
  if (!DIRECTIONS[t.kind].includes(next.direction)) next.direction = t.direction;
  return next;
};

export const sameTransition = (a: Transition | null | undefined, b: Transition | null | undefined): boolean =>
  !!a && !!b && a.kind === b.kind && a.durationFrames === b.durationFrames && a.easing === b.easing && a.direction === b.direction;
