// The five look parameters as the editor's sliders show them: shared by the
// per-beat inspector and the Custom look.
import type { Look } from "./edit-model";

export type LookParam = { key: keyof Look; label: string; min: number; max: number; step: number; format: (v: number) => string };

const percent = (v: number) => `${Math.round(v * 100)}%`;

export const LOOK_PARAMS: readonly LookParam[] = [
  { key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.05, format: percent },
  { key: "contrast", label: "Contrast", min: 0.5, max: 1.5, step: 0.05, format: percent },
  { key: "brightness", label: "Brightness", min: 0.5, max: 1.5, step: 0.05, format: percent },
  { key: "warmth", label: "Warmth", min: 0, max: 1, step: 0.05, format: percent },
  { key: "hue", label: "Hue", min: -45, max: 45, step: 1, format: (v) => `${Math.round(v)}°` },
];
