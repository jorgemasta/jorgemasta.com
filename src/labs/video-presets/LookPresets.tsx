// Look presets: a strip of named colour treatments and an intensity control
// (Reset, for every edit, is the editor's). Each preset shows the photo on screen
// (or the last one shown) with its filter, so the strip reads at a glance. A tap,
// click or Enter applies it, and selecting the applied one again removes it. With
// a mouse, pointing at a preset previews it on the player; so does keyboard focus.
//
// Styles live in looks.css (plain CSS, scoped by the `lab-looks` prefix) so the
// site's Tailwind build, shared by every page, does not change for the Lab.
import React, { useCallback } from "react";
import { imageAt } from "./beat-timeline";
import { applyPreset, LOOK_PRESETS, lookToCssFilter, setIntensity, type Edits, type LookPresetId } from "./edit-model";
import { EDITION } from "./edition";
import { imageSrc } from "./destilados-snapshot/src/beats/visuals";
import { isPending } from "./destilados-snapshot/src/media";
import { useLabPlayer, usePlayerValue } from "./player-context";
import type { LabEdits } from "./use-lab-edits";
import "./looks.css";

export type LookPresetsProps = { lab: LabEdits };

export const LookPresets: React.FC<LookPresetsProps> = ({ lab }) => {
  const { edits, setEdits, preview, setPreview } = lab;
  const { timeline } = useLabPlayer();
  const image = usePlayerValue(
    useCallback((frame: number) => imageAt(timeline, frame), [timeline]),
    imageAt(timeline, 0),
  );
  const src = image ? imageSrc(image, EDITION) : undefined;
  const thumb = src && !isPending(src) ? src : undefined;

  const startPreview = (id: LookPresetId) => setPreview(applyPreset(edits, id));
  const endPreview = () => setPreview(null);
  const commit = (next: Edits) => {
    setPreview(null);
    setEdits(next);
  };

  const applied = LOOK_PRESETS.find((p) => p.id === edits.preset);
  const previewing = preview && preview.preset !== edits.preset ? LOOK_PRESETS.find((p) => p.id === preview.preset) : undefined;
  const percent = Math.round(edits.intensity * 100);
  const status = previewing
    ? `Previewing ${previewing.name}. Select it to apply.`
    : applied
      ? `${applied.name} applied at ${percent}%.`
      : "The generated original.";

  return (
    <section className="lab-looks" aria-labelledby="lab-looks-title">
      <div className="lab-looks__head">
        <h2 id="lab-looks-title" className="lab-looks__title">
          Look
        </h2>
        <p className="lab-looks__status" aria-live="polite">
          {status}
        </p>
      </div>

      <div className="lab-looks__strip" role="group" aria-labelledby="lab-looks-title">
        {LOOK_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="lab-looks__preset"
            aria-pressed={edits.preset === p.id}
            data-previewing={previewing?.id === p.id || undefined}
            // Touch has no hover: a tap applies straight away, with no hidden press-and-hold preview.
            onPointerEnter={(e) => e.pointerType === "mouse" && startPreview(p.id)}
            onPointerLeave={(e) => e.pointerType === "mouse" && endPreview()}
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && startPreview(p.id)}
            onBlur={endPreview}
            onClick={() => commit(applyPreset(edits, edits.preset === p.id ? null : p.id))}
          >
            <span className="lab-looks__thumb" aria-hidden="true">
              {thumb ? (
                <img src={thumb} alt="" draggable={false} style={{ filter: lookToCssFilter(p.look) }} />
              ) : (
                <span className="lab-looks__swatch" style={{ filter: lookToCssFilter(p.look) }} />
              )}
            </span>
            <span className="lab-looks__name">{p.name}</span>
          </button>
        ))}
      </div>

      {applied && (
        <div className="lab-looks__controls">
          <label className="lab-looks__intensity">
            <span>Intensity</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent}
              aria-valuetext={`${percent}%`}
              onChange={(e) => commit(setIntensity(edits, Number(e.currentTarget.value) / 100))}
            />
            <output className="lab-looks__value">{percent}%</output>
          </label>
        </div>
      )}
    </section>
  );
};
