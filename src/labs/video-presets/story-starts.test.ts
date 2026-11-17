import { describe, expect, it } from "vitest";
import { storyStarts } from "./destilados-snapshot/src/Report";
import type { Timeline, TimedBeat } from "./destilados-snapshot/src/types";

const beat = (id: string, from: number, to: number, chapter?: string) =>
  ({ id, from, to, chapter, say: "", visual: { type: "title" } }) as unknown as TimedBeat;

describe("storyStarts (LAB PATCH): the first beat of every story, by the Lab's id", () => {
  it("names the beat that starts the story even when a zero-length beat shares its frame", () => {
    const tl = {
      introAtFrame: 10,
      beats: [beat("b0", 0, 10), beat("b1", 20, 20, "Intro"), beat("b2", 20, 40, "Story")],
    } as unknown as Timeline;
    expect(storyStarts(tl).map((s) => [s.id, s.chapter])).toEqual([
      ["b1", "Intro"],
      ["b2", "Story"],
    ]);
  });
});
