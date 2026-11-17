// The Lab's edit model: the generated edition plus the visitor's edits in, the
// effective edit for every beat out. Pure; the player renders what it returns.
import type { Cut, LabBeat } from "./timeline";
import type { Transition } from "./transitions";
import { withTweak, type BeatTweak } from "./tweaks";

/** What the edit model needs from the edition. */
export type EditionShape = {
  /** `to` (the frame a beat ends) bounds a transition on the cut into it. */
  beats: readonly (Pick<LabBeat, "id" | "visualKind"> & Partial<Pick<LabBeat, "to">>)[];
  cuts?: readonly Pick<Cut, "id" | "at" | "toBeat" | "storyChange">[];
};

/**
 * A colour treatment, as the handful of parameters every preset shares.
 * Multipliers are 1 when neutral; `warmth` (0–1) and `hue` (degrees) are 0.
 */
export type Look = {
  saturation: number;
  contrast: number;
  brightness: number;
  warmth: number;
  hue: number;
};

export const NEUTRAL_LOOK: Look = { saturation: 1, contrast: 1, brightness: 1, warmth: 0, hue: 0 };

export type LookPreset = { id: string; name: string; look: Look };

export const LOOK_PRESETS = [
  { id: "punch", name: "Punch", look: { saturation: 1.35, contrast: 1.2, brightness: 1, warmth: 0, hue: 0 } },
  { id: "golden-hour", name: "Golden hour", look: { saturation: 1.15, contrast: 1.05, brightness: 1.04, warmth: 0.3, hue: -8 } },
  { id: "matte", name: "Matte", look: { saturation: 0.75, contrast: 0.85, brightness: 1.08, warmth: 0.1, hue: 0 } },
  { id: "newsprint", name: "Newsprint", look: { saturation: 0, contrast: 1.25, brightness: 1.05, warmth: 0.15, hue: 0 } },
] as const satisfies readonly LookPreset[];

export type LookPresetId = (typeof LOOK_PRESETS)[number]["id"];

/** Beat kinds whose visual is a photo, screenshot or clip: the ones a look grades. */
const GRADED_KINDS: ReadonlySet<string> = new Set(["image", "gif", "clip", "story", "sequence", "callouts", "slider", "meme", "versus"]);

/** Whether a look (preset or tweak) applies to a beat of this visual kind. */
export const isGraded = (visualKind: string): boolean => GRADED_KINDS.has(visualKind);

/** The visitor's edits. Held in memory only. */
export type Edits = {
  /** The applied look preset, or null for the generated original. */
  preset: LookPresetId | null;
  /** How much of the preset applies: 0 = the original, 1 = the full preset. */
  intensity: number;
  /** Per-beat manual tweaks by beat id (see tweaks.ts for how they meet the preset). */
  tweaks: Record<string, BeatTweak>;
  /** The transition on every story change, or null for the generated story card. */
  defaultTransition: Transition | null;
  /** Per-cut exceptions, by cut id; they win over the default on that cut only. */
  cutTransitions: Record<string, Transition>;
};

export const NO_EDITS: Edits = { preset: null, intensity: 1, tweaks: {}, defaultTransition: null, cutTransitions: {} };

/** The edition as the player should render it. Only edited beats appear. */
export type EffectiveEdition = {
  /** Effective look per beat id; a beat with no entry renders as generated. */
  looks: Record<string, Look>;
  /** Effective transition per cut id; a cut with no entry renders as generated. */
  transitions: Record<string, EffectiveTransition>;
};

/**
 * A transition as it plays: from frame `at` (the cut, where the voice starts the
 * incoming beat) for `durationFrames`, never past the end of that beat.
 */
export type EffectiveTransition = Transition & { at: number; source: "default" | "override" };

const presetLook = (id: LookPresetId): Look => LOOK_PRESETS.find((p) => p.id === id)!.look;

const round = (n: number) => Math.round(n * 1000) / 1000;

/** The look `amount` (0–1) of the way from neutral to `look`. */
const mix = (look: Look, amount: number): Look => {
  const out = { ...NEUTRAL_LOOK };
  for (const k of Object.keys(out) as (keyof Look)[]) out[k] = round(NEUTRAL_LOOK[k] + (look[k] - NEUTRAL_LOOK[k]) * amount);
  return out;
};

export const effectiveEdition = (edition: EditionShape, edits: Edits): EffectiveEdition => ({
  looks: effectiveLooks(edition, edits),
  transitions: effectiveTransitions(edition, edits),
});

const effectiveLooks = (edition: EditionShape, edits: Edits): Record<string, Look> => {
  const looks: Record<string, Look> = {};
  const graded = edits.preset !== null && edits.intensity > 0;
  const look = graded ? mix(presetLook(edits.preset!), edits.intensity) : NEUTRAL_LOOK;
  for (const beat of edition.beats) {
    if (!GRADED_KINDS.has(beat.visualKind)) continue;
    const tweak = edits.tweaks[beat.id];
    if (tweak) looks[beat.id] = withTweak(look, tweak);
    else if (graded) looks[beat.id] = look;
  }
  return looks;
};

const effectiveTransitions = (edition: EditionShape, edits: Edits): Record<string, EffectiveTransition> => {
  const out: Record<string, EffectiveTransition> = {};
  const ends = new Map(edition.beats.map((b) => [b.id, b.to]));
  for (const cut of edition.cuts ?? []) {
    const override = edits.cutTransitions[cut.id];
    const chosen = override ?? (cut.storyChange ? edits.defaultTransition : null);
    if (!chosen) continue;
    const end = ends.get(cut.toBeat);
    const durationFrames = end === undefined ? chosen.durationFrames : Math.min(chosen.durationFrames, Math.max(0, end - cut.at));
    out[cut.id] = { ...chosen, durationFrames, at: cut.at, source: override ? "override" : "default" };
  }
  return out;
};

export const applyPreset = (edits: Edits, preset: LookPresetId | null): Edits => ({ ...edits, preset });

export const setIntensity = (edits: Edits, intensity: number): Edits => ({
  ...edits,
  intensity: Math.min(1, Math.max(0, intensity)),
});

/** Sets the transition on every story change (null = the generated story card). */
export const setDefaultTransition = (edits: Edits, transition: Transition | null): Edits => ({ ...edits, defaultTransition: transition });

/** Overrides the transition on one cut (null removes the override: the cut follows the default again). */
export const setCutTransition = (edits: Edits, cutId: string, transition: Transition | null): Edits => {
  const { [cutId]: _removed, ...rest } = edits.cutTransitions;
  return { ...edits, cutTransitions: transition ? { ...rest, [cutId]: transition } : rest };
};

/** Clears every edit: the generated original. */
export const reset = (_edits: Edits): Edits => NO_EDITS;

/**
 * The CSS `filter` for a look. Saturation goes first so a desaturated preset can
 * still be warmed by `sepia` after it.
 */
export const lookToCssFilter = (look: Look): string =>
  [
    `saturate(${look.saturation})`,
    `sepia(${look.warmth})`,
    `hue-rotate(${look.hue}deg)`,
    `contrast(${look.contrast})`,
    `brightness(${look.brightness})`,
  ].join(" ");
