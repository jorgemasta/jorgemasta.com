/** The OpenPanel queue `BaseHead` sets up, if the site has a client id. */
declare global {
  interface Window {
    op?: (method: string, ...args: unknown[]) => void;
  }
}

/**
 * Records an event in OpenPanel. A no-op where analytics aren't set up (no
 * client id, or the script blocked), so the site works the same without them.
 */
export function track(name: string, properties?: Record<string, string | number | boolean>) {
  window.op?.("track", name, properties);
}
