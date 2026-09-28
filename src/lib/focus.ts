/**
 * The Focus: an ordered tour of places on the site that answer the visitor's
 * latest question. A pure state machine, driven by the Concierge's events; a
 * thin DOM adapter (`focus-dom.ts`) applies it to the page.
 */
import type { Target } from "./registry";

/**
 * A place in the tour: where it lives, the element to spotlight, and the
 * Concierge's note on why it answers the question. A shared link carries no notes.
 */
export type Stop = Pick<Target, "id" | "path" | "anchor"> & { note?: string };

/** A page, and how far down it the visitor had scrolled. */
export type Place = { path: string; scrollY: number };

/**
 * An answer's one automatic move: still to come, used by its first stop, or
 * cancelled because the visitor took over while the answer streamed.
 */
export type Move = "pending" | "used" | "cancelled";

export type Focus = {
  /** The visitor's question, truncated: why the page looks the way it does. */
  label: string;
  /** The latest answer's stops, in reference order. */
  stops: Stop[];
  /** The stop the visitor is on, or null before they start the tour. */
  current: number | null;
  /** Whether the Concierge may still move the page for this answer. */
  move: Move;
  /** Where the visitor was when they asked: the return point, until they go back to it. */
  from: Place | null;
};

/** Null is the canonical site: no Focus. */
export type FocusState = Focus | null;

export type FocusEvent =
  /** The visitor asked a new question from `from`, which replaces the Focus. */
  | { type: "asked"; question: string; from: Place }
  /** The stops of the latest answer changed, as it streams in. */
  | { type: "answered"; stops: Stop[] }
  /** The visitor scrolled, tapped or typed while the answer streamed. */
  | { type: "interacted" }
  /** The visitor stepped to the next or previous stop. */
  | { type: "next" }
  | { type: "previous" }
  /**
   * The visitor clicked a chip. One from the latest answer moves the tour to
   * its stop; one from an earlier answer leaves the tour where it is.
   */
  | { type: "picked"; id: string }
  /** The visitor exited the Focus (×), staying where they are. */
  | { type: "cleared" }
  /**
   * The visitor went back to where they asked, undoing the automatic move.
   * The tour stays, to take again from the start.
   */
  | { type: "returned" }
  /** The visitor opened a shared-Focus link: its stops, with unknown ids already skipped. */
  | { type: "shared"; stops: Stop[] };

/**
 * The label of a Focus opened from a link. Links carry ids only, never text,
 * so a link can't be crafted to show arbitrary words on the site.
 */
const SHARED_LABEL = "Shared focus";

/** The query parameter that carries the Focus: its stop ids, in order, comma-separated. */
const FOCUS_PARAM = "focus";

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
      return { label: label(event.question), stops: [], current: null, move: "pending", from: event.from };
    case "answered":
      if (!state) return state;
      // The first stop to arrive takes the answer's one automatic move; later ones only join the tour.
      if (state.move === "pending" && event.stops.length) {
        return { ...state, stops: event.stops, current: 0, move: "used" };
      }
      return { ...state, stops: event.stops };
    case "interacted":
      return state?.move === "pending" ? { ...state, move: "cancelled" } : state;
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
    case "returned":
      return state && { ...state, current: null, from: null };
    case "shared":
      // A link is not a question: nothing to move the page for, nowhere to go back to.
      return event.stops.length
        ? { label: SHARED_LABEL, stops: event.stops, current: null, move: "cancelled", from: null }
        : null;
  }
}

/** Where "Back to where you were" returns to: shown only once the automatic move has taken the visitor away. */
export const returnPoint = (focus: FocusState): Place | null => (focus?.move === "used" ? focus.from : null);

/** The stop ids a URL's query carries, in order, without repeats. */
function sharedIds(search: string) {
  const ids = new URLSearchParams(search).get(FOCUS_PARAM)?.split(",") ?? [];
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

/** The Focus's stop ids, in order: all a URL carries of it. */
const focusIds = (focus: FocusState) => (isActive(focus) ? focus.stops.map((stop) => stop.id) : []);

/**
 * A URL query with the Focus in it, or without it once the Focus is cleared.
 * Only the ids go in, never the label; the page's other parameters stay.
 */
export function focusSearch(search: string, focus: FocusState): string {
  const params = new URLSearchParams(search);
  params.delete(FOCUS_PARAM);
  const ids = focusIds(focus);
  // Kept readable: ids are slugs, and a Fact's `/` is fine in a query.
  const carried = ids.length ? `${FOCUS_PARAM}=${ids.map(encodeURIComponent).join(",").replaceAll("%2F", "/")}` : "";
  const query = [params.toString(), carried].filter(Boolean).join("&");
  return query && `?${query}`;
}

/**
 * The Focus when a page first loads. The one saved in this tab survives a
 * refresh, which leaves the URL carrying the same stops, or none. A link with
 * other stops replaces it with a shared Focus, skipping ids that don't exist.
 */
export function restoreFocus(saved: FocusState, search: string, stopFor: (id: string) => Stop | undefined): FocusState {
  const ids = sharedIds(search);
  if (!ids.length || ids.join() === focusIds(saved).join()) return saved;
  return focusReducer(saved, { type: "shared", stops: ids.flatMap((id) => stopFor(id) ?? []) });
}

/** Whether the Focus has anywhere to take the visitor, and so shows its bar. */
export const isActive = (focus: FocusState): focus is Focus => Boolean(focus?.stops.length);

/** The stop the visitor is on, if the tour has started. */
export const currentStop = (focus: FocusState): Stop | null =>
  focus?.current == null ? null : focus.stops[focus.current];

/** Whether `path` is the page at `pathname`, with or without its trailing slash. */
export const isSamePage = (path: string, pathname: string) =>
  pathname.replace(/\/?$/, "/") === path.replace(/\/?$/, "/");

/** How to reach a stop from the current page. */
export type Route = { type: "scroll"; anchor: string } | { type: "navigate"; url: string };

/** How to reach a stop from `pathname`: a scroll if it's on this page, otherwise a navigation to it. */
export function route(stop: Stop, pathname: string): Route {
  return isSamePage(stop.path, pathname)
    ? { type: "scroll", anchor: stop.anchor }
    : { type: "navigate", url: `${stop.path}#${stop.anchor}` };
}
