// Story changes: what plays where one story hands over to the next, as one
// choice. Either the generated story card in one of its styles (a title card
// between stories; the theme's style unless the visitor picks another) or a
// transition and no card (the next story moves straight in). Exactly one is on;
// picking applies it at once and replays it on the video around a story change
// three times (muted); "Try it" plays it once. With reduced motion the video
// holds a still partway through instead. The options, what a pick does and the
// status line live in story-changes.ts.
//
// A cut picked on the timeline (tablet and up) takes the same choice for itself:
// a transition of its own, or back to the default. A card can't go on one cut,
// so the card row is off there.
//
// Every option carries a mini preview of the same two scenes, A then B: a card
// plays "A → card → B", a transition "A → B moving". The mini previews are CSS keyframes
// that rest on a still and play on hover or focus (a tap on touch).
//
// Styles live in transitions.css (plain CSS, `lab-tx` prefix), not Tailwind,
// so the stylesheet every page shares does not change for the Lab.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "./beat-timeline";
import { effectiveEdition, setCutTransition, setStoryChange, type EffectiveTransition, type Edits, type StoryCardStyle } from "./edit-model";
import { useLabPlayer } from "./player-context";
import { PRESETS as THEME_PRESETS } from "./destilados-snapshot/src/themes";
import { BUMPER_FRAMES } from "./destilados-snapshot/src/StoryBumper";
import { planLoop } from "./transition-loop";
import type { Cut } from "./timeline";
import {
  CARD_OPTIONS,
  chosenOn,
  pickOption,
  STORY_CHANGE_OPTIONS,
  storyChangeStatus,
  TRANSITION_OPTIONS,
  type Chosen,
  type CutTarget,
  type StoryChangeOption,
} from "./story-changes";
import {
  adjustTransition,
  DIRECTIONS,
  EASINGS,
  hasMotion,
  MAX_FRAMES,
  MIN_FRAMES,
  transitionPreset,
  type Transition,
  type TransitionDirection,
  type TransitionEasing,
  type TransitionKind,
} from "./transitions";
import type { LabEdits } from "./use-lab-edits";
import "./transitions.css";

export type { CutTarget };

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

const seconds = (frames: number, fps: number) => `${(frames / fps).toFixed(2).replace(/0$/, "")} s`;

const nameOf = (t: Transition) => transitionPreset(t.kind).name;

/** "beat N" as the visitor counts, from 1. */
const beatNumber = (cut: Cut) => cut.toBeatIndex + 1;

/** How many times a pick replays on the video. */
const REPLAYS = 3;

/** Keys that move the duration slider: letting go of one replays the change. */
const SLIDER_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

const sameChoice = (a: Chosen | null, b: Chosen) => !!a && a.kind === b.kind && a.id === b.id;

export type TransitionsProps = { lab: LabEdits; target: CutTarget; onTarget: (target: CutTarget) => void };

