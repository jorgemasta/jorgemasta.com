// Pure lookups behind the beat timeline (no React, no Remotion).
import type { EditionTimeline, LabBeat, TimedWord } from "./timeline";

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
