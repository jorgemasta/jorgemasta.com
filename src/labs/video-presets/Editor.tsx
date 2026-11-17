// The editor, loaded only once the Lab's island is visible (React + Remotion).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { LabComposition, type LabCompositionProps } from "./composition";
import { EDITION, edition78 } from "./edition";
import { BeatTimeline, type BeatTimelineProps } from "./BeatTimeline";
import { LabPlayerProvider, useLabPlayer, usePlayerValue } from "./player-context";
import { LookPresets } from "./LookPresets";
import { Transitions, useCutMarkers, type CutTarget } from "./Transitions";
import { BeatInspector } from "./BeatInspector";
import { ThemeOptions } from "./ThemeOptions";
import { findAt, formatTime, tweakableBeatAt } from "./beat-timeline";
import { hasEdits, reset } from "./edit-model";
import type { BeatId } from "./timeline";
import { tweakedBeats } from "./tweaks";
import { useLabEdits, type LabEdits } from "./use-lab-edits";
import { seekForKey } from "./seek-keys";
import { useTransitionLoop, type LoopControls, type LoopStatus } from "./use-transition-loop";
import "./editor.css";

export const Editor: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  // Dev only: lets a browser console drive the player (`__labPlayer.seekTo(frame)`).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __labPlayer?: PlayerRef | null }).__labPlayer = playerRef.current;
  }, []);
  const timeline = edition78;
  const lab = useLabEdits(timeline);
  const loop = useTransitionLoop(playerRef);
  const inputProps: LabCompositionProps = useMemo(
    () => ({ edition: EDITION, report: timeline.report, cuts: timeline.cuts, effective: lab.effective }),
    [timeline, lab.effective],
  );
  // The beat open in the per-beat inspector (#84), and what opened it: a timeline row's
  // Tweak (tablet and up; also seeks there) or, on phones, "Tweak this beat" for the
  // beat on screen (pauses there, so the beat stays put while it is tweaked).
  const [inspecting, setInspecting] = useState<{ id: BeatId; from: "timeline" | "now" } | null>(null);
  const tweaked = useMemo(() => new Set(tweakedBeats(lab.edits)), [lab.edits]);
  // Photos given their own motion (committed edits; marked on the timeline).
  const moved = lab.edits.beatMotions;
  const openFromTimeline = useCallback(
    (id: BeatId) => {
      setInspecting({ id, from: "timeline" });
      const beat = timeline.beats.find((b) => b.id === id);
      if (beat) playerRef.current?.seekTo(beat.from);
    },
    [timeline],
  );
  const openFromNow = useCallback((id: BeatId) => {
    playerRef.current?.pause();
    setInspecting({ id, from: "now" });
  }, []);
  const closeInspector = useCallback(() => {
    const was = inspecting;
    setInspecting(null);
    // Hand focus back to the button that opened it.
    if (!was) return;
    const opener = was.from === "now" ? ".lab-now__tweak" : `[data-beat-id="${was.id}"] .lab-tl-tweak`;
    requestAnimationFrame(() => document.querySelector<HTMLElement>(opener)?.focus());
  }, [inspecting]);
  const inspector = (from: "timeline" | "now") =>
    inspecting?.from === from && <BeatInspector lab={lab} beatId={inspecting.id} onClose={closeInspector} />;
  // Remotion's scrubber takes no focus: keys pressed on the player's controls seek instead.
  const onPlayerKey = useCallback(
    (e: React.KeyboardEvent) => {
      const player = playerRef.current;
      if (!player || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return; // volume, rate
      const to = seekForKey(e.key, { frame: player.getCurrentFrame(), durationInFrames: timeline.durationInFrames, fps: timeline.fps, shift: e.shiftKey });
      if (to === null) return;
      e.preventDefault();
      player.seekTo(to);
    },
    [timeline],
  );
  return (
    <LabPlayerProvider playerRef={playerRef} timeline={timeline} loop={loop.controls}>
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
            durationInFrames={timeline.durationInFrames}
            fps={timeline.fps}
            compositionWidth={timeline.width}
            compositionHeight={timeline.height}
            controls
            clickToPlay
            acknowledgeRemotionLicense
            style={{ width: "100%", aspectRatio: `${timeline.width} / ${timeline.height}` }}
          />
          <LoopBadge status={loop.status} onStop={loop.controls.stop} />
        </div>
        <ResetBar lab={lab} loop={loop.controls} />
        <LookPresets lab={lab} />
        <NowTweak tweaked={tweaked} moved={moved} open={inspecting?.from === "now"} onOpen={openFromNow}>
          {inspector("now")}
        </NowTweak>
        <ThemeOptions lab={lab} />
        <EditorTransitions
          lab={lab}
          timeline={{ tweaked, moved, inspecting: inspecting?.from === "timeline" ? inspecting.id : null, onInspect: openFromTimeline }}
        />
        <div className="lab-editor__timeline-insp">{inspector("timeline")}</div>
      </div>
    </LabPlayerProvider>
  );
};

