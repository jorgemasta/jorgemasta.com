// Rebuilds the frame-timed timeline of an edition from its script and voice timing.
//
// The pipeline does this offline in `scripts/voice.mjs` and renders the result
// (`timeline.<lang>.json`), which is not in its repository. This is a pure port of
// that step, so the Lab needs only the vendored script and voice JSON.
import type { ScriptBeat, Timeline, Visual } from "./destilados-snapshot/src/types";
import { clamp } from "./math";

export type { ScriptBeat, Timeline, Visual };

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** Intro sting inserted after the cold open (3.5 s). */
export const INTRO_FRAMES = Math.round(3.5 * FPS);
/** Silence after the intro before the voice resumes. */
export const INTRO_GAP_FRAMES = Math.round(0.45 * FPS);
/** Hold after the last word. */
export const TAIL_FRAMES = Math.round(0.8 * FPS);
/** How many spoken words ahead the aligner looks for a script word. */
const LOOKAHEAD = 8;

export type Script = {
  edition: number;
  date: string;
  title: string;
  coldOpenBeats: number;
  coldOpenChapter?: string;
  theme?: string;
  beats: ScriptBeat[];
};

/** The voice provider's metadata: per-character timing of the raw (un-sped) audio. */
export type VoiceTiming = {
  tempo: number;
  raw: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }[];
};

/** A word of a beat's `say`, timed in video frames. */
export type TimedWord = {
  /** The word as written in the script (punctuation kept), for display. */
  text: string;
  /** Character offsets of the word inside the beat's `say`. */
  start: number;
  end: number;
  /** Video frames: the word is being spoken while `from <= frame < to`. */
  from: number;
  to: number;
};

/** A beat's stable id, `b<index>` (beats are never reordered or deleted in the Lab). Minted only here. */
export type BeatId = `b${number}`;
/** A cut's id: `<fromBeatId>-<toBeatId>`. */
export type CutId = `${BeatId}-${BeatId}`;

const beatId = (index: number): BeatId => `b${index}`;

export type LabBeat = {
  id: BeatId;
  index: number;
  say: string;
  /** Kind of visual (`image`, `gif`, `story`, …); look presets apply to image/clip-like kinds. */
  visualKind: Visual["type"];
  visual: Visual;
  /** Story chapter title, carried forward; undefined during the cold open. */
  chapter?: string;
  /** Index into `EditionTimeline.chapters`, or null for cold-open beats. */
  chapterIndex: number | null;
  coldOpen: boolean;
  /** Video frames: the beat is on screen while `from <= frame < to`. */
  from: number;
  to: number;
  words: TimedWord[];
};

export type Chapter = {
  title: string;
  /** First beat of the chapter, and its frame range. */
  firstBeat: number;
  from: number;
  to: number;
};

/** A cut between two consecutive beats (where a transition can sit later). */
export type Cut = {
  id: CutId;
  /** Frame where the incoming beat starts. */
  at: number;
  fromBeat: BeatId;
  toBeat: BeatId;
  /** Index of the incoming beat in `EditionTimeline.beats` (what "beat N" counts from). */
  toBeatIndex: number;
  /** True when the incoming beat starts a new story chapter. */
  storyChange: boolean;
};

export type EditionTimeline = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  introAtFrame: number;
  introFrames: number;
  introGapFrames: number;
  /** Seconds of (sped-up) voice audio where the cold open ends. */
  voiceSplitSec: number;
  beats: LabBeat[];
  chapters: Chapter[];
  cuts: Cut[];
  /** The same timing in the shape the vendored `Report` composition renders; its beats carry the ids above. */
  report: Timeline;
};

export type BuildOptions = {
  lang?: "en" | "es";
  /** Path of the voice audio as the composition references it. */
  audio?: string;
  /** Duration of the voice audio. Defaults to the end of the last spoken word. */
  voiceDurationSec?: number;
};

