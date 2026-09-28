/**
 * The thin DOM adapter for the Focus (`focus.ts`): it spotlights the current
 * stop with the Concierge's note beside it, blurs the rest of the page while
 * that stop is in view, and scrolls or navigates to a stop. It holds no Focus
 * state of its own. The styles live in `global.css`, under `[data-focus-spot]`
 * and `[data-focus-note]`.
 */
import { navigate } from "astro:transitions/client";
import { focusSearch, isSamePage, route, type FocusState, type Place, type Stop } from "./focus";

/**
 * Reflects the Focus in the URL, so it can be shared, without adding a
 * history entry. Keeps `ClientRouter`'s history state and the page's hash.
 */
export function showInUrl(focus: FocusState) {
  const search = focusSearch(location.search, focus);
  if (search === location.search) return;
  history.replaceState(history.state, "", `${location.pathname}${search}${location.hash}`);
}

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Calm and quick: the same 200ms as the dimming in `global.css`. */
const SCROLL_MS = 200;

/** The scroll in progress, so a new one replaces it rather than fighting it. */
let scrolling = 0;

/** Scrolls the page to `top`, easing out over 200ms, or at once under reduced motion. */
function scrollPage(top: number) {
  cancelAnimationFrame(scrolling);
  const start = scrollY;
  // "instant", because the page's own `scroll-behavior: smooth` would stretch every step.
  if (prefersReducedMotion() || start === top) return window.scrollTo({ top, behavior: "instant" });
  const began = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - began) / SCROLL_MS, 1);
    window.scrollTo({ top: start + (top - start) * (1 - (1 - progress) ** 3), behavior: "instant" });
    if (progress < 1) scrolling = requestAnimationFrame(step);
  };
  scrolling = requestAnimationFrame(step);
}

/** Room above a stop too tall to centre, so the paper it's raised on stays in view. */
const TOP_MARGIN = 32;

/** The note's width, and the space kept between it, the stop and the screen's edges. */
const NOTE_WIDTH = 240;
const NOTE_GAP = 32;
const EDGE = 16;

/** Where the page ends on the right: before the Concierge panel when it pushes the page aside. */
function pageRight() {
  const panel = document.getElementById("concierge")?.getBoundingClientRect();
  return panel && panel.top <= 0 ? panel.left : document.documentElement.clientWidth;
}

/** Which margin beside a stop has room for its note, if either does. */
function marginFor(stop: DOMRect, width: number, right: number): "right" | "left" | null {
  if (right - stop.right >= width + NOTE_GAP + EDGE) return "right";
  if (stop.left >= width + NOTE_GAP + EDGE) return "left";
  return null;
}

const noteWidth = (right: number) => Math.min(NOTE_WIDTH, right - 2 * EDGE);

/** Room for a note of two or three lines above a stop, when no margin has room for it. */
const NOTE_ROOM = 112;

/** The room a stop's note needs above it, so scrolling to the stop keeps its note in view too. */
function roomAbove(stop: Stop, element: HTMLElement) {
  const right = pageRight();
  return stop.note && !marginFor(element.getBoundingClientRect(), noteWidth(right), right) ? NOTE_ROOM : 0;
}

/**
 * Scrolls a stop on this page into view, with `above` pixels of room over it
 * for its note: centred if it fits, from its top if it doesn't.
 */
function scrollTo(element: HTMLElement, above = 0) {
  const rect = element.getBoundingClientRect();
  const top = rect.top - above;
  const height = rect.height + above;
  const fits = height < innerHeight * 0.8;
  scrollPage(scrollY + top - (fits ? (innerHeight - height) / 2 : TOP_MARGIN));
}

/** Takes the visitor back to a page and scroll position: a scroll on this page, or a navigation then a jump. */
export function goBack(place: Place) {
  if (isSamePage(place.path, location.pathname)) {
    scrollPage(place.scrollY);
    return;
  }
  document.addEventListener("astro:page-load", () => window.scrollTo({ top: place.scrollY, behavior: "instant" }), {
    once: true,
  });
  navigate(place.path);
}

/** What counts as the visitor taking over: scrolling, tapping or typing. */
const TAKEOVER_EVENTS = ["wheel", "touchmove", "pointerdown", "keydown"] as const;

