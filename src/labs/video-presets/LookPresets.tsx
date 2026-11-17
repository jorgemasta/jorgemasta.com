// Look presets: a strip of named colour treatments and an intensity control
// (Reset, for every edit, is the editor's). Each preset shows the photo on screen
// (or the last one shown) with its filter, so the strip reads at a glance. A tap,
// click or Enter applies it, and selecting the applied one again removes it. With
// a mouse, pointing at a preset previews it on the player; so does keyboard focus.
// The last card, Custom, is a look whose five values the visitor sets with sliders
// (collapsed under "Custom values"); it starts from the preset applied when picked.
//
// Styles live in looks.css (plain CSS, scoped by the `lab-looks` prefix) so the
// site's Tailwind build, shared by every page, does not change for the Lab.
import React, { useCallback, useState } from "react";
import { imageAt } from "./beat-timeline";
import {
  applyPreset,
  LOOK_PRESETS,
  lookToCssFilter,
  presetLook,
  presetName,
  setCustomLook,
  setIntensity,
  type Edits,
  type Look,
  type LookPresetId,
} from "./edit-model";
import { LOOK_PARAMS } from "./look-params";
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

  const [customOpen, setCustomOpen] = useState(false);
  const applied = edits.preset;
  // Only a look preview counts here (Try it on a transition previews other edits).
  const previewing = preview && preview.preset !== edits.preset ? preview.preset : null;
  const percent = Math.round(edits.intensity * 100);
  const status = previewing
    ? `Previewing ${presetName(previewing)}. Select it to apply.`
    : applied
      ? `${presetName(applied)} applied at ${percent}%.`
      : "The generated original.";
  // What the Custom card would apply now (it starts from the applied preset the first time).
  const customLook = presetLook(applyPreset(edits, "custom"), "custom");
  const cards: { id: LookPresetId; name: string; look: Look }[] = [
    ...LOOK_PRESETS,
    { id: "custom", name: "Custom", look: customLook },
  ];
  const pick = (id: LookPresetId) => {
    const off = edits.preset === id;
    commit(applyPreset(edits, off ? null : id));
    if (id === "custom") setCustomOpen(!off); // picking Custom is asking for its sliders
  };

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
        {cards.map((p) => (
          <button
            key={p.id}
            type="button"
            className="lab-looks__preset"
            aria-pressed={edits.preset === p.id}
            data-previewing={previewing === p.id || undefined}
            // Touch has no hover: a tap applies straight away, with no hidden press-and-hold preview.
            onPointerEnter={(e) => e.pointerType === "mouse" && startPreview(p.id)}
            onPointerLeave={(e) => e.pointerType === "mouse" && endPreview()}
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && startPreview(p.id)}
            onBlur={endPreview}
            onClick={() => pick(p.id)}
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
          {applied === "custom" && (
            <button
              type="button"
              className="lab-looks__disclosure"
              aria-expanded={customOpen}
              aria-controls="lab-looks-custom"
              onClick={() => setCustomOpen((o) => !o)}
            >
              {customOpen ? "Hide Custom values" : "Custom values"} <span aria-hidden="true">{customOpen ? "▴" : "▾"}</span>
            </button>
          )}
        </div>
      )}
      {applied === "custom" && customOpen && (
        <div id="lab-looks-custom" className="lab-looks__custom" role="group" aria-label="Custom values, for the whole video">
          {LOOK_PARAMS.map((p) => {
            const id = `lab-looks-custom-${p.key}`;
            const value = customLook[p.key];
            return (
              <div key={p.key} className="lab-looks__param">
                <label htmlFor={id}>{p.label}</label>
                <input
                  id={id}
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={value}
                  aria-valuetext={p.format(value)}
                  onChange={(e) => commit(setCustomLook(edits, { [p.key]: Number(e.currentTarget.value) }))}
                />
                <output htmlFor={id} className="lab-looks__value">
                  {p.format(value)}
                </output>
              </div>
            );
          })}
          <p className="lab-looks__note">Beats tweaked by hand keep the values set on them; the rest follow these.</p>
        </div>
      )}
    </section>
  );
};
