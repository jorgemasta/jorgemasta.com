// The whole video's theme (the renderer's six brand themes: second accent,
// background texture and story card style) and the motion of every photo.
// A tap applies; tapping the applied theme returns to the edition's own.
//
// Styles in theme-options.css (plain CSS, `lab-theme` prefix), loaded with the editor only.
import React from "react";
import { MOTIONS, setMotion, setTheme, type Motion, type ThemeName } from "./edit-model";
import { THEMES, PRESETS } from "./destilados-snapshot/src/themes";
import { MOTION_NAMES } from "./motion-names";
import { useLabPlayer } from "./player-context";
import type { LabEdits } from "./use-lab-edits";
import "./theme-options.css";

/** "amber-paper" → "Amber paper". */
export const themeLabel = (name: ThemeName) => {
  const words = name.replace("-", " ");
  return words[0].toUpperCase() + words.slice(1);
};

export const ThemeOptions: React.FC<{ lab: LabEdits }> = ({ lab }) => {
  const { timeline } = useLabPlayer();
  const { edits, setEdits, setPreview, effective } = lab;
  const own = timeline.theme;
  const current = edits.theme ?? own;
  const commit = (next: typeof edits) => {
    setPreview(null);
    setEdits(next);
  };
  const status =
    current === own
      ? `${themeLabel(current)}, the edition's own.`
      : `${themeLabel(current)}. The edition's own is ${themeLabel(own)}.`;
  const photos = Object.keys(effective.motions).length;

  return (
    <section className="lab-theme" aria-labelledby="lab-theme-title">
      <div className="lab-theme__head">
        <h2 id="lab-theme-title" className="lab-theme__title">
          Theme
        </h2>
        <p className="lab-theme__status" aria-live="polite">
          {status}
        </p>
      </div>
      <p className="lab-theme__hint">Sets the second accent, the background texture and the story card.</p>

      <div className="lab-theme__grid" role="group" aria-labelledby="lab-theme-title">
        {THEMES.map((name) => {
          const preset = PRESETS[name];
          return (
            <button
              key={name}
              type="button"
              className="lab-theme__option"
              aria-pressed={current === name}
              onClick={() => commit(setTheme(edits, current === name || name === own ? null : name))}
            >
              <span
                className="lab-theme__swatch"
                data-texture={preset.texture}
                style={{ "--lab-theme-accent": preset.accent2 } as React.CSSProperties}
                aria-hidden="true"
              />
              <span className="lab-theme__name">
                {themeLabel(name)}
                {name === own && <span className="lab-theme__own"> · original</span>}
              </span>
            </button>
          );
        })}
      </div>

      <label className="lab-theme__motion">
        <span>Photo motion</span>
        <select
          value={edits.motion ?? ""}
          aria-describedby="lab-theme-motion-hint"
          onChange={(e) => commit(setMotion(edits, (e.currentTarget.value || null) as Motion | null))}
        >
          <option value="">As scripted</option>
          {MOTIONS.map((m) => (
            <option key={m} value={m}>
              {MOTION_NAMES[m]}
            </option>
          ))}
        </select>
      </label>
      <p className="lab-theme__hint" id="lab-theme-motion-hint">
        For all {photos} photos. A photo given its own motion with Tweak keeps it.
      </p>
    </section>
  );
};
