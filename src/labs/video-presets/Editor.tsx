// The editor, loaded only once the Lab's island is visible (React + Remotion).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { LabComposition, type LabCompositionProps } from "./composition";
import { EDITION, edition78 } from "./edition";
import { BeatTimeline } from "./BeatTimeline";
import { LabPlayerProvider } from "./player-context";
import { LookPresets } from "./LookPresets";
import { Transitions, useCutMarkers, type CutTarget } from "./Transitions";
import { useLabEdits } from "./use-lab-edits";

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
  return (
    <LabPlayerProvider playerRef={playerRef} timeline={tl}>
      <div className="card-img rounded-md" style={{ overflow: "hidden" }}>
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
      <EditorTransitions lab={lab} />
    </LabPlayerProvider>
  );
};

// Transitions panel + the timeline with its cuts: they share the cut being edited.
const EditorTransitions: React.FC<{ lab: ReturnType<typeof useLabEdits> }> = ({ lab }) => {
  const [target, setTarget] = useState<CutTarget>(null);
  const renderCut = useCutMarkers(lab, target, setTarget);
  return (
    <>
      <Transitions lab={lab} target={target} onTarget={setTarget} />
      <BeatTimeline renderCut={renderCut} />
    </>
  );
};

export default Editor;
