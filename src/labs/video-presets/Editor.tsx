// The editor, loaded only once the Lab's island is visible (React + Remotion).
import React, { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { LabComposition, type LabCompositionProps } from "./composition";
import { EDITION, edition78 } from "./edition";
import { LabPlayerProvider } from "./player-context";

export type EditorProps = Record<string, never>;

export const Editor: React.FC<EditorProps> = () => {
  const playerRef = useRef<PlayerRef>(null);
  // Dev only: lets a browser console drive the player (`__labPlayer.seekTo(frame)`).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __labPlayer?: PlayerRef | null }).__labPlayer = playerRef.current;
  }, []);
  const tl = edition78;
  const inputProps: LabCompositionProps = { edition: EDITION, report: tl.report };
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
    </LabPlayerProvider>
  );
};

export default Editor;
