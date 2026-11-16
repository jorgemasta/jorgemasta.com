import { getDataMode, type DataMode } from "../data-mode";
import empty from "./empty";
import one from "./one";
import type { DevData } from "./types";
import worst from "./worst";

export type { DevData };

const SETS: Record<Exclude<DataMode, "demo">, () => Promise<DevData>> = { worst, empty, one };

/** Built once per mode (and again whenever a fixture file changes, as Vite reloads this module). */
const built = new Map<DataMode, Promise<DevData>>();

/**
 * DEV ONLY. The fixture set picked with `?data=`, or null for `demo`, which is
 * the real content. Read by `src/lib/content.ts` at the data boundary.
 */
export function getDevData(): Promise<DevData> | null {
  const mode = getDataMode();
  if (mode === "demo") return null;
  let data = built.get(mode);
  if (!data) built.set(mode, (data = SETS[mode]()));
  return data;
}
