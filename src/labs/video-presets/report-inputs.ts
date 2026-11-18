// What the vendored Report takes from the visitor's edits (its LAB PATCH props),
// as plain data: the per-beat CSS filters, the transitions by incoming beat, the
// story cards they replace, the theme, the story card style and the changed
// photo motions. Pure, so the player (composition.tsx) and the export
// (export.ts) compute it once, the same way. Only what differs from the
// generated original is present: an absent prop renders as upstream.
import { lookToCssFilter, type EffectiveEdition, type Motion, type StoryCardStyle, type ThemeName } from "./edit-model";
import type { BeatId, Cut } from "./timeline";
import type { Transition } from "./transitions";

/** A transition as the Report draws it: from frame `at` (the cut) over the incoming beat's first frames. */
export type ReportTransition = Transition & { at: number };

export type ReportInputs = {
  /** Beat id → CSS `filter` (the beat's look). */
  filters?: Record<BeatId, string>;
  /** Incoming beat id → the transition on the cut into it (drives `entrance` and `exit`). */
  transitions?: Record<BeatId, ReportTransition>;
  /** First beats of stories whose story card a transition replaces. */
  noBumper?: BeatId[];
  /** The theme, when the visitor changed it. */
  theme?: ThemeName;
  /** The story card's style, when the visitor picked one. */
  storyCard?: StoryCardStyle;
  /** Beat id → image motion, for the photos whose motion changed. */
  motions?: Record<BeatId, Motion>;
};

const nonEmpty = <T extends object>(o: T): T | undefined => (Object.keys(o).length ? o : undefined);

/** The Report's inputs for an effective edition; `cuts` place each cut's transition on its incoming beat. */
export const reportInputs = (
  effective: EffectiveEdition,
  cuts: readonly Pick<Cut, "id" | "toBeat" | "storyChange">[],
): ReportInputs => {
  const filters: Record<BeatId, string> = {};
  for (const [id, look] of Object.entries(effective.looks)) filters[id as BeatId] = lookToCssFilter(look);
  const transitions: Record<BeatId, ReportTransition> = {};
  const noBumper: BeatId[] = [];
  for (const cut of cuts) {
    const t = effective.transitions[cut.id];
    if (!t) continue;
    transitions[cut.toBeat] = { kind: t.kind, durationFrames: t.durationFrames, easing: t.easing, direction: t.direction, at: t.at };
    if (cut.storyChange) noBumper.push(cut.toBeat);
  }
  const motions: Record<BeatId, Motion> = {};
  for (const [id, m] of Object.entries(effective.motions)) if (m.source !== "script") motions[id as BeatId] = m.motion;
  const out: ReportInputs = {};
  if (nonEmpty(filters)) out.filters = filters;
  if (nonEmpty(transitions)) out.transitions = transitions;
  if (noBumper.length) out.noBumper = noBumper;
  if (effective.theme.source === "visitor") out.theme = effective.theme.name;
  if (effective.storyCard.source === "visitor") out.storyCard = effective.storyCard.style;
  if (nonEmpty(motions)) out.motions = motions;
  return out;
};
