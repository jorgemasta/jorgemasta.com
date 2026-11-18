import { describe, expect, it } from "vitest";
import { resolveMedia } from "./media-path";

const media = new Map([
  ["editions/078/real/shot.png", "/_astro/shot.a1.png"],
  ["editions/078/real/photo.webp", "/_astro/photo.b2.webp"],
  ["editions/078/voice.en.mp3", "/_astro/voice.c3.mp3"],
]);

describe("resolveMedia: the built URL of a file the composition references", () => {
  it("returns the file vendored under the referenced name", () => {
    expect(resolveMedia("editions/078/real/shot.png", media)).toBe("/_astro/shot.a1.png");
    expect(resolveMedia("/editions/078/voice.en.mp3", media)).toBe("/_astro/voice.c3.mp3");
  });

  it("returns the lighter WebP copy of an image vendored in another format", () => {
    expect(resolveMedia("editions/078/real/photo.png", media)).toBe("/_astro/photo.b2.webp");
    expect(resolveMedia("editions/078/real/photo.jpg", media)).toBe("/_astro/photo.b2.webp");
  });

  it("returns nothing for a file that is not vendored", () => {
    expect(resolveMedia("editions/078/real/missing.png", media)).toBeUndefined();
    expect(resolveMedia("editions/078/voice.es.mp3", media)).toBeUndefined();
  });
});
