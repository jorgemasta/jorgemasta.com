// Transitions and story cards. The generated story card (a 0.9 s card at each
// story change) takes a style, from the theme unless the visitor picks one; a
// transition applied to a story change replaces the card there.
//
// Transitions: a small library (cut, whip, slide, zoom), each a named set of
// settings the visitor can open and adjust. A transition is applied either as
// the default for every story change or to one cut picked on the timeline,
// where overrides show. "Try it" plays the draft on the video around the cut
// without committing it; with reduced motion it holds a still mid-transition.
//
// Styles live in transitions.css (plain CSS, `lab-tx` prefix), not Tailwind,
// so the stylesheet every page shares does not change for the Lab.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTime, storyChangeToTry } from "./beat-timeline";
import {
  effectiveEdition,
  setCutTransition,
  setDefaultTransition,
  setStoryCard,
  type EffectiveTransition,
  type Edits,
  type StoryCardStyle,
} from "./edit-model";
import { useLabPlayer } from "./player-context";
import { PRESETS as THEME_PRESETS } from "./destilados-snapshot/src/themes";
import type { Cut, CutId } from "./timeline";
import {
  adjustTransition,
  cssEasing,
  DIRECTIONS,
  EASINGS,
  hasMotion,
  MAX_FRAMES,
  MIN_FRAMES,
  poseAt,
  poseStyle,
  sameTransition,
  transitionPreset,
  TRANSITIONS,
  type Transition,
  type TransitionDirection,
  type TransitionEasing,
  type TransitionKind,
} from "./transitions";
import type { LabEdits } from "./use-lab-edits";
import "./transitions.css";

/** What a transition is applied to: every story change, or one cut (by id). */
export type CutTarget = CutId | null;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const EASING_NAMES: Record<TransitionEasing, string> = {
  linear: "Linear",
  "ease-in": "Ease in",
  "ease-out": "Ease out",
  "ease-in-out": "Ease in-out",
  overshoot: "Overshoot",
};
const DIRECTION_NAMES: Record<TransitionDirection, string> = {
  left: "From the left",
  right: "From the right",
  up: "From the top",
  down: "From the bottom",
  in: "Zoom in",
  out: "Zoom out",
};

const CARD_STYLES: readonly StoryCardStyle[] = ["band", "glitch", "wipe", "zoom"];
const CARD_NAMES: Record<StoryCardStyle, string> = { band: "Band", glitch: "Glitch", wipe: "Wipe", zoom: "Zoom" };

const seconds = (frames: number, fps: number) => `${(frames / fps).toFixed(2).replace(/0$/, "")} s`;

const nameOf = (t: Transition) => transitionPreset(t.kind).name;

const describe = (t: Transition, fps: number) => (hasMotion(t) ? `${nameOf(t)}, ${seconds(t.durationFrames, fps)}` : nameOf(t));

/** "beat N" as the visitor counts, from 1. */
const beatNumber = (cut: Cut) => cut.toBeatIndex + 1;

/** The edits with `t` applied to `target`. */
const applyTo = (edits: Edits, target: CutTarget, t: Transition | null): Edits =>
  target === null ? setDefaultTransition(edits, t) : setCutTransition(edits, target, t);

/** The committed transition on a target (null = as generated / follows the default). */
const committedOn = (edits: Edits, target: CutTarget): Transition | null =>
  target === null ? edits.defaultTransition : (edits.cutTransitions[target] ?? null);

export type TransitionsProps = { lab: LabEdits; target: CutTarget; onTarget: (target: CutTarget) => void };