export const Transitions: React.FC<TransitionsProps> = ({ lab, target, onTarget }) => {
  const { playerRef, timeline, loop } = useLabPlayer();
  const { edits, setEdits, setPreview, effective } = lab;
  const cut = target ? timeline.cuts.find((c) => c.id === target) : undefined;
  const chosen = chosenOn(timeline, edits, target);
  /** The transition set on the target itself (null: a card, or a cut following the default). */
  const own = target === null ? edits.defaultTransition : (edits.cutTransitions[target] ?? null);
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const fps = timeline.fps;

  // A card's mini preview rests on its still and plays only when asked: hover or focus with a mouse,
  // a tap on touch (twice, next to the replay on the video). Whenever it stops it goes back
  // to the still, not wherever it was.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const toStill = (card: Element) => card.getAnimations({ subtree: true }).forEach((a) => (a.currentTime = 0));
    const timers = new Map<Element, number>();
    const touch = window.matchMedia("(hover: none)").matches;
    const onClick = (e: MouseEvent) => {
      const card = (e.target as Element).closest(".lab-tx__card");
      if (!touch || !card) return;
      el.querySelectorAll(".lab-tx__card[data-mini-playing]").forEach((c) => {
        c.removeAttribute("data-mini-playing");
        toStill(c);
      });
      window.clearTimeout(timers.get(card));
      toStill(card);
      card.setAttribute("data-mini-playing", "");
      timers.set(
        card,
        window.setTimeout(() => {
          card.removeAttribute("data-mini-playing");
          toStill(card);
        }, 8000),
      );
    };
    // Leaving a card (mouse out, focus out) puts it back on its still.
    const onLeave = (e: MouseEvent | FocusEvent) => {
      const card = (e.target as Element).closest(".lab-tx__card");
      const to = e.relatedTarget as Node | null;
      if (card && !(to && card.contains(to)) && !card.hasAttribute("data-mini-playing")) toStill(card);
    };
    el.addEventListener("click", onClick);
    el.addEventListener("mouseout", onLeave);
    el.addEventListener("focusout", onLeave);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("mouseout", onLeave);
      el.removeEventListener("focusout", onLeave);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  /**
   * Replays what `next` plays on the target `repeats` times around its cut (the
   * picked cut, else the next story change from the playhead), or with reduced
   * motion shows a still halfway through it.
   */
  const replay = (next: Edits, repeats: number) => {
    const player = playerRef.current;
    if (!player) return;
    const t = cut ? (next.cutTransitions[cut.id] ?? (cut.storyChange ? next.defaultTransition : null)) : next.defaultTransition;
    const durationFrames = t ? t.durationFrames : !cut || cut.storyChange ? BUMPER_FRAMES : 0;
    const plan = planLoop(timeline, player.getCurrentFrame(), { durationFrames, cut, repeats });
    if (!plan) return;
    if (reducedMotion()) {
      loop.stop();
      player.pause();
      player.seekTo(plan.still);
    } else {
      loop.start(plan);
    }
  };

  /** Commits `next` and replays it. */
  const apply = (next: Edits) => {
    setPreview(null); // a look hovered elsewhere never stays on top of the pick
    setEdits(next);
    replay(next, REPLAYS);
  };

  const pick = (option: Chosen) => apply(pickOption(timeline, edits, target, option));

  /** The edits with the target's transition adjusted. */
  const adjusted = (change: Partial<Omit<Transition, "kind">>): Edits | null => {
    if (!own) return null;
    const t = adjustTransition(own, change);
    return target === null ? setStoryChange(edits, { transition: t }) : setCutTransition(edits, target, t);
  };

  const cardsOff = !!cut;
  const enabled = STORY_CHANGE_OPTIONS.filter((o) => !(cardsOff && o.kind === "card"));
  /** The option that takes Tab: the one chosen, else the first that can be. */
  const tabStop = enabled.find((o) => sameChoice(chosen, o)) ?? enabled[0];

  // Radio keys: arrows move to the next or previous option (skipping ones that are off) and pick it.
  const onGroupKey = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const home = e.key === "Home" ? 0 : e.key === "End" ? enabled.length - 1 : -1;
    if (!step && home < 0) return;
    e.preventDefault();
    const at = enabled.findIndex((o) => sameChoice(tabStop, o));
    const to = enabled[home >= 0 ? home : (at + step + enabled.length) % enabled.length];
    pick(to);
    groupRef.current?.querySelector<HTMLElement>(`[data-option="${to.kind}:${to.id}"]`)?.focus();
  };

  const themeStyle = THEME_PRESETS[effective.theme.name].transition;
  const moving = own && hasMotion(own) ? own : null;
  const status = storyChangeStatus(timeline, edits, cut, fps);

  const renderOption = (o: StoryChangeOption) => {
    const checked = sameChoice(chosen, o);
    const off = cardsOff && o.kind === "card";
    return (
      <OptionCard
        key={`${o.kind}:${o.id}`}
        option={o}
        checked={checked}
        disabled={off}
        tabbable={!off && sameChoice(tabStop, o)}
        theme={o.kind === "card" && o.id === themeStyle}
        onPick={pick}
      />
    );
  };

  return (
    <section
      ref={sectionRef}
      className="lab-tx"
      aria-labelledby="lab-tx-title"
      style={{ "--lab-tx-accent2": THEME_PRESETS[effective.theme.name].accent2 } as React.CSSProperties}
    >
      <h2 id="lab-tx-title" className="lab-tx__title">
        Story changes
      </h2>
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

      <h3 className="lab-tx__label" id="lab-tx-group-label">
        {cut ? `At the cut into beat ${beatNumber(cut)}` : "At each story change"}
      </h3>
      <div ref={groupRef} className="lab-tx__group" role="radiogroup" aria-labelledby="lab-tx-group-label" onKeyDown={onGroupKey}>
        <div className="lab-tx__kind" data-off={cardsOff || undefined}>
          <p className="lab-tx__kind-head" id="lab-tx-cards">
            <span className="lab-tx__kind-chip">Card</span> A title card between stories
          </p>
          <div className="lab-tx__library">
            {CARD_OPTIONS.map(renderOption)}
          </div>
          {cardsOff && (
            <p className="lab-tx__note" id="lab-tx-cards-off">
              A card is one style for every story change; pick it under “All story changes”.
            </p>
          )}
        </div>
        <div className="lab-tx__kind">
          <p className="lab-tx__kind-head" id="lab-tx-moves">
            <span className="lab-tx__kind-chip">No card</span> The next story moves straight in
          </p>
          <div className="lab-tx__library">
            {TRANSITION_OPTIONS.map(renderOption)}
          </div>
        </div>
      </div>

      {moving && (
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
      {moving && open && (
        <div id="lab-tx-settings" className="lab-tx__settings">
          <label className="lab-tx__field">
            <span>Duration</span>
            <input
              type="range"
              min={MIN_FRAMES}
              max={MAX_FRAMES}
              step={1}
              value={moving.durationFrames}
              // Live while dragging; the replay waits for the release.
              onChange={(e) => {
                const next = adjusted({ durationFrames: Number(e.currentTarget.value) });
                if (next) setEdits(next);
              }}
              onPointerUp={() => replay(edits, REPLAYS)}
              onKeyUp={(e) => SLIDER_KEYS.has(e.key) && replay(edits, REPLAYS)}
            />
            <output className="lab-tx__value">{seconds(moving.durationFrames, fps)}</output>
          </label>
          <label className="lab-tx__field">
            <span>Easing</span>
            <select
              value={moving.easing}
              onChange={(e) => {
                const next = adjusted({ easing: e.currentTarget.value as TransitionEasing });
                if (next) apply(next);
              }}
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
              value={moving.direction}
              onChange={(e) => {
                const next = adjusted({ direction: e.currentTarget.value as TransitionDirection });
                if (next) apply(next);
              }}
            >
              {DIRECTIONS[moving.kind].map((d) => (
                <option key={d} value={d}>
                  {DIRECTION_NAMES[d]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="lab-tx__actions">
        <button type="button" className="lab-tx__button" onClick={() => replay(edits, 1)}>
          Try it
        </button>
        {cut && (
          <button
            type="button"
            className="lab-tx__chip"
            aria-pressed={!own}
            onClick={() => apply(setCutTransition(edits, cut.id, null))}
          >
            Follow the default
          </button>
        )}
      </div>
    </section>
  );
};

/** The two scenes every mini preview shares: A, the beat before, and B, the next one. */
const Scenes: React.FC = () => (
  <>
    <span className="lab-tx__mini-a">A</span>
    <span className="lab-tx__mini-b">B</span>
  </>
);

/** A card's mini preview: A, then a tiny "Story 2/5" card entering the way the real one does, then B. */
const CardMini: React.FC<{ style: StoryCardStyle }> = ({ style }) => (
  <span className="lab-tx__mini" data-card={style} aria-hidden="true">
    <Scenes />
    <span className="lab-tx__sc">
      <span className="lab-tx__sc-in">
        <span className="lab-tx__sc-txt">
          <span className="lab-tx__sc-num">02</span>
          <span className="lab-tx__sc-kicker">Story 2/5</span>
        </span>
      </span>
    </span>
    {style === "band" && <span className="lab-tx__band" />}
    {(style === "wipe" || style === "glitch") && <span className="lab-tx__slab" />}
    {style === "glitch" && (
      <>
        <span className="lab-tx__rgb lab-tx__rgb--r" />
        <span className="lab-tx__rgb lab-tx__rgb--c" />
      </>
    )}
  </span>
);

/** A transition's mini preview: B coming in over A with the preset's motion, pushing A out (a cut swaps at once). */
const MoveMini: React.FC<{ kind: TransitionKind }> = ({ kind }) => (
  <span className="lab-tx__mini" data-tx={kind} aria-hidden="true">
    <Scenes />
    {kind === "whip" && <span className="lab-tx__smear" />}
  </span>
);

type OptionCardProps = {
  option: StoryChangeOption;
  checked: boolean;
  disabled: boolean;
  /** Whether Tab lands on it (one option in the group does). */
  tabbable: boolean;
  /** The theme's card style, marked. */
  theme: boolean;
  onPick: (option: Chosen) => void;
};

/** One option, a radio in the story change group: its mini preview, name and a line. */
const OptionCard: React.FC<OptionCardProps> = ({ option, checked, disabled, tabbable, theme, onPick }) => (
  <button
    type="button"
    role="radio"
    className="lab-tx__card"
    aria-checked={checked}
    disabled={disabled}
    tabIndex={tabbable ? 0 : -1}
    aria-describedby={disabled ? "lab-tx-cards lab-tx-cards-off" : option.kind === "card" ? "lab-tx-cards" : "lab-tx-moves"}
    data-option={`${option.kind}:${option.id}`}
    onClick={() => onPick(option)}
  >
    {option.kind === "card" ? <CardMini style={option.id} /> : <MoveMini kind={option.id} />}
    <span className="lab-tx__name">
      {option.name}
      {theme && <span className="lab-tx__badge">theme’s</span>}
    </span>
    <span className="lab-tx__blurb">{option.blurb}</span>
  </button>
);

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
