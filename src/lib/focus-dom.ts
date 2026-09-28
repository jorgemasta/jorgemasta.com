/**
 * The thin DOM adapter for the Focus (`focus.ts`): it spotlights the current
 * stop, dims the rest of the page while that stop is in view, and scrolls or
 * navigates to a stop. It holds no Focus state of its own. The styles live in
 * `global.css`, under `[data-focus-spot]`.
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

/** Room above a stop too tall to centre, so its spotlight outline stays in view. */
const TOP_MARGIN = 32;

/** Scrolls a stop on this page into view: centred if it fits, from its top if it doesn't. */
function scrollTo(element: HTMLElement) {
  const { top, height } = element.getBoundingClientRect();
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

/** Takes the visitor to a stop: a scroll on this page, or a navigation that lands on it. */
export function goTo(stop: Stop) {
  const next = route(stop, location.pathname);
  if (next.type === "navigate") {
    navigate(next.url);
    return;
  }
  const element = document.getElementById(next.anchor);
  if (element) scrollTo(element);
}

/**
 * Spotlights a stop if it's on this page, and dims the rest of the page while
 * the stop is in view, so the dimming fades once the visitor scrolls away.
 * Returns what undoes it.
 */
export function spotlight(stop: Stop): () => void {
  const element = route(stop, location.pathname).type === "scroll" ? document.getElementById(stop.anchor) : null;
  if (!element) return () => {};

  element.setAttribute("data-focus-spot", "");
  const inView = new IntersectionObserver(([entry]) => element.toggleAttribute("data-focus-dim", entry.isIntersecting));
  inView.observe(element);
  return () => {
    inView.disconnect();
    element.removeAttribute("data-focus-spot");
    element.removeAttribute("data-focus-dim");
  };
}
