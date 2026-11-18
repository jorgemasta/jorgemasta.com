// The wide "studio" layout: the video and the beat timeline pinned in a stage, the other
// controls in a panel beside it that scrolls with the page. The same query as the
// .lab-layout rules in lab-frame.css and editor.css; change them together.
import { useSyncExternalStore } from "react";

const STUDIO_QUERY = "(min-width: 64rem) and (min-height: 36rem)";

export const isStudio = () => typeof window !== "undefined" && window.matchMedia(STUDIO_QUERY).matches;

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(STUDIO_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** Whether the studio layout applies now (follows resizes and zoom). */
export const useStudio = () => useSyncExternalStore(subscribe, isStudio, () => false);
