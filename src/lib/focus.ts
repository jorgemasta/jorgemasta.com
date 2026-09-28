/**
 * The Focus: an ordered tour of places on the site that answer the visitor's
 * latest question. A pure state machine, driven by the Concierge's events; a
 * thin DOM adapter (`focus-dom.ts`) applies it to the page.
 */
import type { Target } from "./registry";

/** A place in the tour: where it lives and the element to spotlight. */
export type Stop = Pick<Target, "id" | "path" | "anchor">;

export type Focus = {
  /** The visitor's question, truncated: why the page looks the way it does. */
  label: string;
  /** The latest answer's stops, in reference order. */
  stops: Stop[];
  /** The stop the visitor is on, or null before they start the tour. */
  current: number | null;
};

/** Null is the canonical site: no Focus. */
export type FocusState = Focus | null;

export type FocusEvent =
  /** The visitor asked a new question, which replaces the Focus. */
  | { type: "asked"; question: string }
  /** The stops of the latest answer changed, as it streams in. */
  | { type: "answered"; stops: Stop[] }
  /** The visitor stepped to the next or previous stop. */
  | { type: "next" }
  | { type: "previous" }
  /**
   * The visitor clicked a chip. One from the latest answer moves the tour to
   * its stop; one from an earlier answer leaves the tour where it is.
   */
  | { type: "picked"; id: string }
  /** The visitor exited the Focus (×), staying where they are. */
  | { type: "cleared" };

/** Long enough to recognise the question, short enough for one line of the bar. */
const LABEL_LENGTH = 56;

/** The question as a label: trimmed, and cut at a word with an ellipsis if too long. */
function label(question: string) {
  const text = question.trim().replace(/\s+/g, " ");
  if (text.length <= LABEL_LENGTH) return text;
  const cut = text.slice(0, LABEL_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:]+$/, "")}…`;
}

export function focusReducer(state: FocusState, event: FocusEvent): FocusState {
  switch (event.type) {
    case "asked":
      return { label: label(event.question), stops: [], current: null };
    case "answered":
      return state && { ...state, stops: event.stops };
    case "next":
      if (!state?.stops.length) return state;
      return { ...state, current: Math.min((state.current ?? -1) + 1, state.stops.length - 1) };
    case "previous":
      if (!state?.current) return state;
      return { ...state, current: state.current - 1 };
    case "picked": {
      const index = state ? state.stops.findIndex((stop) => stop.id === event.id) : -1;
      return state && index !== -1 ? { ...state, current: index } : state;
    }
    case "cleared":
      return null;
  }
}

/** Whether the Focus has anywhere to take the visitor, and so shows its bar. */
export const isActive = (focus: FocusState): focus is Focus => Boolean(focus?.stops.length);

/** The stop the visitor is on, if the tour has started. */
export const currentStop = (focus: FocusState): Stop | null =>
  focus?.current == null ? null : focus.stops[focus.current];

/** How to reach a stop from the current page. */
export type Route = { type: "scroll"; anchor: string } | { type: "navigate"; url: string };

/** How to reach a stop from `pathname`: a scroll if it's on this page, otherwise a navigation to it. */
export function route(stop: Stop, pathname: string): Route {
  const samePage = pathname.replace(/\/?$/, "/") === stop.path;
  return samePage ? { type: "scroll", anchor: stop.anchor } : { type: "navigate", url: `${stop.path}#${stop.anchor}` };
}
