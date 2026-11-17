// The per-beat inspector: the look parameters of one beat, set by hand, and a
// photo's motion (scripted, the default for all photos, or set on this beat). A
// parameter the visitor moves becomes theirs on that beat (marked, with a button
// to hand it back to the preset); the others keep following the preset. See
// tweaks.ts for the precedence.
//
// Styles in inspector.css (plain CSS, `lab-insp` prefix), loaded with the editor only.
import React, { useEffect, useRef } from "react";
import { effectiveEdition, hasMotion, NEUTRAL_LOOK, presetName, setBeatMotion, type Motion } from "./edit-model";
import { MOTION_NAMES, MOTION_OPTIONS } from "./motion-names";
import { formatTime } from "./beat-timeline";
import { LOOK_PARAMS } from "./look-params";
import { useLabPlayer } from "./player-context";
import { clearTweak, clearTweakParam, setTweak } from "./tweaks";
import type { LabEdits } from "./use-lab-edits";
import type { BeatId } from "./timeline";
import "./inspector.css";

const PARAMS = LOOK_PARAMS;

export type BeatInspectorProps = {
  lab: LabEdits;
  /** The beat being inspected. */
  beatId: BeatId;
  onClose: () => void;
};

export const BeatInspector: React.FC<BeatInspectorProps> = ({ lab, beatId, onClose }) => {
  const { timeline } = useLabPlayer();
  const { edits, setEdits, setPreview } = lab;
  const beat = timeline.beats.find((b) => b.id === beatId);
  const heading = useRef<HTMLHeadingElement>(null);

  // Opening (or switching beats) moves focus to the panel.
  useEffect(() => heading.current?.focus(), [beatId]);

  if (!beat) return null;
  const commit = (next: typeof edits) => {
    setPreview(null);
    setEdits(next);
  };
  const effective = effectiveEdition({ beats: [beat] }, edits);
  const look = effective.looks[beat.id] ?? NEUTRAL_LOOK;
  const motion = effective.motions[beat.id];
  // What the beat would do without its own motion: the default for all photos, else its script.
  const fallback = effectiveEdition({ beats: [beat] }, setBeatMotion(edits, beat.id, null)).motions[beat.id];
  const tweak = edits.tweaks[beat.id] ?? {};
  const touched = PARAMS.filter((p) => p.key in tweak);
  const follows = edits.preset ? `${presetName(edits.preset)} at ${Math.round(edits.intensity * 100)}%` : "the original";
  const status = touched.length
    ? `Set by hand: ${touched.map((p) => p.label.toLowerCase()).join(", ")}. The rest follows ${follows}.`
    : `Follows ${follows}. Move a control to set it by hand on this beat.`;

  return (
    <section
      className="lab-insp"
      aria-labelledby="lab-insp-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="lab-insp__head">
        <h3 id="lab-insp-title" className="lab-insp__title" tabIndex={-1} ref={heading}>
          Beat {beat.index + 1} <span className="lab-insp__time">{formatTime(beat.from, timeline.fps)}</span>
        </h3>
        <button type="button" className="lab-insp__close" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="lab-insp__say">{beat.say}</p>
      <p className="lab-insp__status" aria-live="polite">
        {status}
      </p>

      <div className="lab-insp__params">
        {PARAMS.map((p) => {
          const mine = p.key in tweak;
          const id = `lab-insp-${p.key}`;
          return (
            <div key={p.key} className="lab-insp__param" data-tweaked={mine || undefined}>
              <label htmlFor={id} className="lab-insp__label">
                {p.label}
                {mine && <span className="lab-insp__badge">by hand</span>}
              </label>
              <input
                id={id}
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={look[p.key]}
                aria-valuetext={p.format(look[p.key])}
                onChange={(e) => commit(setTweak(edits, beat.id, { [p.key]: Number(e.currentTarget.value) }))}
              />
              <output htmlFor={id} className="lab-insp__value">
                {p.format(look[p.key])}
              </output>
              <button
                type="button"
                className="lab-insp__revert"
                disabled={!mine}
                aria-label={`${p.label}: follow the preset`}
                title="Follow the preset"
                onClick={() => {
                  commit(clearTweakParam(edits, beat.id, p.key));
                  document.getElementById(id)?.focus(); // this button is disabled now
                }}
              >
                ↺
              </button>
            </div>
          );
        })}
      </div>

      {hasMotion(beat.visualKind) && motion && fallback && (
        <div className="lab-insp__motion" data-tweaked={motion.source === "override" || undefined}>
          <label htmlFor="lab-insp-motion" className="lab-insp__label">
            Motion
            {motion.source === "override" && <span className="lab-insp__badge">this beat</span>}
          </label>
          <select
            id="lab-insp-motion"
            value={motion.source === "override" ? motion.motion : ""}
            onChange={(e) => commit(setBeatMotion(edits, beat.id, (e.currentTarget.value || null) as Motion | null))}
          >
            <option value="">
              {MOTION_NAMES[fallback.motion]} ({fallback.source === "default" ? "all photos" : "as scripted"})
            </option>
            {MOTION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {MOTION_NAMES[m]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="lab-insp__actions">
        <button
          type="button"
          className="lab-insp__remove"
          disabled={!touched.length}
          onClick={() => {
            commit(clearTweak(edits, beat.id));
            heading.current?.focus(); // this button is disabled now
          }}
        >
          Remove look tweak
        </button>
      </div>
    </section>
  );
};
