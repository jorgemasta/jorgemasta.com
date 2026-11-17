// Shares the player and its current frame with sibling UI (timeline, inspector).
import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { PlayerRef } from "@remotion/player";
import type { EditionTimeline } from "./timeline";

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

/**
 * A value derived from the player's current frame. Re-renders only when it
 * changes, so `select` must return a primitive or a stable object (a beat).
 */
export const usePlayerValue = <T,>(select: (frame: number) => T, serverValue: T): T => {
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
    () => select(playerRef.current?.getCurrentFrame() ?? 0),
    () => serverValue,
  );
};

const identity = (frame: number) => frame;

/** The player's current frame; re-renders on every frame update and seek. */
export const usePlayerFrame = (): number => usePlayerValue(identity, 0);
