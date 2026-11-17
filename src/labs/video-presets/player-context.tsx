// Shares the player and its current frame with sibling UI (timeline, inspector).
import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { PlayerRef } from "@remotion/player";
import type { EditionTimeline, LabBeat, TimedWord } from "./timeline";

type LabPlayer = {
  playerRef: React.RefObject<PlayerRef | null>;
  timeline: EditionTimeline;
};

const LabPlayerContext = createContext<LabPlayer | null>(null);

export const LabPlayerProvider: React.FC<LabPlayer & { children: React.ReactNode }> = ({ children, ...value }) => (
  <LabPlayerContext.Provider value={value}>{children}</LabPlayerContext.Provider>
);

export const useLabPlayer = (): LabPlayer => {
  const ctx = useContext(LabPlayerContext);
  if (!ctx) throw new Error("useLabPlayer must be used inside <LabPlayerProvider>");
  return ctx;
};

/** The player's current frame; re-renders on every frame update and seek. */
export const usePlayerFrame = (): number => {
  const { playerRef } = useLabPlayer();
  const subscribe = useCallback(
    (onChange: () => void) => {
      const p = playerRef.current;
      if (!p) return () => {};
      p.addEventListener("frameupdate", onChange);
      p.addEventListener("seeked", onChange);
      return () => {
        p.removeEventListener("frameupdate", onChange);
        p.removeEventListener("seeked", onChange);
      };
    },
    [playerRef],
  );
  return useSyncExternalStore(
    subscribe,
    () => playerRef.current?.getCurrentFrame() ?? 0,
    () => 0,
  );
};

/** The beat and word on screen at `frame` (word is null between words). */
export const findAt = (timeline: EditionTimeline, frame: number): { beat: LabBeat | null; word: TimedWord | null } => {
  const beat = timeline.beats.find((b) => frame >= b.from && frame < b.to) ?? null;
  const word = beat?.words.find((w) => frame >= w.from && frame < w.to) ?? null;
  return { beat, word };
};
