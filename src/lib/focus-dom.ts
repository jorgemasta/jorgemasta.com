/**
 * The thin DOM adapter for the Focus (`focus.ts`): it spotlights the current
 * stop, dims the rest of the page while that stop is in view, and scrolls or
 * navigates to a stop. It holds no Focus state of its own. The styles live in
 * `global.css`, under `[data-focus-spot]`.
 */
import { navigate } from "astro:transitions/client";
import { route, type Stop } from "./focus";

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Scrolls a stop on this page into view: centred if it fits, from its top if it doesn't. */
function scrollTo(element: HTMLElement) {
  const fits = element.getBoundingClientRect().height < innerHeight * 0.8;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: fits ? "center" : "start" });
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
