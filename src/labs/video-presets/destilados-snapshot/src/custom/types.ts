// Props every per-edition custom animation receives (src/custom/<NNN>/<Name>.tsx, default export).
export type CustomProps = {
  props: Record<string, unknown>; // visual.props from script.json — figures/names must come from the story's sources
  dur: number; // beat length in frames
  edition: string; // "075"
  vertical: boolean; // true inside a Short (1080×1920)
};