export const Transitions: React.FC<TransitionsProps> = ({ lab, target, onTarget }) => {
  const { playerRef, timeline } = useLabPlayer();
  const { edits, setEdits, setPreview, effective } = lab;
  const cut = target ? timeline.cuts.find((c) => c.id === target) : undefined;
  const committed = committedOn(edits, target);
  /** A transition picked or adjusted but not applied yet (null = nothing pending). */
  const [draft, setDraft] = useState<Transition | null>(null);
  const [open, setOpen] = useState(false);
  /** The cut a preview is playing on, if one is. */
  const [previewing, setPreviewing] = useState<Cut | null>(null);
  const previewingRef = useRef(false);

  // Picking another target shows what it carries; a draft carries over to a target with nothing on it.
  useEffect(() => {
    if (committedOn(edits, target)) setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the target changes
  }, [target]);

  /** What the cards, settings and Try it act on: the draft, else what is applied. */
  const shown = draft ?? committed;

  const stopPreview = useCallback(() => {
    if (!previewingRef.current) return; // never drop a preview another control (the looks) owns
    previewingRef.current = false;
    setPreviewing(null);
    setPreview(null);
  }, [setPreview]);

  // A preview never outlives a change of draft or target.
  useEffect(() => stopPreview, [draft, target, stopPreview]);

  const tryIt = () => {
    const player = playerRef.current;
    if (!player) return;
    // The picked cut, else the next story change from the playhead (on phones, the sticky player).
    const at = cut ? { cut, from: Math.max(0, cut.at - timeline.fps) } : storyChangeToTry(timeline, player.getCurrentFrame());
    if (!at) return;
    setPreview(applyTo(edits, target, shown));
    previewingRef.current = true;
    setPreviewing(at.cut);
    if (reducedMotion()) {
      // A still halfway through the transition instead of motion.
      player.pause();
      player.seekTo(at.cut.at + Math.floor((shown?.durationFrames ?? 0) / 2));
      return;
    }
    player.seekTo(at.from);
    player.play();
  };

  // While a motion preview plays, stop it a moment after the transition ends, or when the visitor pauses.
  const shownFrames = shown?.durationFrames ?? 0;
  useEffect(() => {
    const player = playerRef.current;
    if (!previewing || !player || reducedMotion()) return;
    const end = previewing.at + shownFrames + Math.round(timeline.fps * 0.6);
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
  }, [previewing, shownFrames, timeline.fps, playerRef, stopPreview]);

  const commit = (t: Transition | null) => {
    stopPreview();
    setDraft(null);
    setEdits(applyTo(edits, target, t));
  };

  const overrides = Object.keys(edits.cutTransitions).length;
  const fps = timeline.fps;
  const cutLabel = cut ? `the cut into beat ${beatNumber(cut)} at ${formatTime(cut.at, fps)}` : "";
  const asIs = cut ? "the default" : "the story card";

  const status = previewing
    ? `Trying ${shown ? describe(shown, fps) : asIs} on ${cut ? cutLabel : `the story change at ${formatTime(previewing.at, fps)}`}.${
        draft ? " Not applied yet." : ""
      }`
    : draft
      ? `Draft: ${describe(draft, fps)}, not applied yet.`
      : cut
        ? committed
          ? `${describe(committed, fps)} on ${cutLabel} (overrides the default).`
          : `${cutLabel[0].toUpperCase()}${cutLabel.slice(1)} follows the default.`
        : `Story changes: ${edits.defaultTransition ? describe(edits.defaultTransition, fps) : "the story card"}${
            overrides ? ` · ${overrides} cut${overrides > 1 ? "s" : ""} overridden` : ""
          }.`;

  const pick = (kind: TransitionKind) => {
    if (committed?.kind === kind) setDraft(null); // back to what is applied
    else if (draft?.kind !== kind) setDraft(transitionPreset(kind).settings);
  };

  const adjust = (change: Partial<Omit<Transition, "kind">>) => {
    if (!shown) return;
    const next = adjustTransition(shown, change);
    setDraft(sameTransition(next, committed) ? null : next);
  };
  const still = !shown || !hasMotion(shown);

  return (
    <section className="lab-tx" aria-labelledby="lab-tx-title">
      <div className="lab-tx__head">
        <h2 id="lab-tx-title" className="lab-tx__title">
          Transitions &amp; story cards
        </h2>
      </div>

      <StoryCardRow
        card={effective.storyCard}
        themeStyle={THEME_PRESETS[effective.theme.name].transition}
        replacedBy={edits.defaultTransition}
        fps={fps}
        onChange={(style) => {
          stopPreview();
          setEdits(setStoryCard(edits, style));
        }}
      />

      <p className="lab-tx__status" aria-live="polite">
        {status}
      </p>

      {/* A choice of target only exists once a cut is picked on the timeline (tablet and up). */}
      {cut ? (
        <div className="lab-tx__target" role="group" aria-label="Apply to">
          <button type="button" className="lab-tx__chip" aria-pressed={false} onClick={() => onTarget(null)}>
            All story changes
          </button>
          <span className="lab-tx__chip" data-on="">
            Cut into beat {beatNumber(cut)} · {formatTime(cut.at, fps)}
          </span>
        </div>
      ) : (
        <p className="lab-tx__hint">Pick a cut on the timeline to make an exception.</p>
      )}

      <div className="lab-tx__library" role="group" aria-label="Transition">
        {TRANSITIONS.map((t) => {
          const isDraft = draft?.kind === t.id;
          const isApplied = committed?.kind === t.id;
          return (
            <LibraryCard
              key={t.id}
              kind={t.id}
              name={t.name}
              blurb={t.blurb}
              settings={isDraft ? draft : isApplied ? committed : t.settings}
              state={isDraft ? "draft" : isApplied ? "applied" : null}
              onPick={pick}
            />
          );
        })}
      </div>

      {shown && (
        <button
          type="button"
          className="lab-tx__disclosure"
          aria-expanded={open}
          aria-controls="lab-tx-settings"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide settings" : "Adjust settings"} <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      )}
      {shown && open && (
        <div id="lab-tx-settings" className="lab-tx__settings">
          <label className="lab-tx__field">
            <span>Duration</span>
            <input
              type="range"
              min={MIN_FRAMES}
              max={MAX_FRAMES}
              step={1}
              value={still ? MIN_FRAMES : shown.durationFrames}
              disabled={still}
              onChange={(e) => adjust({ durationFrames: Number(e.currentTarget.value) })}
            />
            <output className="lab-tx__value">{still ? "–" : seconds(shown.durationFrames, fps)}</output>
          </label>
          <label className="lab-tx__field">
            <span>Easing</span>
            <select
              value={shown.easing}
              disabled={still}
              onChange={(e) => adjust({ easing: e.currentTarget.value as TransitionEasing })}
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
              value={still ? "" : shown.direction}
              disabled={still}
              onChange={(e) => adjust({ direction: e.currentTarget.value as TransitionDirection })}
            >
              {still && <option value="">–</option>}
              {DIRECTIONS[shown.kind].map((d) => (
                <option key={d} value={d}>
                  {DIRECTION_NAMES[d]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="lab-tx__actions">
        <button type="button" className="lab-tx__button" onClick={previewing ? stopPreview : tryIt}>
          {previewing ? "Stop" : "Try it"}
        </button>
        {draft ? (
          <>
            <button type="button" className="lab-tx__button lab-tx__button--primary" onClick={() => commit(draft)}>
              {cut ? "Apply to this cut" : "Apply to all story changes"}
            </button>
            <button type="button" className="lab-tx__button" onClick={() => setDraft(null)}>
              Discard draft
            </button>
          </>
        ) : (
          committed && (
            <button type="button" className="lab-tx__button" onClick={() => commit(null)}>
              {cut ? "Remove override" : "Back to the story card"}
            </button>
          )
        )}
      </div>
    </section>
  );
};

type StoryCardRowProps = {
  card: { style: StoryCardStyle; source: "theme" | "visitor" };
  /** The style the current theme brings. */
  themeStyle: StoryCardStyle;
  /** The transition on every story change, which plays instead of the card. */
  replacedBy: Transition | null;
  fps: number;
  onChange: (style: StoryCardStyle | null) => void;
};

/** "Story card: Band (from theme)", and a select to pick another style or follow the theme again. */
const StoryCardRow: React.FC<StoryCardRowProps> = ({ card, themeStyle, replacedBy, fps, onChange }) => (
  <div className="lab-tx__storycard">
    <label className="lab-tx__field">
      <span>Story card</span>
      <select
        value={card.source === "visitor" ? card.style : ""}
        aria-describedby="lab-tx-card-note"
        onChange={(e) => onChange((e.currentTarget.value || null) as StoryCardStyle | null)}
      >
        <option value="">{CARD_NAMES[themeStyle]} (from theme)</option>
        {CARD_STYLES.map((s) => (
          <option key={s} value={s}>
            {CARD_NAMES[s]}
          </option>
        ))}
      </select>
    </label>
    <p className="lab-tx__note" id="lab-tx-card-note">
      {replacedBy
        ? `Not shown now: every story change plays ${describe(replacedBy, fps)}. "Back to the story card" below brings it back.`
        : `${card.source === "theme" ? "The theme's card plays" : "Your choice plays, whatever the theme,"} at each story change. A transition below replaces it.`}
    </p>
  </div>
);

type LibraryCardProps = {
  kind: TransitionKind;
  name: string;
  blurb: string;
  settings: Transition;
  /** "applied": on the video now. "draft": picked or adjusted, not applied yet. */
  state: "applied" | "draft" | null;
  onPick: (kind: TransitionKind) => void;
};

/** One transition: a tiny two-frame demo (it plays while pointed at or focused), its name and a line. */
const LibraryCard: React.FC<LibraryCardProps> = ({ kind, name, blurb, settings, state, onPick }) => {
  const incoming = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  // Loop the transition on the demo's incoming frame while the card is pointed at or focused.
  useEffect(() => {
    const el = incoming.current;
    if (!active || !el || !hasMotion(settings) || reducedMotion() || !el.animate) return;
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
      data-state={state ?? undefined}
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
        {state && <span className="lab-tx__badge">{state === "draft" ? "draft" : "applied"}</span>}
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
  const label = transition ? nameOf(transition) : cut.storyChange ? "Story card" : "Cut";
  return (
    <li className="lab-tl-cut" data-source={source} data-story={cut.storyChange || undefined}>
      <button
        type="button"
        className="lab-tl-cut-button"
        aria-pressed={selected}
        aria-label={`Cut into beat ${beatNumber(cut)} at ${formatTime(cut.at, fps)}: ${label}${
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
