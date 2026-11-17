// The edition's beats grouped by chapter, beside the player. The beat and word
// being spoken are highlighted from the voice timing; clicking a beat or a
// chapter seeks the player there.
//
// Styles live in beat-timeline.css (loaded with the editor chunk only), not in
// Tailwind utilities, so the site-wide stylesheet other pages share is untouched.
import React, { memo, useEffect, useMemo, useRef } from "react";
import { findAt, formatTime, outline, splitAtWord } from "./beat-timeline";
import { isGraded, type Motion } from "./edit-model";
import { MOTION_NAMES } from "./motion-names";
import { useLabPlayer, usePlayerFrame } from "./player-context";
import type { BeatId, Cut, LabBeat, TimedWord } from "./timeline";
import "./beat-timeline.css";

export type BeatTimelineProps = {
  /** Beats carrying a manual look tweak (marked on their row). */
  tweaked?: ReadonlySet<BeatId>;
  /** Photos given their own motion, by beat id (marked on their row). */
  moved?: Readonly<Record<BeatId, Motion>>;
  /** The beat open in the inspector, if any. */
  inspecting?: BeatId | null;
  /** Opens the inspector on a beat; without it, rows have no tweak button. */
  onInspect?: (beatId: BeatId) => void;
  /** Draws the cut into a beat, between its row and the previous one (transitions, #85). */
  renderCut?: (cut: Cut) => React.ReactNode;
};

const NONE: ReadonlySet<BeatId> = new Set();
const NO_MOTIONS: Readonly<Record<BeatId, Motion>> = {};

export const BeatTimeline: React.FC<BeatTimelineProps> = ({ tweaked = NONE, moved = NO_MOTIONS, inspecting = null, onInspect, renderCut }) => {
  const { playerRef, timeline } = useLabPlayer();
  const cutInto = useMemo(() => new Map(timeline.cuts.map((c) => [c.toBeat, c])), [timeline]);
  const frame = usePlayerFrame();
  const { beat: current, word } = findAt(timeline, frame);
  const sections = useMemo(() => outline(timeline), [timeline]);
  const scroller = useRef<HTMLOListElement>(null);

  const seek = (to: number) => playerRef.current?.seekTo(to);

  // Keep the current beat in view inside the list (never scrolls the page).
  const currentId = current?.id;
  useEffect(() => {
    const list = scroller.current;
    const row = currentId ? list?.querySelector<HTMLElement>(`[data-beat-id="${currentId}"]`) : null;
    if (!list || !row) return;
    const top = row.offsetTop; // the list is the rows' offsetParent (position: relative)
    const bottom = top + row.offsetHeight;
    if (top >= list.scrollTop && bottom <= list.scrollTop + list.clientHeight) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ top: Math.max(0, top - 8), behavior: smooth ? "smooth" : "auto" });
  }, [currentId]);

  return (
    <nav className="lab-tl" aria-label="Beats">
      <ol className="lab-tl-list" ref={scroller}>
        {sections.map((section) => {
          const live = current !== null && current.chapterIndex === section.chapterIndex;
          return (
            <li key={section.key} className="lab-tl-section">
              <button
                type="button"
                className="lab-tl-chapter"
                aria-current={live ? "true" : undefined}
                onClick={() => seek(section.from)}
              >
                <span className="lab-tl-chapter-title">{section.title}</span>
                <span className="lab-tl-time">{formatTime(section.from, timeline.fps)}</span>
              </button>
              <ol className="lab-tl-beats">
                {section.beats.map((beat) => {
                  const cut = renderCut && cutInto.get(beat.id);
                  return (
                    <React.Fragment key={beat.id}>
                      {cut && renderCut(cut)}
                      <BeatRow
                        beat={beat}
                        fps={timeline.fps}
                        current={beat.id === currentId}
                        word={beat.id === currentId ? word : null}
                        onSeek={seek}
                        tweaked={tweaked.has(beat.id)}
                        motion={moved[beat.id] ?? null}
                        inspecting={beat.id === inspecting}
                        onInspect={onInspect && isGraded(beat.visualKind) ? onInspect : undefined}
                      />
                    </React.Fragment>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

type BeatRowProps = {
  beat: LabBeat;
  fps: number;
  current: boolean;
  word: TimedWord | null;
  onSeek: (frame: number) => void;
  tweaked: boolean;
  /** The photo's own motion, if the visitor set one on this beat. */
  motion: Motion | null;
  inspecting: boolean;
  onInspect?: (beatId: BeatId) => void;
};

// Memoised: on each frame only the current row (whose word changes) re-renders.
const BeatRow = memo<BeatRowProps>(
  ({ beat, fps, current, word, onSeek, tweaked, motion, inspecting, onInspect }) => {
    const text = splitAtWord(beat, word);
    return (
      <li data-beat-id={beat.id} className="lab-tl-beat-row" data-tweaked={tweaked || motion !== null || undefined}>
        <button
          type="button"
          className="lab-tl-beat"
          aria-current={current ? "true" : undefined}
          onClick={() => onSeek(beat.from)}
        >
          <span className="lab-tl-meta">
            <span className="lab-tl-time">{formatTime(beat.from, fps)}</span>
            <span className="lab-tl-kind">{beat.visualKind}</span>
            {tweaked && <span className="lab-tl-tweaked">Tweaked</span>}
            {motion && <span className="lab-tl-tweaked">Motion: {MOTION_NAMES[motion].toLowerCase()}</span>}
          </span>
          <span className="lab-tl-say">
            {text.before}
            {text.word && <mark className="lab-tl-word">{text.word}</mark>}
            {text.after}
          </span>
        </button>
        {onInspect && (
          <button
            type="button"
            className="lab-tl-tweak"
            aria-expanded={inspecting}
            aria-label={`Tweak the beat at ${formatTime(beat.from, fps)}`}
            onClick={() => onInspect(beat.id)}
          >
            Tweak
          </button>
        )}
      </li>
    );
  },
  // onSeek is a fresh closure each render but always seeks the same player;
  // onInspect is stable (a state setter wrapper memoised by the editor).
  (a, b) =>
    a.beat === b.beat &&
    a.fps === b.fps &&
    a.current === b.current &&
    a.word === b.word &&
    a.tweaked === b.tweaked &&
    a.motion === b.motion &&
    a.inspecting === b.inspecting &&
    a.onInspect === b.onInspect,
);
