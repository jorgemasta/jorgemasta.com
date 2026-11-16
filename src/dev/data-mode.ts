/**
 * DEV ONLY. Which data set `astro dev` renders: the real content (`demo`) or a
 * break-ui fixture set. Nothing outside `src/dev/` imports this statically;
 * `src/lib/content.ts` and `BaseLayout.astro` reach it behind
 * `import.meta.env.DEV`, so a build never contains it.
 *
 * Astro strips the query string and the request headers from prerendered pages,
 * in dev too, so pages can't read `?data=` themselves. The dev server's
 * middleware (`./data-toggle.ts`) reads the param, or the cookie it leaves,
 * from the raw request and records the mode here before Astro renders.
 */
export const DATA_MODES = ["demo", "worst", "empty", "one"] as const;
export type DataMode = (typeof DATA_MODES)[number];

export const DATA_PARAM = "data";
export const DATA_COOKIE = "dev-data";

export const isDataMode = (value: unknown): value is DataMode =>
  typeof value === "string" && (DATA_MODES as readonly string[]).includes(value);

/** Shared through `globalThis`: the middleware runs in Vite's process, pages in its module runners. */
const KEY = Symbol.for("jorgemasta.dev-data-mode");
type Holder = { [KEY]?: DataMode };

export const getDataMode = (): DataMode => (globalThis as Holder)[KEY] ?? "demo";

export const setDataMode = (mode: DataMode) => {
  (globalThis as Holder)[KEY] = mode;
};
