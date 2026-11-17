// Transitions: a small library (cut, whip, slide, zoom), each a named set of
// settings the visitor can open and adjust. A transition is applied either as
// the default for every story change or to one cut picked on the timeline,
// where overrides show. "Preview" plays the draft on the video around the cut
// without committing it; with reduced motion it holds a still mid-transition.
//
// Styles live in transitions.css (plain CSS, `lab-tx` prefix), not Tailwind,
// so the stylesheet every page shares does not change for the Lab.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "./beat-timeline";
import { effectiveEdition, setCutTransition, setDefaultTransition, type EffectiveTransition, type Edits } from "./edit-model";
import { useLabPlayer } from "./player-context";
import type { Cut, EditionTimeline } from "./timeline";
import {
  adjustTransition,
  cssEasing,
  DIRECTIONS,
  EASINGS,
  MAX_FRAMES,
  MIN_FRAMES,
  poseAt,
  poseStyle,
  sameTransition,
  transitionPreset,
  TRANSITIONS,
  type Transition,
  type TransitionKind,
} from "./transitions";
import type { LabEdits } from "./use-lab-edits";
import "./transitions.css";

/** What a transition is applied to: every story change, or one cut (by id). */
export type CutTarget = string | null;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const EASING_NAMES: Record<string, string> = {
  linear: "Linear",
  "ease-in": "Ease in",
  "ease-out": "Ease out",
  "ease-in-out": "Ease in-out",
  overshoot: "Overshoot",
};
const DIRECTION_NAMES: Record<string, string> = {
  left: "From the left",
  right: "From the right",
  up: "From the top",
  down: "From the bottom",
  in: "Zoom in",
  out: "Zoom out",
};

const seconds = (frames: number, fps: number) => `${(frames / fps).toFixed(2).replace(/0$/, "")} s`;

const describe = (t: Transition, fps: number) =>
  t.kind === "cut" ? "Cut" : `${transitionPreset(t.kind).name}, ${seconds(t.durationFrames, fps)}`;

const beatNumber = (id: string) => Number(id.slice(1)) + 1;

/** The edits with `t` applied to `target`. */
const applyTo = (edits: Edits, target: CutTarget, t: Transition | null): Edits =>
  target === null ? setDefaultTransition(edits, t) : setCutTransition(edits, target, t);

/** The committed transition on a target (null = as generated / follows the default). */
const committedOn = (edits: Edits, target: CutTarget): Transition | null =>
  target === null ? edits.defaultTransition : (edits.cutTransitions[target] ?? null);

export type TransitionsProps = { lab: LabEdits; target: CutTarget; onTarget: (target: CutTarget) => void };

