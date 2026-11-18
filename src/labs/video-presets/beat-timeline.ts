// Pure lookups behind the beat timeline (no React, no Remotion).
import { isGraded } from "./edit-model";
import type { Cut, EditionTimeline, LabBeat, TimedWord } from "./timeline";

/** The beat and word on screen at `frame` (word is null between words). */
export const findAt = (timeline: EditionTimeline, frame: number): { beat: LabBeat | null; word: TimedWord | null } => {
  const beat = timeline.beats.find((b) => frame >= b.from && frame < b.to) ?? null;
  const word = beat?.words.find((w) => frame >= w.from && frame < w.to) ?? null;
  return { beat, word };
};

/** A titled group of beats in the timeline: the cold open, then one per chapter. */
export type Section = {
  /** Stable key: `cold-open` or `ch<chapterIndex>`. */
  key: string;
  title: string;
  chapterIndex: number | null;
  /** Frame where the section starts playing (what its button seeks to). */
  from: number;
  beats: LabBeat[];
};

export const outline = (timeline: EditionTimeline): Section[] => {
  const sections: Section[] = [];
  for (const beat of timeline.beats) {
    const last = sections.at(-1);
    if (last && last.chapterIndex === beat.chapterIndex) {
      last.beats.push(beat);
      continue;
    }
    const chapter = beat.chapterIndex === null ? null : timeline.chapters[beat.chapterIndex];
    sections.push({
      key: chapter ? `ch${beat.chapterIndex}` : "cold-open",
      title: chapter ? chapter.title : "Cold open",
      chapterIndex: beat.chapterIndex,
      from: chapter ? chapter.from : beat.from,
      beats: [beat],
    });
  }
  return sections;
};

/** The beat's text split around `word` (the word being spoken), for highlighting. */
export const splitAtWord = (beat: LabBeat, word: TimedWord | null): { before: string; word: string; after: string } =>
  word
    ? { before: beat.say.slice(0, word.start), word: beat.say.slice(word.start, word.end), after: beat.say.slice(word.end) }
    : { before: beat.say, word: "", after: "" };

/** `frame` as m:ss (rounded down), the way the player's time display reads. */
export const formatTime = (frame: number, fps: number): string => {
  const s = Math.floor(frame / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The first story change at or after `frame`, wrapping to the first one past the last. */
export const nextStoryChange = (timeline: EditionTimeline, frame: number): Cut | undefined => {
  const stories = timeline.cuts.filter((c) => c.storyChange);
  return stories.find((c) => c.at >= frame) ?? stories[0];
};

/** The beat on screen at `frame` if a look grades it (a photo, screenshot or clip), else null. */
export const tweakableBeatAt = (timeline: EditionTimeline, frame: number): LabBeat | null => {
  const { beat } = findAt(timeline, frame);
  return beat && isGraded(beat.visualKind) ? beat : null;
};

/** A graded beat's main still image (the first of a sequence), as the script references it. */
const stillOf = (beat: LabBeat): string | undefined => {
  if (!isGraded(beat.visualKind)) return undefined;
  const v = beat.visual as { image?: unknown; items?: { image?: unknown }[] };
  const ref = typeof v.image === "string" ? v.image : v.items?.map((i) => i.image).find((i) => typeof i === "string");
  return typeof ref === "string" && !ref.endsWith(".svg") ? ref : undefined;
};

/**
 * The photo on screen at `frame`, or the last one shown before it (the first
 * one before any): what a look's thumbnail shows its filter on.
 */
export const imageAt = (timeline: EditionTimeline, frame: number): string | undefined => {
  let last: string | undefined;
  for (const beat of timeline.beats) {
    if (beat.from > frame && last) break;
    last = stillOf(beat) ?? last;
  }
  return last;
};

/**
 * The story change "Try it" plays and the frame it starts from (a second before
 * the cut). One that played in the last two seconds counts as next, so trying
 * again right after a preview repeats it instead of skipping ahead. Story changes
 * with no beat ending on the cut (the one after the intro) are skipped.
 */
export const storyChangeToTry = (timeline: EditionTimeline, frame: number): { cut: Cut; from: number } | undefined => {
  // Only where the outgoing beat runs up to the cut: after the intro there is nothing for a transition to push out.
  const ends = new Map(timeline.beats.map((b) => [b.id, b.to]));
  const shown = { ...timeline, cuts: timeline.cuts.filter((c) => !c.storyChange || ends.get(c.fromBeat) === c.at) };
  const cut = nextStoryChange(shown.cuts.some((c) => c.storyChange) ? shown : timeline, Math.max(0, frame - 2 * timeline.fps));
  return cut && { cut, from: Math.max(0, cut.at - timeline.fps) };
};
