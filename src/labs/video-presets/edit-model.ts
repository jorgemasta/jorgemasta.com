// The Lab's edit model: the generated edition plus the visitor's edits in, the
// effective edit for every beat out. Pure; the player renders what it returns.
import { clamp } from "./math";
import { withKey } from "./records";
import type { BeatId, Cut, CutId, LabBeat } from "./timeline";
import type { Transition } from "./transitions";
import { withTweak, type BeatTweak } from "./tweaks";
import { PRESETS as THEME_PRESETS, type ThemeName, type Texture, type Transition as StoryCardStyle } from "./destilados-snapshot/src/themes";
import type { Motion } from "./destilados-snapshot/src/types";

export type { Motion, StoryCardStyle, ThemeName };

/** What the edit model needs from the edition. */
export type EditionShape = {
  /** The edition's own theme (script.json `theme`); omitted = amber-paper, edition 78's. */
  theme?: ThemeName;
  /**
   * `to` (the frame a beat ends) bounds a transition on the cut into it; an image
   * beat's `visual.motion` is the motion its script gives it.
   */
  beats: readonly (Pick<LabBeat, "id" | "visualKind"> & Partial<Pick<LabBeat, "to">> & { visual?: { type: string; motion?: Motion } })[];
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
  { id: "noir", name: "Noir", look: { saturation: 0, contrast: 1.45, brightness: 0.92, warmth: 0, hue: 0 } },
  { id: "bleach", name: "Bleach", look: { saturation: 0.45, contrast: 1.35, brightness: 1.02, warmth: 0, hue: 0 } },
  { id: "cool", name: "Cool", look: { saturation: 0.85, contrast: 1.08, brightness: 1.04, warmth: 0, hue: -14 } },
] as const satisfies readonly LookPreset[];

/** A named preset, or "custom": the five values the visitor sets for the whole video. */
export type LookPresetId = (typeof LOOK_PRESETS)[number]["id"] | "custom";

/** Beat kinds whose visual is a photo, screenshot or clip: the ones a look grades. */
const GRADED_KINDS: ReadonlySet<string> = new Set(["image", "gif", "clip", "story", "sequence", "callouts", "slider", "meme", "versus"]);

/** Whether a look (preset or tweak) applies to a beat of this visual kind. */
export const isGraded = (visualKind: string): boolean => GRADED_KINDS.has(visualKind);

/** The visitor's edits. Held in memory only. */
export type Edits = {
  /** The applied look preset ("custom" = `custom`), or null for the generated original. */
  preset: LookPresetId | null;
  /** The Custom look's values; null until Custom is first picked. */
  custom: Look | null;
  /** How much of the preset applies: 0 = the original, 1 = the full preset. */
  intensity: number;
  /** Per-beat manual tweaks by beat id (see tweaks.ts for how they meet the preset). */
  tweaks: Record<BeatId, BeatTweak>;
  /** The transition on every story change, or null for the generated story card. */
  defaultTransition: Transition | null;
  /** Per-cut exceptions, by cut id; they win over the default on that cut only. */
  cutTransitions: Record<CutId, Transition>;
  /** The theme the whole video plays in, or null for the edition's own. */
  theme: ThemeName | null;
  /** The generated story card's style, or null to follow the theme. */
  storyCard: StoryCardStyle | null;
  /** The motion of every image beat, or null for each one's scripted motion. */
  motion: Motion | null;
  /** Per-beat motion exceptions, by beat id; they win over the default on that beat. */
  beatMotions: Record<BeatId, Motion>;
};

export const NO_EDITS: Edits = { preset: null, custom: null, intensity: 1, tweaks: {}, defaultTransition: null, cutTransitions: {}, theme: null, storyCard: null, motion: null, beatMotions: {} };

