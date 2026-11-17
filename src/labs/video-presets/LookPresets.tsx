// Look presets: a strip of named colour treatments, an intensity control and
// Reset. Pointing at a preset (mouse over it, keyboard focus on it, or a press
// and hold on touch) previews it on the player; a click or Enter applies it.
//
// Styles live in looks.css (plain CSS, scoped by the `lab-looks` prefix) so the
// site's Tailwind build, shared by every page, does not change for the Lab.
import React, { useRef } from "react";
import { applyPreset, LOOK_PRESETS, lookToCssFilter, reset, setIntensity, type LookPresetId } from "./edit-model";
import type { LabEdits } from "./use-lab-edits";
import "./looks.css";

const HOLD_MS = 250;

export type LookPresetsProps = { lab: LabEdits };

export const LookPresets: React.FC<LookPresetsProps> = ({ lab }) => {
  const { edits, setEdits, preview, setPreview } = lab;
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);

  const startPreview = (id: LookPresetId) => setPreview(applyPreset(edits, id));
  const endPreview = () => setPreview(null);
  const commit = (next: typeof edits) => {
    setPreview(null);
    setEdits(next);
  };

  const applied = LOOK_PRESETS.find((p) => p.id === edits.preset);
  const previewing = preview && preview.preset !== edits.preset ? LOOK_PRESETS.find((p) => p.id === preview.preset) : undefined;
  const percent = Math.round(edits.intensity * 100);
  const status = previewing
    ? `Previewing ${previewing.name}. Click or press Enter to apply.`
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
            onPointerEnter={(e) => e.pointerType === "mouse" && startPreview(p.id)}
            onPointerLeave={(e) => {
              window.clearTimeout(holdTimer.current);
              if (e.pointerType === "mouse" || held.current) endPreview();
            }}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse") return;
              held.current = false;
              holdTimer.current = window.setTimeout(() => {
                held.current = true;
                startPreview(p.id);
              }, HOLD_MS);
            }}
            onPointerUp={() => {
              window.clearTimeout(holdTimer.current);
              if (held.current) endPreview();
            }}
            onPointerCancel={() => {
              window.clearTimeout(holdTimer.current);
              held.current = false;
              endPreview();
            }}
            onContextMenu={(e) => e.preventDefault()}
            onFocus={() => startPreview(p.id)}
            onBlur={endPreview}
            onClick={() => {
              // A press and hold only previews; letting go doesn't apply it.
              if (held.current) {
                held.current = false;
                return;
              }
              commit(applyPreset(edits, p.id));
            }}
          >
            <span className="lab-looks__swatch" style={{ filter: lookToCssFilter(p.look) }} aria-hidden="true" />
            <span className="lab-looks__name">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="lab-looks__controls">
        <label className="lab-looks__intensity">
          <span>Intensity</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={percent}
            disabled={!applied}
            onChange={(e) => commit(setIntensity(edits, Number(e.currentTarget.value) / 100))}
          />
          <output className="lab-looks__value">{applied ? `${percent}%` : "–"}</output>
        </label>
        <button
          type="button"
          className="lab-looks__reset"
          onClick={() => commit(reset(edits))}
        >
          Reset
        </button>
      </div>
    </section>
  );
};