type SpokenWord = { key: string; start: number; end: number };

const normalise = (w: string) =>
  w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]/g, "");

const spokenWords = (voice: VoiceTiming): SpokenWord[] => {
  const words: { text: string; start: number; end: number }[] = [];
  let cur: { text: string; start: number; end: number } | null = null;
  for (const chunk of voice.raw) {
    chunk.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) {
        if (cur) words.push(cur);
        cur = null;
        return;
      }
      const start = chunk.character_start_times_seconds[i];
      const end = chunk.character_end_times_seconds[i];
      if (!cur) cur = { text: "", start, end };
      cur.text += ch;
      cur.end = end;
    });
  }
  if (cur) words.push(cur);
  return words
    .map((w) => ({ key: normalise(w.text), start: w.start / voice.tempo, end: w.end / voice.tempo }))
    .filter((w) => w.key);
};

/** Words of a beat's `say` with their character offsets; `[tags]` are not spoken. */
const scriptWords = (say: string) => {
  const out: { text: string; key: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  const clean = say.replace(/\[[^\]]*\]/g, (m) => " ".repeat(m.length));
  for (let m = re.exec(clean); m; m = re.exec(clean)) {
    const key = normalise(m[0]);
    if (key) out.push({ text: m[0], key, start: m.index, end: m.index + m[0].length });
  }
  return out;
};

const matches = (spoken: string, written: string) =>
  spoken === written || spoken.startsWith(written) || written.startsWith(spoken);

export function buildTimeline(script: Script, voice: VoiceTiming, opts: BuildOptions = {}): EditionTimeline {
  const spoken = spokenWords(voice);
  const lastWordEnd = spoken.length ? spoken[spoken.length - 1].end : 0;
  const voiceDuration = opts.voiceDurationSec ?? lastWordEnd;

  // 1. Greedy alignment of every script word to a spoken word (seconds of voice audio).
  let si = 0;
  const aligned = script.beats.map((beat) =>
    scriptWords(beat.say).map((w) => {
      for (let j = si; j < Math.min(si + LOOKAHEAD, spoken.length); j++) {
        if (matches(spoken[j].key, w.key)) {
          si = j + 1;
          return { ...w, startSec: spoken[j].start as number | null, endSec: spoken[j].end as number | null };
        }
      }
      return { ...w, startSec: null as number | null, endSec: null as number | null };
    }),
  );

  // 2. Beat start = first matched word; beat 0 starts at 0; unmatched beats are interpolated.
  const n = script.beats.length;
  const beatStart: (number | null)[] = aligned.map((ws) => ws.find((w) => w.startSec !== null)?.startSec ?? null);
  beatStart[0] = 0;
  const starts = fillGaps(beatStart, 0, voiceDuration);

  // 3. The intro is inserted in the pause between the cold open and the first story.
  const co = Math.min(script.coldOpenBeats, n);
  let introAtFrame: number;
  let voiceSplitSec: number;
  if (co > 0 && co < n) {
    const before = spoken.filter((w) => w.start < starts[co] - 0.01);
    const lastColdEnd = before.length ? before[before.length - 1].end : starts[co];
    voiceSplitSec = (lastColdEnd + starts[co]) / 2;
  } else {
    voiceSplitSec = co >= n ? voiceDuration : 0;
  }
  introAtFrame = Math.round(voiceSplitSec * FPS);
  const toVideo = (s: number) =>
    s < voiceSplitSec
      ? Math.round(s * FPS)
      : Math.round((s - voiceSplitSec) * FPS) + introAtFrame + INTRO_FRAMES + INTRO_GAP_FRAMES;
  const durationInFrames = toVideo(voiceDuration) + TAIL_FRAMES;

  // 4. Beat ranges; chapters carry forward after the cold open.
  const chapters: Chapter[] = [];
  let chapter: string | undefined;
  const beats: LabBeat[] = script.beats.map((beat, i) => {
    const coldOpen = i < co;
    const from = i === co ? introAtFrame + INTRO_FRAMES : toVideo(starts[i]);
    const to = i === co - 1 ? introAtFrame : i + 1 < n ? toVideo(starts[i + 1]) : durationInFrames;
    if (!coldOpen && beat.chapter && beat.chapter !== chapter) {
      chapter = beat.chapter;
      chapters.push({ title: chapter, firstBeat: i, from, to: from });
    }
    const words = timedWords(aligned[i], from, to, toVideo);
    return {
      id: beatId(i),
      index: i,
      say: beat.say,
      visualKind: beat.visual.type,
      visual: beat.visual,
      chapter: coldOpen ? undefined : chapter,
      chapterIndex: coldOpen || chapters.length === 0 ? null : chapters.length - 1,
      coldOpen,
      from,
      to,
      words,
    };
  });
  chapters.forEach((c, k) => {
    c.to = k + 1 < chapters.length ? chapters[k + 1].from : durationInFrames;
  });

  const cuts: Cut[] = beats.slice(1).map((b, k) => ({
    id: `${beats[k].id}-${b.id}`,
    at: b.from,
    fromBeat: beats[k].id,
    toBeat: b.id,
    toBeatIndex: b.index,
    storyChange: b.chapterIndex !== null && b.chapterIndex !== beats[k].chapterIndex,
  }));

  const report: Timeline = {
    edition: script.edition,
    lang: opts.lang ?? "en",
    date: script.date,
    title: script.title,
    coldOpenChapter: script.coldOpenChapter,
    audio: opts.audio ?? "",
    introAtFrame,
    introGapFrames: INTRO_GAP_FRAMES,
    voiceSplitSec,
    durationInFrames,
    theme: script.theme,
    beats: beats.map((b, i) => ({ ...script.beats[i], id: b.id, from: b.from, to: b.to, chapter: b.chapter })),
  };

  return {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames,
    introAtFrame,
    introFrames: INTRO_FRAMES,
    introGapFrames: INTRO_GAP_FRAMES,
    voiceSplitSec,
    beats,
    chapters,
    cuts,
    report,
  };
}

