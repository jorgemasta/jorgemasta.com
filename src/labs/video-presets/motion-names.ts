// The renderer's image motions as the editor names them.
import { MOTIONS, type Motion } from "./edit-model";

export const MOTION_NAMES: Record<Motion, string> = {
  zoom: "Slow zoom",
  punch: "Punch in",
  shake: "Shake",
  pan: "Pan",
  still: "Still",
};

export const MOTION_OPTIONS: readonly Motion[] = MOTIONS;
