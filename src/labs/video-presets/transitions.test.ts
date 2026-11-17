import { describe, expect, it } from "vitest";
import { hasMotion, TRANSITIONS } from "./transitions";

describe("hasMotion", () => {
  it("is false only for a dry cut, which has no duration, easing or direction", () => {
    expect(TRANSITIONS.filter((t) => !hasMotion(t.settings)).map((t) => t.id)).toEqual(["cut"]);
  });
});