/**
 * `values` with every run of nulls spread evenly between its known neighbours.
 * A run at the start begins at `start` itself; a run at the end shares the gap up to `end`.
 */
function fillGaps(values: readonly (number | null)[], start: number, end: number): number[] {
  const out = [...values];
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== null) continue;
    let j = i;
    while (j < out.length && out[j] === null) j++;
    const prev = i > 0 ? (out[i - 1] as number) : start;
    const next = j < out.length ? (out[j] as number) : end;
    const offset = i > 0 ? 1 : 0;
    for (let k = i; k < j; k++) out[k] = prev + ((next - prev) * (k - i + offset)) / (j - i + 1);
  }
  return out as number[];
}

/** Words in video frames, clamped to the beat; unmatched words share the gap between matched neighbours. */
function timedWords(
  ws: { text: string; start: number; end: number; startSec: number | null; endSec: number | null }[],
  beatFrom: number,
  beatTo: number,
  toVideo: (s: number) => number,
): TimedWord[] {
  const inBeat = (s: number) => clamp(toVideo(s), beatFrom, beatTo);
  // Matched words are whole frames already, so rounding only moves the interpolated ones.
  const froms = fillGaps(
    ws.map((w) => (w.startSec === null ? null : inBeat(w.startSec))),
    beatFrom,
    beatTo,
  ).map(Math.round);
  return ws.map((w, i) => {
    const from = froms[i];
    const next = i + 1 < ws.length ? froms[i + 1] : beatTo;
    const spokenEnd = w.endSec === null ? next : inBeat(w.endSec);
    return { text: w.text, start: w.start, end: w.end, from, to: Math.max(from, Math.min(next, spokenEnd)) };
  });
}
