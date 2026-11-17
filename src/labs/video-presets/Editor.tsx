// The editor, loaded only once the Lab's island is visible (React + Remotion).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { LabComposition, type LabCompositionProps } from "./composition";
import { EDITION, edition78 } from "./edition";
import { BeatTimeline, type BeatTimelineProps } from "./BeatTimeline";
import { LabPlayerProvider } from "./player-context";
import { LookPresets } from "./LookPresets";
import { Transitions, useCutMarkers, type CutTarget } from "./Transitions";
import { BeatInspector } from "./BeatInspector";
import { tweakedBeats } from "./tweaks";
import { useLabEdits } from "./use-lab-edits";
import { seekForKey } from "./seek-keys";
import "./editor.css";

export type EditorProps = Record<string, never>;

export const Editor: React.FC<EditorProps> = () => {
  const playerRef = useRef<PlayerRef>(null);
  // Dev only: lets a browser console drive the player (`__labPlayer.seekTo(frame)`).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __labPlayer?: PlayerRef | null }).__labPlayer = playerRef.current;
  }, []);
  const tl = edition78;
  const lab = useLabEdits(tl);
  const inputProps: LabCompositionProps = useMemo(
    () => ({ edition: EDITION, report: tl.report, cuts: tl.cuts, effective: lab.effective }),
    [tl, lab.effective],
  );
  // The beat open in the per-beat inspector (#84). Opening it also seeks there.
  const [inspecting, setInspecting] = useState<string | null>(null);
  const tweaked = useMemo(() => new Set(tweakedBeats(lab.edits)), [lab.edits]);
  const openInspector = useCallback(
    (id: string) => {
      setInspecting(id);
      const beat = tl.beats.find((b) => b.id === id);
      if (beat) playerRef.current?.seekTo(beat.from);
    },
    [tl],
  );
  const closeInspector = useCallback(() => {
    const id = inspecting;
    setInspecting(null);
    // Hand focus back to the row's Tweak button.
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-beat-id="${id}"] .lab-tl-tweak`)?.focus());
  }, [inspecting]);
  // Remotion's scrubber takes no focus: keys pressed on the player's controls seek instead.
  const onPlayerKey = useCallback(
    (e: React.KeyboardEvent) => {
      const player = playerRef.current;
      if (!player || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return; // volume, rate
      const to = seekForKey(e.key, { frame: player.getCurrentFrame(), durationInFrames: tl.durationInFrames, fps: tl.fps, shift: e.shiftKey });
      if (to === null) return;
      e.preventDefault();
      player.seekTo(to);
    },
    [tl],
  );
  return (
    <LabPlayerProvider playerRef={playerRef} timeline={tl}>
      <div className="lab-editor">
        <div
          className="lab-frame lab-player card-img rounded-md"
          style={{ overflow: "hidden" }}
          role="group"
          aria-label="Video. On its controls, the arrow keys seek 5 seconds (1 with Shift); Home and End go to the start and the end."
          onKeyDown={onPlayerKey}
        >
          <Player
            ref={playerRef}
            component={LabComposition}
            inputProps={inputProps}
            durationInFrames={tl.durationInFrames}
            fps={tl.fps}
            compositionWidth={tl.width}
            compositionHeight={tl.height}
            controls
            clickToPlay
            acknowledgeRemotionLicense
            style={{ width: "100%", aspectRatio: `${tl.width} / ${tl.height}` }}
          />
        </div>
        <LookPresets lab={lab} />
        <EditorTransitions lab={lab} timeline={{ tweaked, inspecting, onInspect: openInspector }} />
        {inspecting && <BeatInspector lab={lab} beatId={inspecting} onClose={closeInspector} />}
      </div>
    </LabPlayerProvider>
  );
};

// Transitions panel + the timeline with its cuts: they share the cut being edited.
const EditorTransitions: React.FC<{ lab: ReturnType<typeof useLabEdits>; timeline: BeatTimelineProps }> = ({ lab, timeline }) => {
  const [target, setTarget] = useState<CutTarget>(null);
  const renderCut = useCutMarkers(lab, target, setTarget);
  return (
    <>
      <Transitions lab={lab} target={target} onTarget={setTarget} />
      <BeatTimeline {...timeline} renderCut={renderCut} />
    </>
  );
};

export default Editor;