/**
 * Calls `onTakeover` the first time the visitor scrolls, taps or types.
 * Listens for their input rather than `scroll`, which the Concierge's own
 * moves would fire. Returns what stops listening.
 */
export function whenVisitorTakesOver(onTakeover: () => void): () => void {
  const listener = () => {
    stop();
    onTakeover();
  };
  const stop = () => TAKEOVER_EVENTS.forEach((type) => removeEventListener(type, listener, { capture: true }));
  TAKEOVER_EVENTS.forEach((type) => addEventListener(type, listener, { capture: true, passive: true }));
  return stop;
}

/**
 * Takes the visitor to a stop: a scroll on this page, or a navigation that
 * lands on it. Landing on its anchor puts the stop at the top of the screen,
 * so a stop whose note goes above it is then eased down to show the note.
 */
export function goTo(stop: Stop) {
  const next = route(stop, location.pathname);
  if (next.type === "navigate") {
    document.addEventListener(
      "astro:page-load",
      () => {
        const element = document.getElementById(stop.anchor);
        const above = element ? roomAbove(stop, element) : 0;
        if (element && above) scrollTo(element, above);
      },
      { once: true }
    );
    navigate(next.url);
    return;
  }
  const element = document.getElementById(next.anchor);
  if (element) scrollTo(element, roomAbove(stop, element));
}

/**
 * Places a stop's note beside it: in the margin to its right or left when
 * there's room, otherwise just above it, or below it at the top of the page.
 * In page coordinates, so it scrolls with the stop.
 */
function placeNote(note: HTMLElement, element: HTMLElement) {
  const stop = element.getBoundingClientRect();
  const right = pageRight();
  const width = noteWidth(right);
  note.style.width = `${width}px`;
  const margin = marginFor(stop, width, right);
  let left: number;
  let top: number;
  if (margin) {
    left = margin === "right" ? stop.right + NOTE_GAP : stop.left - NOTE_GAP - width;
    top = stop.top;
    note.dataset.side = margin;
  } else {
    left = Math.min(Math.max(stop.left, EDGE), right - width - EDGE);
    const above = stop.top + scrollY - note.offsetHeight - EDGE;
    top = above >= 0 ? stop.top - note.offsetHeight - EDGE : stop.bottom + EDGE;
    note.dataset.side = above >= 0 ? "above" : "below";
  }
  note.style.left = `${left + scrollX}px`;
  note.style.top = `${top + scrollY}px`;
}

/**
 * The Concierge's note beside a stop: why it answers the question. Written by
 * the model, so it's marked as the Concierge's, and set as text, never markup.
 */
function showNote(text: string, element: HTMLElement): () => void {
  const note = document.createElement("aside");
  note.setAttribute("data-focus-note", "");
  note.setAttribute("aria-label", "Concierge note");
  const by = document.createElement("p");
  by.textContent = "Concierge";
  const body = document.createElement("p");
  body.textContent = text;
  note.append(by, body);
  document.body.append(note);

  const place = () => placeNote(note, element);
  place();
  // The page reflows when the panel opens or closes, fonts load or the window resizes.
  const resized = new ResizeObserver(place);
  resized.observe(element);
  resized.observe(document.body);
  requestAnimationFrame(() => note.setAttribute("data-shown", ""));
  return () => {
    resized.disconnect();
    note.remove();
  };
}

/**
 * Spotlights a stop if it's on this page, with its note beside it, and blurs
 * the rest of the page while the stop is in view, so the blur fades once the
 * visitor scrolls away. Returns what undoes it.
 */
export function spotlight(stop: Stop): () => void {
  const element = route(stop, location.pathname).type === "scroll" ? document.getElementById(stop.anchor) : null;
  if (!element) return () => {};

  element.setAttribute("data-focus-spot", "");
  const inView = new IntersectionObserver(([entry]) => element.toggleAttribute("data-focus-dim", entry.isIntersecting));
  inView.observe(element);
  const hideNote = stop.note ? showNote(stop.note, element) : () => {};
  return () => {
    inView.disconnect();
    hideNote();
    element.removeAttribute("data-focus-spot");
    element.removeAttribute("data-focus-dim");
  };
}
