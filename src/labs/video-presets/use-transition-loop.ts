// The player side of the transition loop (transition-loop.ts plans it): plays a
// plan's runs muted, then pauses just after the transition and gives the sound
// back. Anything the visitor does to the player (play/pause, scrub, a seek from
// the timeline or the keys) cancels it; the loop tells its own seeks and pauses
// apart from theirs because Remotion dispatches those events synchronously.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { loopStep, type LoopPlan } from "./transition-loop";

export type LoopStatus = { run: number; repeats: number } | null;

export type LoopControls = {
  /** Plays `plan`, ending any loop already playing. */
  start: (plan: LoopPlan) => void;
  /** Ends the loop playing, if any. */
  stop: () => void;
};

export const useTransitionLoop = (playerRef: React.RefObject<PlayerRef | null>): { status: LoopStatus; controls: LoopControls } => {
  const [status, setStatus] = useState<LoopStatus>(null);
  /**
   * Ends the current loop: removes its listeners and, unless `keepSound`, gives
   * the sound back. Returns whether the visitor had it muted. Null when none plays.
   */
  const end = useRef<((keepSound?: boolean) => boolean) | null>(null);

  // Stop (the badge, Reset…) leaves the video paused where it is.
  const stop = useCallback(() => {
    if (!end.current) return;
    playerRef.current?.pause(); // its "pause" ends the loop
    end.current?.();
  }, [playerRef]);

  const start = useCallback(
    (plan: LoopPlan) => {
      const player = playerRef.current;
      // A loop replacing another keeps the visitor's sound setting from before the first:
      // the player still reports the replaced loop's mute until it re-renders.
      const replaced = end.current?.(true);
      if (!player) return;
      let run = 1;
      let own = false;
      /** Runs a player call whose events are the loop's, not the visitor's. */
      const ours = (fn: () => void) => {
        own = true;
        try {
          fn();
        } finally {
          own = false;
        }
      };
      let wasMuted = replaced ?? player.isMuted();

      const onFrame = (e: { detail: { frame: number } }) => {
        const step = loopStep(plan, run, e.detail.frame);
        if (step.kind === "again") {
          run = step.run;
          setStatus({ run, repeats: plan.repeats });
          ours(() => player.seekTo(step.seekTo));
        } else if (step.kind === "done") {
          ours(() => {
            player.pause();
            player.seekTo(step.seekTo);
          });
          finish();
        }
      };
      const onVisitor = () => {
        if (!own) finish();
      };
      // Unmuting during the loop is the visitor's call: keep the sound on afterwards.
      const onMute = (e: { detail: { isMuted: boolean } }) => {
        if (!e.detail.isMuted) wasMuted = false;
      };

      const finish = (keepSound = false): boolean => {
        if (end.current !== finish) return wasMuted;
        end.current = null;
        player.removeEventListener("frameupdate", onFrame);
        player.removeEventListener("seeked", onVisitor);
        player.removeEventListener("pause", onVisitor);
        player.removeEventListener("mutechange", onMute);
        if (!wasMuted && !keepSound) player.unmute();
        setStatus(null);
        return wasMuted;
      };
      end.current = finish;

      ours(() => {
        player.mute();
        player.pause();
        player.seekTo(plan.from);
      });
      player.addEventListener("frameupdate", onFrame);
      player.addEventListener("seeked", onVisitor);
      player.addEventListener("pause", onVisitor);
      player.addEventListener("mutechange", onMute);
      setStatus({ run, repeats: plan.repeats });
      ours(() => player.play());
    },
    [playerRef],
  );

  // A loop never outlives the editor.
  useEffect(() => stop, [stop]);

  const controls = useMemo(() => ({ start, stop }), [start, stop]);
  return { status, controls };
};
