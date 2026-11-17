// Per-beat manual look tweaks, and how they meet the preset (the Lab's question).
//
// Precedence: a tweak owns only the parameters the visitor touched on that beat.
// Those keep the value the visitor set, whatever the preset or its intensity;
// every parameter left untouched keeps following the current preset. Changing
// the preset never discards manual work, and a beat still moves with the preset
// on everything the visitor didn't fix by hand.
import type { Edits, Look } from "./edit-model";

/** The parameters the visitor set by hand on one beat, as absolute values. */
export type BeatTweak = Partial<Look>;

/** The beat's look: the preset's look with the tweaked parameters taken over. */
export const withTweak = (presetLook: Look, tweak: BeatTweak | undefined): Look => ({ ...presetLook, ...tweak });

/** Sets some of a beat's look parameters by hand (merged into its existing tweak). */
export const setTweak = (edits: Edits, beatId: string, values: BeatTweak): Edits => ({
  ...edits,
  tweaks: { ...edits.tweaks, [beatId]: { ...edits.tweaks[beatId], ...values } },
});

/** Removes a beat's tweak: the beat follows the current preset again. */
export const clearTweak = (edits: Edits, beatId: string): Edits => {
  const { [beatId]: _removed, ...tweaks } = edits.tweaks;
  return { ...edits, tweaks };
};

/** Hands one parameter of a beat back to the preset; no parameters left = no tweak. */
export const clearTweakParam = (edits: Edits, beatId: string, param: keyof Look): Edits => {
  const { [param]: _removed, ...rest } = edits.tweaks[beatId] ?? {};
  return Object.keys(rest).length ? { ...edits, tweaks: { ...edits.tweaks, [beatId]: rest } } : clearTweak(edits, beatId);
};

/** The ids of the beats that carry a tweak. */
export const tweakedBeats = (edits: Edits): string[] => Object.keys(edits.tweaks);
