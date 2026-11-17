// The per-beat inspector: the look parameters of one beat, set by hand. A
// parameter the visitor moves becomes theirs on that beat (marked, with a button
// to hand it back to the preset); the others keep following the preset. See
// tweaks.ts for the precedence.
//
// Styles in inspector.css (plain CSS, `lab-insp` prefix), loaded with the editor only.
import React, { useEffect, useRef } from "react";
import { effectiveEdition, LOOK_PRESETS, NEUTRAL_LOOK, type Look } from "./edit-model";
import { formatTime } from "./beat-timeline";
import { useLabPlayer } from "./player-context";
import { clearTweak, clearTweakParam, setTweak } from "./tweaks";
import type { LabEdits } from "./use-lab-edits";
import "./inspector.css";

type Param = { key: keyof Look; label: string; min: number; max: number; step: number; format: (v: number) => string };

const PARAMS: readonly Param[] = [
  { key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "contrast", label: "Contrast", min: 0.5, max: 1.5, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "brightness", label: "Brightness", min: 0.5, max: 1.5, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "warmth", label: "Warmth", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "hue", label: "Hue", min: -45, max: 45, step: 1, format: (v) => `${Math.round(v)}°` },
];

export type BeatInspectorProps = {
  lab: LabEdits;
  /** The beat being inspected. */
  beatId: string;
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
  const look = effectiveEdition({ beats: [beat] }, edits).looks[beat.id] ?? NEUTRAL_LOOK;
  const tweak = edits.tweaks[beat.id] ?? {};
  const touched = PARAMS.filter((p) => p.key in tweak);
  const preset = LOOK_PRESETS.find((p) => p.id === edits.preset);
  const follows = preset ? `${preset.name} at ${Math.round(edits.intensity * 100)}%` : "the original";
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
          Beat look <span className="lab-insp__time">{formatTime(beat.from, timeline.fps)}</span>
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
          Remove tweak
        </button>
      </div>
    </section>
  );
};
