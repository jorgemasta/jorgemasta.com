// The edition's beats grouped by chapter, beside the player. The beat and word
// being spoken are highlighted from the voice timing; clicking a beat or a
// chapter seeks the player there.
//
// Styles live in beat-timeline.css (loaded with the editor chunk only), not in
// Tailwind utilities, so the site-wide stylesheet other pages share is untouched.
import React, { memo, useEffect, useMemo, useRef } from "react";
import { findAt, formatTime, outline, splitAtWord } from "./beat-timeline";
import { useLabPlayer, usePlayerFrame } from "./player-context";
import type { Cut, LabBeat, TimedWord } from "./timeline";
import "./beat-timeline.css";

export type BeatTimelineProps = {
  /** Draws the cut into a beat, between its row and the previous one (transitions, #85). */
  renderCut?: (cut: Cut) => React.ReactNode;
};

export const BeatTimeline: React.FC<BeatTimelineProps> = ({ renderCut }) => {
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
};

// Memoised: on each frame only the current row (whose word changes) re-renders.
const BeatRow = memo<BeatRowProps>(
  ({ beat, fps, current, word, onSeek }) => {
    const text = splitAtWord(beat, word);
    return (
      <li data-beat-id={beat.id} className="lab-tl-beat-row">
        <button
          type="button"
          className="lab-tl-beat"
          aria-current={current ? "true" : undefined}
          onClick={() => onSeek(beat.from)}
        >
          <span className="lab-tl-meta">
            <span className="lab-tl-time">{formatTime(beat.from, fps)}</span>
            <span className="lab-tl-kind">{beat.visualKind}</span>
          </span>
          <span className="lab-tl-say">
            {text.before}
            {text.word && <mark className="lab-tl-word">{text.word}</mark>}
            {text.after}
          </span>
        </button>
      </li>
    );
  },
  // onSeek is a fresh closure each render but always seeks the same player.
  (a, b) => a.beat === b.beat && a.fps === b.fps && a.current === b.current && a.word === b.word,
);
