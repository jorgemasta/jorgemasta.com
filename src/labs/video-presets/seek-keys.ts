// Keyboard seeking for the player. Remotion's scrubber takes no focus, so the
// editor maps keys pressed inside the player to a frame: arrows step 5 s (1 s
// with Shift), Home and End jump to the first and last frame.

import { clamp } from "./math";

export type SeekContext = { frame: number; durationInFrames: number; fps: number; shift: boolean };

/** The frame `key` seeks to, or null when the key is not a seek key. */
export const seekForKey = (key: string, { frame, durationInFrames, fps, shift }: SeekContext): number | null => {
  const last = durationInFrames - 1;
  const step = (shift ? 1 : 5) * fps;
  switch (key) {
    case "ArrowRight":
      return clamp(frame + step, 0, last);
    case "ArrowLeft":
      return clamp(frame - step, 0, last);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
};