// One Reset for every edit: looks, per-beat tweaks, theme, motions, story cards and transitions go back to the generated original.
const ResetBar: React.FC<{ lab: LabEdits; loop: LoopControls }> = ({ lab, loop }) => {
  const { edits, setEdits, setPreview } = lab;
  const edited = hasEdits(edits);
  return (
    <div className="lab-editor__bar">
      <p id="lab-reset-hint">{edited ? "Your edits play on the video above." : "The generated original, unedited."}</p>
      <button
        type="button"
        className="lab-editor__reset"
        aria-describedby="lab-reset-hint"
        disabled={!edited}
        onClick={() => {
          loop.stop();
          setPreview(null);
          setEdits(reset());
        }}
      >
        Reset all edits
      </button>
    </div>
  );
};

// Over the video's top corner (sticky with it on phones) while a pick replays: "Replaying 2/3", and a way to stop it.
const LoopBadge: React.FC<{ status: LoopStatus; onStop: () => void }> = ({ status, onStop }) => (
  <p className="lab-loop" role="status">
    {status && status.repeats > 1 && (
      <>
        <span className="lab-loop__text">
          Replaying {status.run}/{status.repeats}
          <span className="lab-loop__muted">, muted</span>
        </span>
        <button type="button" className="lab-loop__stop" onClick={onStop} aria-label="Stop replaying">
          Stop
        </button>
      </>
    )}
  </p>
);

/** The beat's line without the voice's stage tags (`[curious]`). */
const spoken = (say: string) => say.replace(/\[[^\]]*\]\s*/g, "").trim();

// Phones only (the timeline is hidden there): tweak the beat on screen. The button names the beat
// and says "Tweaked" when it carries a tweak; the inspector opens right under it.
const NowTweak: React.FC<{
  tweaked: ReadonlySet<string>;
  moved: Readonly<Record<string, unknown>>;
  open: boolean;
  onOpen: (id: BeatId) => void;
  children: React.ReactNode;
}> = ({ tweaked, moved, open, onOpen, children }) => {
  const { timeline } = useLabPlayer();
  const beat = usePlayerValue(
    useCallback((frame: number) => findAt(timeline, frame).beat, [timeline]),
    timeline.beats[0] ?? null,
  );
  const tweakable = beat !== null && tweakableBeatAt(timeline, beat.from) === beat;
  const isTweaked = beat !== null && (tweaked.has(beat.id) || beat.id in moved);
  return (
    <section className="lab-now" aria-label="This beat">
      <div className="lab-now__row">
        <p className="lab-now__beat" id="lab-now-beat">
          {beat ? (
            <>
              <span className="lab-now__num">
                Beat {beat.index + 1} · {formatTime(beat.from, timeline.fps)}
              </span>{" "}
              {tweakable ? spoken(beat.say) : "Nothing to tweak: no photo on this beat."}
            </>
          ) : (
            "The intro: nothing to tweak."
          )}
        </p>
        <button
          type="button"
          className="lab-now__tweak"
          aria-describedby="lab-now-beat"
          aria-expanded={open}
          data-tweaked={isTweaked || undefined}
          disabled={!tweakable}
          onClick={() => beat && onOpen(beat.id)}
        >
          {isTweaked ? "Tweaked" : "Tweak this beat"}
        </button>
      </div>
      {children}
    </section>
  );
};

// Transitions panel + the timeline with its cuts: they share the cut being edited.
const EditorTransitions: React.FC<{ lab: LabEdits; timeline: BeatTimelineProps }> = ({ lab, timeline }) => {
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
