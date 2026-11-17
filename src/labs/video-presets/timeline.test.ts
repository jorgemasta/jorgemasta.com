import { describe, expect, it } from "vitest";
import script from "./destilados-snapshot/editions/078/script.en.json";
import voice from "./destilados-snapshot/editions/078/voice.en.json";
import { buildTimeline, type Script, type VoiceTiming } from "./timeline";

const edition78 = () => buildTimeline(script as Script, voice as VoiceTiming);

describe("buildTimeline on edition 78 (English)", () => {
  // Expected values: the published video is 2:51, its chapters sit at
  // 0:28 / 1:09 / 1:41 / 2:05 / 2:28 (youtube.en.md), and these frame ranges
  // were measured with an independent port of the pipeline's voice.mjs.
  it("places every beat on the published frames", () => {
    const tl = edition78();
    expect(tl.durationInFrames).toBe(5122);
    expect(tl.introAtFrame).toBe(754);
    expect(tl.beats.map((b) => `${b.from}-${b.to}`).join(" ")).toBe(
      "0-177 177-349 349-488 488-607 607-754 859-1050 1050-1239 1239-1414 1414-1592 1592-1763 1763-1927 1927-2081 2081-2218 2218-2335 2335-2423 2423-2571 2571-2760 2760-2942 2942-3047 3047-3207 3207-3404 3404-3595 3595-3769 3769-3900 3900-4092 4092-4337 4337-4449 4449-4579 4579-4725 4725-4819 4819-5000 5000-5122",
    );
  });

  it("has one chapter per story, at the published YouTube chapter times", () => {
    const tl = edition78();
    const mmss = (f: number) => {
      const s = Math.floor(f / 30);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    };
    expect(tl.chapters.map((c) => `${mmss(c.from)} ${c.title}`)).toEqual([
      "0:28 Muse Spaces",
      "1:09 Cult.fit + Codex",
      "1:41 BioBasicsBench",
      "2:05 Axiom · Lean",
      "2:28 Perplexity Max",
    ]);
    expect(tl.beats.slice(0, 5).every((b) => b.coldOpen && b.chapterIndex === null)).toBe(true);
    expect(tl.beats[11]).toMatchObject({ chapter: "Muse Spaces", chapterIndex: 0 });
    expect(tl.chapters.at(-1)?.to).toBe(5122);
  });

  it("times all 477 spoken words, in order, inside their beat", () => {
    const tl = edition78();
    const words = tl.beats.flatMap((b) => b.words.map((w) => ({ ...w, beat: b })));
    expect(words).toHaveLength(477);
    expect(words.every((w) => w.from >= w.beat.from && w.to <= w.beat.to && w.from <= w.to)).toBe(true);
    expect(words.every((w, i) => i === 0 || w.from >= words[i - 1].from)).toBe(true);
    expect(tl.beats[0].words[0]).toMatchObject({ text: "Describe", from: 0 });
  });
});

// A worked example small enough to compute by hand. Voice at tempo 2: raw
// times are twice the times heard in the sped-up audio.
const tinyScript: Script = {
  edition: 1,
  date: "2026-11-07",
  title: "Tiny",
  coldOpenBeats: 1,
  beats: [
    { say: "Hi there.", visual: { type: "title", text: "Hi" } },
    { say: "Big news!", chapter: "Story", visual: { type: "image", image: "real:a.png" } },
  ],
};
const timed = (text: string, startEnd: [number, number][]) => ({
  characters: [...text],
  character_start_times_seconds: startEnd.map(([s]) => s * 2),
  character_end_times_seconds: startEnd.map(([, e]) => e * 2),
});
// Heard: Hi 0–0.5 s, there. 0.5–1 s, (pause), Big 2–2.5 s, news! 2.5–3 s.
const spread = (n: number, from: number, to: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => [from + ((to - from) * i) / n, from + ((to - from) * (i + 1)) / n]);
const tinyVoice: VoiceTiming = {
  tempo: 2,
  raw: [
    timed("Hi there. ", [...spread(2, 0, 0.5), [0.5, 0.5], ...spread(6, 0.5, 1), [1, 2]]),
    timed("Big news!", [...spread(3, 2, 2.5), [2.5, 2.5], ...spread(5, 2.5, 3)]),
  ],
};

describe("buildTimeline on a hand-worked example", () => {
  // Split = midpoint of 1 s and 2 s = 1.5 s → intro at frame 45, voice resumes
  // at 45 + 105 + 14 = 164. 2 s → 164 + 15 = 179; 3 s → 209; + 24 tail = 233.
  const tl = buildTimeline(tinyScript, tinyVoice);

  it("inserts the intro between the cold open and the first story", () => {
    expect(tl.introAtFrame).toBe(45);
    expect(tl.durationInFrames).toBe(233);
    expect(tl.beats.map((b) => [b.id, b.from, b.to])).toEqual([
      ["b0", 0, 45],
      ["b1", 150, 233],
    ]);
  });

  it("times every word of a beat in video frames, with its place in the text", () => {
    expect(tl.beats[0].words).toEqual([
      { text: "Hi", start: 0, end: 2, from: 0, to: 15 },
      { text: "there.", start: 3, end: 9, from: 15, to: 30 },
    ]);
    expect(tl.beats[1].words).toEqual([
      { text: "Big", start: 0, end: 3, from: 179, to: 194 },
      { text: "news!", start: 4, end: 9, from: 194, to: 209 },
    ]);
  });

  it("lists the cuts between beats and marks story changes", () => {
    expect(tl.cuts).toEqual([{ id: "b0-b1", at: 150, fromBeat: "b0", toBeat: "b1", storyChange: true }]);
  });

  it("describes each beat's visual kind", () => {
    expect(tl.beats.map((b) => b.visualKind)).toEqual(["title", "image"]);
  });

  it("uses the real audio duration when it is known", () => {
    expect(buildTimeline(tinyScript, tinyVoice, { voiceDurationSec: 4 }).durationInFrames).toBe(263);
  });
});
