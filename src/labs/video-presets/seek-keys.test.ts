import { describe, expect, it } from "vitest";
import { seekForKey } from "./seek-keys";

// A 30 fps video of 300 frames (10 s): frames 0–299.
const at = (frame: number, shift = false) => ({ frame, durationInFrames: 300, fps: 30, shift });

describe("seekForKey: where a key moves the playhead", () => {
  it("steps five seconds with the arrow keys", () => {
    expect(seekForKey("ArrowRight", at(100))).toBe(250);
    expect(seekForKey("ArrowLeft", at(200))).toBe(50);
  });

  it("steps one second with Shift", () => {
    expect(seekForKey("ArrowRight", at(100, true))).toBe(130);
    expect(seekForKey("ArrowLeft", at(100, true))).toBe(70);
  });

  it("stops at the first and the last frame", () => {
    expect(seekForKey("ArrowLeft", at(40))).toBe(0);
    expect(seekForKey("ArrowRight", at(280))).toBe(299);
  });

  it("jumps to the start and the end with Home and End", () => {
    expect(seekForKey("Home", at(120))).toBe(0);
    expect(seekForKey("End", at(120))).toBe(299);
  });

  it("leaves every other key alone", () => {
    expect(seekForKey(" ", at(120))).toBeNull();
    expect(seekForKey("ArrowUp", at(120))).toBeNull();
    expect(seekForKey("a", at(120))).toBeNull();
  });
});