/** The edition as the player should render it. Only edited beats appear. */
export type EffectiveEdition = {
  /** Effective look per beat id; a beat with no entry renders as generated. */
  looks: Record<BeatId, Look>;
  /** Effective transition per cut id; a cut with no entry renders as generated. */
  transitions: Record<CutId, EffectiveTransition>;
  /** The theme the whole video plays in: its second accent and background texture. */
  theme: { name: ThemeName; accent2: string; texture: Texture; source: "edition" | "visitor" };
  /** The generated story card's style (where no transition replaces it). */
  storyCard: { style: StoryCardStyle; source: "theme" | "visitor" };
  /** Every image beat's motion, and where it comes from. */
  motions: Record<BeatId, { motion: Motion; source: "script" | "default" | "override" }>;
};

/**
 * A transition as it plays: from frame `at` (the cut, where the voice starts the
 * incoming beat) for `durationFrames`, never past the end of that beat.
 */
export type EffectiveTransition = Transition & { at: number; source: "default" | "override" };

/** A preset's name as the editor shows it. */
export const presetName = (id: LookPresetId): string => (id === "custom" ? "Custom" : LOOK_PRESETS.find((p) => p.id === id)!.name);

/** A preset's full look (Custom: the visitor's values, neutral until set). */
export const presetLook = (edits: Pick<Edits, "custom">, id: LookPresetId): Look =>
  id === "custom" ? (edits.custom ?? NEUTRAL_LOOK) : LOOK_PRESETS.find((p) => p.id === id)!.look;

const sameLook = (a: Look, b: Look) => (Object.keys(a) as (keyof Look)[]).every((k) => a[k] === b[k]);

const round = (n: number) => Math.round(n * 1000) / 1000;

/** The look `amount` (0–1) of the way from neutral to `look`. */
const mix = (look: Look, amount: number): Look => {
  const out = { ...NEUTRAL_LOOK };
  for (const k of Object.keys(out) as (keyof Look)[]) out[k] = round(NEUTRAL_LOOK[k] + (look[k] - NEUTRAL_LOOK[k]) * amount);
  return out;
};

export const effectiveEdition = (edition: EditionShape, edits: Edits): EffectiveEdition => {
  const own = edition.theme ?? "amber-paper";
  const name = edits.theme ?? own;
  const theme = THEME_PRESETS[name];
  return {
    looks: effectiveLooks(edition, edits),
    transitions: effectiveTransitions(edition, edits),
    theme: { name, accent2: theme.accent2, texture: theme.texture, source: name === own ? "edition" : "visitor" },
    storyCard: edits.storyCard ? { style: edits.storyCard, source: "visitor" } : { style: theme.transition, source: "theme" },
    motions: effectiveMotions(edition, edits),
  };
};

/** The image motions the renderer has, in the order the editor offers them. */
export const MOTIONS = ["zoom", "punch", "shake", "pan", "still"] as const satisfies readonly Motion[];

/** Whether a beat of this visual kind takes an image motion (photos only). */
export const hasMotion = (visualKind: string): boolean => visualKind === "image";

/** The renderer's motion when an image beat's script names none. */
const SCRIPT_DEFAULT_MOTION: Motion = "zoom";

const effectiveMotions = (edition: EditionShape, edits: Edits): EffectiveEdition["motions"] => {
  const out: EffectiveEdition["motions"] = {};
  for (const beat of edition.beats) {
    if (!hasMotion(beat.visualKind)) continue;
    const override = edits.beatMotions[beat.id];
    out[beat.id] = override
      ? { motion: override, source: "override" }
      : edits.motion
        ? { motion: edits.motion, source: "default" }
        : { motion: beat.visual?.motion ?? SCRIPT_DEFAULT_MOTION, source: "script" };
  }
  return out;
};

/** The look every graded beat takes from the preset at its intensity (neutral with none). */
export const videoLook = (edits: Edits): Look => (edits.preset !== null ? mix(presetLook(edits, edits.preset), edits.intensity) : NEUTRAL_LOOK);

const effectiveLooks = (edition: EditionShape, edits: Edits): EffectiveEdition["looks"] => {
  const looks: EffectiveEdition["looks"] = {};
  const look = videoLook(edits);
  // A look that changes nothing (no preset, zero intensity, an untouched Custom) leaves beats as generated.
  const graded = !sameLook(look, NEUTRAL_LOOK);
  for (const beat of edition.beats) {
    if (!GRADED_KINDS.has(beat.visualKind)) continue;
    const tweak = edits.tweaks[beat.id];
    if (tweak) looks[beat.id] = withTweak(look, tweak);
    else if (graded) looks[beat.id] = look;
  }
  return looks;
};

