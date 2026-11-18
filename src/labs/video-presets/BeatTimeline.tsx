// The edition's beats grouped by chapter, beside the player. The beat and word
// being spoken are highlighted from the voice timing; clicking a beat or a
// chapter seeks the player there.
//
// Styles live in beat-timeline.css (loaded with the editor chunk only), not in
// Tailwind utilities, so the site-wide stylesheet other pages share is untouched.
import React, { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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

  // One tab stop for the whole list (roving tabindex): Tab skips past its rows to the next
  // control, the arrows move inside it. The stop follows focus, and the playing beat while
  // focus is elsewhere, so tabbing in lands on what is on screen. Set on the DOM, not as a
  // prop, so the memoised rows do not re-render when it moves.
  const stop = useRef<HTMLButtonElement | null>(null);
  const setStop = (to: HTMLButtonElement | null | undefined) => {
    const list = scroller.current;
    if (!list || !to || (to === stop.current && to.tabIndex === 0)) return;
    for (const b of list.querySelectorAll("button")) b.tabIndex = b === to ? 0 : -1;
    stop.current = to;
  };
  const beatButton = (id: BeatId | undefined) =>
    id ? scroller.current?.querySelector<HTMLButtonElement>(`[data-beat-id="${id}"] .lab-tl-beat`) : null;
  // Rows can come and go (cut markers, tweak buttons): keep exactly one stop.
  useLayoutEffect(() => {
    const list = scroller.current;
    if (!list) return;
    const keep = stop.current && list.contains(stop.current) ? stop.current : null;
    stop.current = null;
    setStop(keep ?? beatButton(current?.id) ?? list.querySelector("button"));
  }, [sections, onInspect, renderCut]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLOListElement>) => {
    const list = scroller.current;
    const at = e.target as HTMLElement;
    if (!list || !(at instanceof HTMLButtonElement)) return;
    // Rows: chapters, beats and cuts; a beat's Tweak button is to its right.
    const rows = Array.from(list.querySelectorAll<HTMLButtonElement>("button:not(.lab-tl-tweak)"));
    const row = at.classList.contains("lab-tl-tweak") ? at.parentElement?.querySelector<HTMLButtonElement>(".lab-tl-beat") : at;
    const i = row ? rows.indexOf(row) : -1;
    let to: HTMLButtonElement | null | undefined;
    if (e.key === "ArrowDown") to = rows[Math.min(i + 1, rows.length - 1)];
    else if (e.key === "ArrowUp") to = rows[Math.max(i - 1, 0)];
    else if (e.key === "Home") to = rows[0];
    else if (e.key === "End") to = rows[rows.length - 1];
    else if (e.key === "ArrowRight") to = at.classList.contains("lab-tl-beat") ? at.parentElement?.querySelector<HTMLButtonElement>(".lab-tl-tweak") : null;
    else if (e.key === "ArrowLeft") to = row;
    else return;
    e.preventDefault();
    if (to && to !== at) to.focus();
  };

  // Keep the current beat in view inside the list (never scrolls the page).
  const currentId = current?.id;
  useEffect(() => {
    const list = scroller.current;
    if (list && !list.contains(document.activeElement)) setStop(beatButton(currentId));
    const row = currentId ? list?.querySelector<HTMLElement>(`[data-beat-id="${currentId}"]`) : null;
    if (!list || !row) return;
    const top = row.offsetTop; // the list is the rows' offsetParent (position: relative)
    const bottom = top + row.offsetHeight;
    if (top >= list.scrollTop && bottom <= list.scrollTop + list.clientHeight) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ top: Math.max(0, top - 8), behavior: smooth ? "smooth" : "auto" });
  }, [currentId]);

  return (
    <nav className="lab-tl" aria-label="Beats (up and down arrows move between rows, right arrow reaches Tweak)">
      <ol
        className="lab-tl-list"
        ref={scroller}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.target instanceof HTMLButtonElement && setStop(e.target)}
      >
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
