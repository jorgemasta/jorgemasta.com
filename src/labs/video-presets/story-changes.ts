// What plays at a story change, as one choice: one of the generated story
// card's styles (a title card between stories) or a transition (no card: the
// next story moves straight in). Exactly one is chosen for every story change;
// a cut picked on the timeline can take a transition of its own, never a card
// (the card is one style for the whole video). Pure: Transitions.tsx renders it.
import { formatTime } from "./beat-timeline";
import { effectiveEdition, setCutTransition, setStoryChange, type EditionShape, type Edits, type StoryCardStyle } from "./edit-model";
import { PRESETS as THEME_PRESETS } from "./destilados-snapshot/src/themes";
import type { Cut, CutId } from "./timeline";
import { transitionPreset, TRANSITIONS, type Transition, type TransitionKind } from "./transitions";

/** What a pick acts on: every story change (null), or one cut. */
export type CutTarget = CutId | null;

export type Chosen = { kind: "card"; id: StoryCardStyle } | { kind: "transition"; id: TransitionKind };

export type StoryChangeOption = Chosen & { name: string; blurb: string };

/** The card styles, as the renderer draws them (StoryBumper). "zoom" shows as Pop, so it never reads as the Zoom transition. */
export const CARD_OPTIONS = [
  { kind: "card", id: "band", name: "Band", blurb: "Cuts to the card; a colour band sweeps down." },
  { kind: "card", id: "glitch", name: "Glitch", blurb: "A slanted slab wipes it in, with an RGB jolt." },
  { kind: "card", id: "wipe", name: "Wipe", blurb: "A slanted slab wipes it in and out, clean." },
  { kind: "card", id: "zoom", name: "Pop", blurb: "The card pops in big and shrinks away." },
] as const satisfies readonly StoryChangeOption[];

export const TRANSITION_OPTIONS = TRANSITIONS.map(
  (t): StoryChangeOption => ({ kind: "transition", id: t.id, name: t.name, blurb: t.blurb }),
);

export const STORY_CHANGE_OPTIONS: readonly StoryChangeOption[] = [...CARD_OPTIONS, ...TRANSITION_OPTIONS];

export const cardName = (style: StoryCardStyle): string => CARD_OPTIONS.find((o) => o.id === style)!.name;

const transitionName = (t: Pick<Transition, "kind">) => transitionPreset(t.kind).name;

/** The style the theme on brings. */
const themeCard = (edition: EditionShape, edits: Edits): StoryCardStyle => THEME_PRESETS[effectiveEdition(edition, edits).theme.name].transition;

/** The option chosen on a target; null on a cut that follows the default. */
export const chosenOn = (edition: EditionShape, edits: Edits, target: CutTarget): Chosen | null => {
  if (target !== null) {
    const t = edits.cutTransitions[target];
    return t ? { kind: "transition", id: t.kind } : null;
  }
  if (edits.defaultTransition) return { kind: "transition", id: edits.defaultTransition.kind };
  return { kind: "card", id: effectiveEdition(edition, edits).storyCard.style };
};

/**
 * The edits with `option` picked on `target`. The theme's card follows the theme
 * (null). A transition keeps the settings it already has on the target, else on
 * every story change, else starts from its preset. A card on one cut is not
 * possible: the edits come back unchanged.
 */
export const pickOption = (edition: EditionShape, edits: Edits, target: CutTarget, option: Chosen): Edits => {
  if (option.kind === "card") {
    if (target !== null) return edits;
    return setStoryChange(edits, { card: option.id === themeCard(edition, edits) ? null : option.id });
  }
  const on = target === null ? null : edits.cutTransitions[target];
  const transition = [on, edits.defaultTransition].find((t) => t?.kind === option.id) ?? transitionPreset(option.id).settings;
  return target === null ? setStoryChange(edits, { transition }) : setCutTransition(edits, target, transition);
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What plays on every story change, as the status line names it. */
const defaultLabel = (edition: EditionShape, edits: Edits) =>
  edits.defaultTransition ? `${transitionName(edits.defaultTransition)}, no card` : `the ${cardName(effectiveEdition(edition, edits).storyCard.style)} card`;

/** One line: what plays at story changes, or on the picked cut. */
export const storyChangeStatus = (
  edition: EditionShape,
  edits: Edits,
  cut: Pick<Cut, "id" | "at" | "toBeatIndex" | "storyChange"> | undefined,
  fps: number,
): string => {
  if (!cut) {
    const overrides = Object.keys(edits.cutTransitions).length;
    return `Story changes: ${defaultLabel(edition, edits)}${overrides ? ` · ${plural(overrides, "cut")} overridden` : ""}.`;
  }
  const label = `Cut into beat ${cut.toBeatIndex + 1} at ${formatTime(cut.at, fps)}`;
  const own = edits.cutTransitions[cut.id];
  if (own) return `${label}: ${transitionName(own)}, no card (overrides the default).`;
  return `${label} follows the default: ${cut.storyChange ? defaultLabel(edition, edits) : "a plain cut"}.`;
};
