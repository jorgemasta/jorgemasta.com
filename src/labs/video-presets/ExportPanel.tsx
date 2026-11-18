// Export: the committed edits as two JSON documents (export.ts), each to copy or
// download. The preset is the reusable rules, for any edition; the edits are this
// video's full edit, what the renderer takes. Nothing is uploaded or stored.
//
// Styles live in export.css (plain CSS, `lab-export` prefix).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { hasEdits } from "./edit-model";
import { exportSummary, toEditionEdits, toPreset } from "./export";
import { useLabPlayer } from "./player-context";
import type { LabEdits } from "./use-lab-edits";
import "./export.css";

const asJson = (doc: unknown) => `${JSON.stringify(doc, null, 2)}\n`;

export const ExportPanel: React.FC<{ lab: LabEdits }> = ({ lab }) => {
  const { timeline } = useLabPlayer();
  const { edits } = lab;
  const preset = useMemo(() => asJson(toPreset(edits)), [edits]);
  const full = useMemo(() => asJson(toEditionEdits(edits, timeline)), [edits, timeline]);
  const summary = useMemo(() => exportSummary(edits), [edits]);
  const edition = String(timeline.report.edition).padStart(3, "0");
  return (
    <section className="lab-export" aria-labelledby="lab-export-title">
      <h2 id="lab-export-title" className="lab-export__title">
        Export
      </h2>
      <p className="lab-export__intro">Preset: reusable on any edition. Edits: this video, for the renderer.</p>
      <p className="lab-export__summary" aria-live="polite">
        <strong>Preset:</strong> {summary.preset}. <strong>Edits:</strong> {summary.edits}.
        {!hasEdits(edits) && " Nothing is edited yet, so both come out essentially empty."}
      </p>
      <div className="lab-export__docs">
        <ExportDoc id="preset" name="Preset" blurb="Look, theme, story changes, photo motion." json={preset} filename="video-presets-preset.json" />
        <ExportDoc
          id="edits"
          name="Edits"
          blurb="The preset, the fixes by beat and cut, and the renderer’s props."
          json={full}
          filename={`distilled-${edition}-edits.json`}
        />
      </div>
    </section>
  );
};

const ExportDoc: React.FC<{ id: string; name: string; blurb: string; json: string; filename: string }> = ({ id, name, blurb, json, filename }) => {
  // "copied" for a moment after a copy; "failed" leaves a selected textarea to copy by hand.
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const fallback = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (copy !== "copied") return;
    const t = setTimeout(() => setCopy("idle"), 2000);
    return () => clearTimeout(t);
  }, [copy]);
  useEffect(() => {
    if (copy === "failed") fallback.current?.select();
  }, [copy]);
  // A changed edit is a new document: a stale "Copied" would mislead.
  useEffect(() => setCopy((c) => (c === "copied" ? "idle" : c)), [json]);
  const onCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(json);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };
  const onDownload = () => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const lines = json.split("\n").length - 1;
  return (
    <div className="lab-export__doc" data-doc={id}>
      <div className="lab-export__head">
        <h3 className="lab-export__name">{name}</h3>
        <span className="lab-export__file">{filename}</span>
      </div>
      <p className="lab-export__blurb">{blurb}</p>
      <div className="lab-export__actions">
        <button type="button" className="lab-export__button" data-copied={copy === "copied" || undefined} onClick={onCopy}>
          {copy === "copied" ? "Copied" : "Copy JSON"}
        </button>
        <button type="button" className="lab-export__button" onClick={onDownload}>
          Download .json
        </button>
        <span className="lab-export__sr" role="status">
          {copy === "copied" ? `${name} JSON copied.` : ""}
        </span>
      </div>
      {copy === "failed" && (
        <div className="lab-export__fallback">
          <label className="lab-export__note" htmlFor={`lab-export-${id}-text`}>
            Couldn’t reach the clipboard. It’s selected below: copy it from there.
          </label>
          <textarea id={`lab-export-${id}-text`} ref={fallback} className="lab-export__code" readOnly value={json} rows={8} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
      <details className="lab-export__details">
        <summary className="lab-export__disclosure">Show JSON ({lines} lines)</summary>
        <pre className="lab-export__code" tabIndex={0} aria-label={`${name} JSON`}>
          {json}
        </pre>
      </details>
    </div>
  );
};