const effectiveTransitions = (edition: EditionShape, edits: Edits): EffectiveEdition["transitions"] => {
  const out: EffectiveEdition["transitions"] = {};
  const ends = new Map(edition.beats.map((b) => [b.id, b.to]));
  for (const cut of edition.cuts ?? []) {
    const override = edits.cutTransitions[cut.id];
    const chosen = override ?? (cut.storyChange ? edits.defaultTransition : null);
    if (!chosen) continue;
    const end = ends.get(cut.toBeat);
    const durationFrames = end === undefined ? chosen.durationFrames : clamp(end - cut.at, 0, chosen.durationFrames);
    out[cut.id] = { ...chosen, durationFrames, at: cut.at, source: override ? "override" : "default" };
  }
  return out;
};

/**
 * Applies a look preset (null = none). Custom, the first time it is picked, starts
 * from the preset applied then, so a preset can be adjusted into Custom.
 */
export const applyPreset = (edits: Edits, preset: LookPresetId | null): Edits => {
  if (preset !== "custom" || edits.custom) return { ...edits, preset };
  const from = edits.preset && edits.preset !== "custom" ? presetLook(edits, edits.preset) : NEUTRAL_LOOK;
  return { ...edits, preset, custom: { ...from } };
};

/** Sets some of the Custom look's values (applied wherever Custom is the preset). */
export const setCustomLook = (edits: Edits, values: Partial<Look>): Edits => ({
  ...edits,
  custom: { ...(edits.custom ?? NEUTRAL_LOOK), ...values },
});

export const setIntensity = (edits: Edits, intensity: number): Edits => ({
  ...edits,
  intensity: clamp(intensity, 0, 1),
});

/** Overrides the transition on one cut (null removes the override: the cut follows the default again). */
export const setCutTransition = (edits: Edits, cutId: CutId, transition: Transition | null): Edits => ({
  ...edits,
  cutTransitions: withKey(edits.cutTransitions, cutId, transition),
});

/** "amber-paper" → "Amber paper". */
export const themeLabel = (name: ThemeName) => {
  const words = name.replace("-", " ");
  return words[0].toUpperCase() + words.slice(1);
};

/** Plays the whole video in a theme (null = the edition's own). */
export const setTheme = (edits: Edits, theme: ThemeName | null): Edits => ({ ...edits, theme });

/**
 * What plays at every story change: the generated story card in a style (null =
 * the theme's, which follows a theme change), or a transition and no card.
 */
export type StoryChange = { card: StoryCardStyle | null } | { transition: Transition };

/**
 * Sets what plays at every story change. A card clears the default transition
 * (the two never play together); a transition plays instead of the card.
 * Per-cut exceptions are left as they are.
 */
export const setStoryChange = (edits: Edits, change: StoryChange): Edits =>
  "card" in change ? { ...edits, storyCard: change.card, defaultTransition: null } : { ...edits, defaultTransition: change.transition };

/** Sets the motion of every image beat (null = each one's scripted motion). */
export const setMotion = (edits: Edits, motion: Motion | null): Edits => ({ ...edits, motion });

/** Overrides one image beat's motion (null removes the override: the beat follows the default again). */
export const setBeatMotion = (edits: Edits, beatId: BeatId, motion: Motion | null): Edits => ({
  ...edits,
  beatMotions: withKey(edits.beatMotions, beatId, motion),
});

/** Clears every edit (looks, tweaks, transitions): the generated original. */
export const reset = (): Edits => NO_EDITS;

/** Whether anything differs from the generated original (what Reset would undo). */
export const hasEdits = (edits: Edits): boolean =>
  edits.preset !== null ||
  Object.keys(edits.tweaks).length > 0 ||
  edits.theme !== null ||
  edits.storyCard !== null ||
  edits.motion !== null ||
  Object.keys(edits.beatMotions).length > 0 ||
  edits.defaultTransition !== null ||
  Object.keys(edits.cutTransitions).length > 0;

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