export const Transitions: React.FC<TransitionsProps> = ({ lab, target, onTarget }) => {
  const { playerRef, timeline } = useLabPlayer();
  const { edits, setEdits, setPreview } = lab;
  const cut = target ? timeline.cuts.find((c) => c.id === target) : undefined;
  const [draft, setDraft] = useState<Transition>(() => committedOn(edits, target) ?? transitionPreset("whip").settings);
  const [open, setOpen] = useState(false);
  /** The cut a preview is playing on, if one is. */
  const [previewing, setPreviewing] = useState<Cut | null>(null);
  const previewingRef = useRef(false);

  // Picking another target loads what it carries (or keeps the draft to try on it).
  useEffect(() => {
    const on = committedOn(edits, target);
    if (on) setDraft(on);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the target changes
  }, [target]);

  const stopPreview = useCallback(() => {
    if (!previewingRef.current) return; // never drop a preview another control (the looks) owns
    previewingRef.current = false;
    setPreviewing(null);
    setPreview(null);
  }, [setPreview]);

  // A preview never outlives a change of draft or target.
  useEffect(() => stopPreview, [draft, target, stopPreview]);

  const startPreview = () => {
    const player = playerRef.current;
    const previewCut = cut ?? nextStoryChange(timeline, player?.getCurrentFrame() ?? 0);
    if (!player || !previewCut) return;
    setPreview(applyTo(edits, target, draft));
    previewingRef.current = true;
    setPreviewing(previewCut);
    if (reducedMotion()) {
      // A still halfway through the transition instead of motion.
      player.pause();
      player.seekTo(previewCut.at + Math.floor(draft.durationFrames / 2));
      return;
    }
    player.seekTo(Math.max(0, previewCut.at - timeline.fps));
    player.play();
  };

  // While a motion preview plays, stop it a moment after the transition ends, or when the visitor pauses.
  useEffect(() => {
    const player = playerRef.current;
    if (!previewing || !player || reducedMotion()) return;
    const end = previewing.at + draft.durationFrames + Math.round(timeline.fps * 0.6);
    const onFrame = (e: { detail: { frame: number } }) => {
      if (e.detail.frame < end) return;
      player.pause();
      stopPreview();
    };
    const onPause = () => stopPreview();
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("pause", onPause);
    };
  }, [previewing, draft, timeline.fps, playerRef, stopPreview]);

  const commit = (t: Transition | null) => {
    stopPreview();
    setEdits(applyTo(edits, target, t));
  };

  const committed = committedOn(edits, target);
  const overrides = Object.keys(edits.cutTransitions).length;
  const fps = timeline.fps;
  const cutLabel = cut ? `the cut into beat ${beatNumber(cut.toBeat)} at ${formatTime(cut.at, fps)}` : "";

  const status = previewing
    ? `Previewing ${describe(draft, fps)} on ${cut ? cutLabel : `the story change at ${formatTime(previewing.at, fps)}`}. Not applied yet.`
    : cut
      ? committed
        ? `${describe(committed, fps)} on ${cutLabel} (overrides the default).`
        : `${cutLabel[0].toUpperCase()}${cutLabel.slice(1)} follows the default.`
      : `Story changes: ${edits.defaultTransition ? describe(edits.defaultTransition, fps) : "the generated story card"}${
          overrides ? ` · ${overrides} cut${overrides > 1 ? "s" : ""} overridden` : ""
        }.`;

  const pick = (kind: TransitionKind) =>
    setDraft(committed?.kind === kind ? committed : draft.kind === kind ? draft : transitionPreset(kind).settings);

  const adjust = (change: Partial<Omit<Transition, "kind">>) => setDraft(adjustTransition(draft, change));

  return (
    <section className="lab-tx" aria-labelledby="lab-tx-title">
      <div className="lab-tx__head">
        <h2 id="lab-tx-title" className="lab-tx__title">
          Transitions
        </h2>
        <p className="lab-tx__status" aria-live="polite">
          {status}
        </p>
      </div>

      <div className="lab-tx__target" role="group" aria-label="Apply to">
        <button type="button" className="lab-tx__chip" aria-pressed={target === null} onClick={() => onTarget(null)}>
          All story changes
        </button>
        {cut ? (
          <span className="lab-tx__chip" data-on="">
            Cut into beat {beatNumber(cut.toBeat)} · {formatTime(cut.at, fps)}
          </span>
        ) : (
          <span className="lab-tx__hint">Pick a cut on the timeline to make an exception.</span>
        )}
      </div>

      <div className="lab-tx__library" role="group" aria-label="Transition">
        {TRANSITIONS.map((t) => (
          <LibraryCard
            key={t.id}
            kind={t.id}
            name={t.name}
            blurb={t.blurb}
            settings={draft.kind === t.id ? draft : t.settings}
            selected={draft.kind === t.id}
            applied={committed?.kind === t.id}
            onPick={pick}
          />
        ))}
      </div>

      <button
        type="button"
        className="lab-tx__disclosure"
        aria-expanded={open}
        aria-controls="lab-tx-settings"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide settings" : "Adjust settings"} <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div id="lab-tx-settings" className="lab-tx__settings">
          <label className="lab-tx__field">
            <span>Duration</span>
            <input
              type="range"
              min={MIN_FRAMES}
              max={MAX_FRAMES}
              step={1}
              value={draft.kind === "cut" ? MIN_FRAMES : draft.durationFrames}
              disabled={draft.kind === "cut"}
              onChange={(e) => adjust({ durationFrames: Number(e.currentTarget.value) })}
            />
            <output className="lab-tx__value">{draft.kind === "cut" ? "–" : seconds(draft.durationFrames, fps)}</output>
          </label>
          <label className="lab-tx__field">
            <span>Easing</span>
            <select
              value={draft.easing}
              disabled={draft.kind === "cut"}
              onChange={(e) => adjust({ easing: e.currentTarget.value as Transition["easing"] })}
            >
              {EASINGS.map((e) => (
                <option key={e} value={e}>
                  {EASING_NAMES[e]}
                </option>
              ))}
            </select>
          </label>
          <label className="lab-tx__field">
            <span>Direction</span>
            <select
              value={draft.kind === "cut" ? "" : draft.direction}
              disabled={draft.kind === "cut"}
              onChange={(e) => adjust({ direction: e.currentTarget.value as Transition["direction"] })}
            >
              {draft.kind === "cut" && <option value="">–</option>}
              {DIRECTIONS[draft.kind].map((d) => (
                <option key={d} value={d}>
                  {DIRECTION_NAMES[d]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="lab-tx__actions">
        <button type="button" className="lab-tx__button" onClick={previewing ? stopPreview : startPreview}>
          {previewing ? "Stop preview" : "Preview"}
        </button>
        <button
          type="button"
          className="lab-tx__button lab-tx__button--primary"
          disabled={sameTransition(draft, committed)}
          onClick={() => commit(draft)}
        >
          {cut ? "Apply to this cut" : "Apply to all story changes"}
        </button>
        {committed && (
          <button type="button" className="lab-tx__button" onClick={() => commit(null)}>
            {cut ? "Remove override" : "Back to the story card"}
          </button>
        )}
      </div>
    </section>
  );
};

/** The first story change from `frame` on (or the first one, past the last). */
const nextStoryChange = (timeline: EditionTimeline, frame: number): Cut | undefined => {
  const stories = timeline.cuts.filter((c) => c.storyChange);
  return stories.find((c) => c.at >= frame) ?? stories[0];
};

type LibraryCardProps = {
  kind: TransitionKind;
  name: string;
  blurb: string;
  settings: Transition;
  selected: boolean;
  applied: boolean;
  onPick: (kind: TransitionKind) => void;
};

/** One transition: a tiny two-frame demo (it plays while pointed at or focused), its name and a line. */
const LibraryCard: React.FC<LibraryCardProps> = ({ kind, name, blurb, settings, selected, applied, onPick }) => {
  const incoming = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  // Loop the transition on the demo's incoming frame while the card is pointed at or focused.
  useEffect(() => {
    const el = incoming.current;
    if (!active || !el || settings.kind === "cut" || reducedMotion() || !el.animate) return;
    let timer: number | undefined;
    let anim: Animation | undefined;
    const ms = (settings.durationFrames / 30) * 1000;
    const run = () => {
      anim = el.animate([{ ...poseStyle(poseAt(settings, 0)), filter: poseStyle(poseAt(settings, 0)).filter ?? "none" }, { ...poseStyle(poseAt(settings, 1)), filter: "none" }], {
        duration: ms,
        easing: cssEasing(settings.easing),
        fill: "backwards",
      });
      timer = window.setTimeout(run, ms + 900);
    };
    run();
    return () => {
      window.clearTimeout(timer);
      anim?.cancel();
    };
  }, [active, settings]);

  return (
    <button
      type="button"
      className="lab-tx__card"
      aria-pressed={selected}
      data-applied={applied || undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClick={() => onPick(kind)}
    >
      <span className="lab-tx__demo" aria-hidden="true">
        <span className="lab-tx__demo-a" />
        {/* At rest the demo holds a still partway through, so each card reads without motion. */}
        <span className="lab-tx__demo-b" ref={incoming} style={poseStyle(poseAt(settings, 0.55))} />
      </span>
      <span className="lab-tx__name">
        {name}
        {applied && <span className="lab-tx__badge">applied</span>}
      </span>
      <span className="lab-tx__blurb">{blurb}</span>
    </button>
  );
};

// ── Cuts on the beat timeline ──────────────────────────────────────────────────

type CutMarkerProps = {
  cut: Cut;
  fps: number;
  transition: EffectiveTransition | undefined;
  selected: boolean;
  onSelect: (cut: Cut) => void;
};

/** A cut between two beat rows: its effective transition, overrides marked. Selecting it targets it. */
const CutMarker = memo<CutMarkerProps>(({ cut, fps, transition, selected, onSelect }) => {
  const source = transition?.source ?? "generated";
  const label = transition ? (transition.kind === "cut" ? "Cut" : transitionPreset(transition.kind).name) : cut.storyChange ? "Story card" : "Cut";
  return (
    <li className="lab-tl-cut" data-source={source} data-story={cut.storyChange || undefined}>
      <button
        type="button"
        className="lab-tl-cut-button"
        aria-pressed={selected}
        aria-label={`Cut into beat ${beatNumber(cut.toBeat)} at ${formatTime(cut.at, fps)}: ${label}${
          source === "override" ? ", overrides the default" : source === "default" ? ", the default" : ""
        }. Select to change it.`}
        onClick={() => onSelect(cut)}
      >
        <span className="lab-tl-cut-label">{label}</span>
        {source === "override" && <span className="lab-tl-cut-badge">override</span>}
      </button>
    </li>
  );
});

/**
 * The timeline's cut renderer: one marker per cut, selecting a cut makes it the
 * transitions panel's target and seeks a second before it.
 */
export const useCutMarkers = (lab: LabEdits, target: CutTarget, onTarget: (t: CutTarget) => void) => {
  const { playerRef, timeline } = useLabPlayer();
  // Committed edits only: a preview is not on the timeline until it is applied.
  const transitions = useMemo(() => effectiveEdition(timeline, lab.edits).transitions, [timeline, lab.edits]);
  const onSelect = useCallback(
    (cut: Cut) => {
      onTarget(cut.id);
      playerRef.current?.seekTo(Math.max(0, cut.at - timeline.fps));
    },
    [onTarget, playerRef, timeline.fps],
  );
  return useCallback(
    (cut: Cut) => (
      <CutMarker key={`cut-${cut.id}`} cut={cut} fps={timeline.fps} transition={transitions[cut.id]} selected={cut.id === target} onSelect={onSelect} />
    ),
    [transitions, target, onSelect, timeline.fps],
  );
};
