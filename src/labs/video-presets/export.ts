// Export: the visitor's edits as two JSON documents.
//
// - The preset: the reusable rules, for any edition (look and its intensity or
//   Custom values, theme, what plays at story changes, photo motion). No beat
//   or cut ids.
// - The edits: this edition's full edit, for the renderer. The preset, the
//   one-off fixes by beat id and cut id (each with a `hint` for people: where it
//   is and what is said; ignored on import), and `render`: the Report's inputs
//   exactly as the player computes them (report-inputs.ts).
//
// Only what differs from the generated original is written, in a fixed key
// order, so an untouched editor exports an essentially empty preset.
import { formatTime, spoken } from "./beat-timeline";
import { effectiveEdition, lookToCssFilter, NEUTRAL_LOOK, presetName, themeLabel, videoLook, type Edits, type Look, type LookPresetId, type Motion, type StoryCardStyle, type ThemeName } from "./edit-model";
import { MOTION_NAMES } from "./motion-names";
import { reportInputs, type ReportInputs } from "./report-inputs";
import { cardName } from "./story-changes";
import type { BeatId, CutId, EditionTimeline } from "./timeline";
import { transitionPreset, type Transition } from "./transitions";

export const PRESET_SCHEMA = "jorgemasta.lab.video-presets/preset@1";
export const EDITS_SCHEMA = "jorgemasta.lab.video-presets/edits@1";

/** The whole-video look: a preset (with Custom, its values) at an intensity (omitted = 1), and the CSS filter it resolves to. */
export type LookRule = { preset: LookPresetId; intensity?: number; params?: Partial<Look>; filter: string };

export type PresetRules = {
  look?: LookRule;
  theme?: ThemeName;
  /** What plays at every story change: a story card style, or a transition and no card. */
  storyChange?: { card: StoryCardStyle } | { transition: Transition };
  /** Every photo's motion. */
  motion?: Motion;
};

export type PresetDocument = { schema: typeof PRESET_SCHEMA } & PresetRules;

/** For people reading the file: ignored on import. */
export type Hint = { at: string; says: string };

export type EditionEditsDocument = {
  schema: typeof EDITS_SCHEMA;
  edition: string;
  preset: PresetRules;
  /** Per-beat fixes: the look parameters set by hand (absolute values), the photo's own motion. */
  beats?: Record<BeatId, { hint: Hint; look?: Partial<Look>; motion?: Motion }>;
  /** Per-cut transitions, winning over the story change rule on that cut. */
  cuts?: Record<CutId, { hint: Hint & { storyChange: boolean }; transition: Transition }>;
  /** The Report's props for this edit (beyond `edition` and `timeline`). */
  render: ReportInputs;
};

const LOOK_KEYS = Object.keys(NEUTRAL_LOOK) as (keyof Look)[];

/** The parameters in their fixed order; `skipNeutral` drops those equal to neutral. */
const orderedLook = (look: Partial<Look>, skipNeutral: boolean): Partial<Look> => {
  const out: Partial<Look> = {};
  for (const k of LOOK_KEYS) if (look[k] !== undefined && !(skipNeutral && look[k] === NEUTRAL_LOOK[k])) out[k] = look[k];
  return out;
};

const transitionOf = (t: Transition): Transition => ({ kind: t.kind, durationFrames: t.durationFrames, easing: t.easing, direction: t.direction });

const rules = (edits: Edits): PresetRules => {
  const out: PresetRules = {};
  if (edits.preset !== null) {
    const params = edits.preset === "custom" ? orderedLook(edits.custom ?? NEUTRAL_LOOK, true) : {};
    out.look = {
      preset: edits.preset,
      ...(edits.intensity !== 1 && { intensity: edits.intensity }),
      ...(Object.keys(params).length > 0 && { params }),
      filter: lookToCssFilter(videoLook(edits)),
    };
  }
  if (edits.theme) out.theme = edits.theme;
  if (edits.defaultTransition) out.storyChange = { transition: transitionOf(edits.defaultTransition) };
  else if (edits.storyCard) out.storyChange = { card: edits.storyCard };
  if (edits.motion) out.motion = edits.motion;
  return out;
};

/** The preset document: the rules that apply to any edition. */
export const toPreset = (edits: Edits): PresetDocument => ({ schema: PRESET_SCHEMA, ...rules(edits) });

const firstWords = (say: string, n = 6) => {
  const words = spoken(say).split(/\s+/).filter(Boolean);
  return words.length > n ? `${words.slice(0, n).join(" ")}…` : words.join(" ");
};

/** The edits document: this edition's full edit, and what the renderer takes for it. */
export const toEditionEdits = (edits: Edits, timeline: EditionTimeline): EditionEditsDocument => {
  const beats: NonNullable<EditionEditsDocument["beats"]> = {};
  for (const beat of timeline.beats) {
    const look = edits.tweaks[beat.id];
    const motion = edits.beatMotions[beat.id];
    if (!look && !motion) continue;
    beats[beat.id] = {
      hint: { at: formatTime(beat.from, timeline.fps), says: firstWords(beat.say) },
      ...(look && { look: orderedLook(look, false) }),
      ...(motion && { motion }),
    };
  }
  const cuts: NonNullable<EditionEditsDocument["cuts"]> = {};
  for (const cut of timeline.cuts) {
    const t = edits.cutTransitions[cut.id];
    if (!t) continue;
    cuts[cut.id] = { hint: { at: formatTime(cut.at, timeline.fps), says: firstWords(timeline.beats[cut.toBeatIndex].say), storyChange: cut.storyChange }, transition: transitionOf(t) };
  }
  return {
    schema: EDITS_SCHEMA,
    edition: String(timeline.report.edition).padStart(3, "0"),
    preset: rules(edits),
    ...(Object.keys(beats).length > 0 && { beats }),
    ...(Object.keys(cuts).length > 0 && { cuts }),
    render: reportInputs(effectiveEdition(timeline, edits), timeline.cuts),
  };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One line per document: what the preset holds, and the one-off fixes the edits add to it. */
export const exportSummary = (edits: Edits): { preset: string; edits: string } => {
  const preset: string[] = [];
  if (edits.preset !== null) preset.push(`${presetName(edits.preset)}${edits.intensity !== 1 ? ` ${Math.round(edits.intensity * 100)}%` : ""}`);
  if (edits.theme) preset.push(`${themeLabel(edits.theme)} theme`);
  if (edits.defaultTransition) preset.push(transitionPreset(edits.defaultTransition.kind).name);
  else if (edits.storyCard) preset.push(`${cardName(edits.storyCard)} card`);
  if (edits.motion) preset.push(MOTION_NAMES[edits.motion]);
  const fixes: string[] = [];
  const tweaked = Object.keys(edits.tweaks).length;
  const moved = Object.keys(edits.beatMotions).length;
  const cuts = Object.keys(edits.cutTransitions).length;
  if (tweaked) fixes.push(`${plural(tweaked, "beat")} tweaked`);
  if (moved) fixes.push(`motion changed on ${plural(moved, "photo")}`);
  if (cuts) fixes.push(`${plural(cuts, "cut")} overridden`);
  return {
    preset: preset.length ? preset.join(", ") : "nothing yet, the generated original",
    edits: fixes.length ? fixes.join(", ") : "no one-off fixes",
  };
};
