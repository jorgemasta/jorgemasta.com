// The composition the Lab's player renders: the vendored Report, fed with the
// rebuilt timeline. The visitor's edits (per-beat looks, per-cut transitions) are
// threaded into the snapshot keyed by the beat ids the timeline puts on its beats,
// with the whole-video options (theme, story card style). What the Report gets is
// the same `render` the export writes (report-inputs.ts).
import React from "react";
import { Report } from "./destilados-snapshot/src/Report";
import { CutEntrance, CutExit } from "./CutEntrance";
import { hasMotion } from "./transitions";
import type { EffectiveEdition } from "./edit-model";
import { reportInputs } from "./report-inputs";
import type { BeatId, Cut, Timeline } from "./timeline";

export type LabCompositionProps = {
  edition: string;
  report: Timeline;
  /** The edition's cuts, to place each cut's transition on its incoming beat. */
  cuts?: readonly Pick<Cut, "id" | "toBeat" | "storyChange">[];
  /** The edit model's output; omitted = the generated original. */
  effective?: EffectiveEdition;
};

export const LabComposition: React.FC<LabCompositionProps> = ({ edition, report, cuts, effective }) => {
  // The Report's data props, computed as the export writes them (report-inputs.ts).
  const inputs = React.useMemo(() => (effective ? reportInputs(effective, cuts ?? []) : {}), [effective, cuts]);
  const into = inputs.transitions;
  const entrance = React.useCallback(
    (beatId: string, visual: React.ReactNode) => {
      const t = into?.[beatId as BeatId];
      return t ? <CutEntrance transition={t}>{visual}</CutEntrance> : visual;
    },
    [into],
  );
  // The beat before a moving transition stays on under it, leaving the way it is pushed.
  const exit = React.useCallback(
    (nextBeatId: string) => {
      const t = into?.[nextBeatId as BeatId];
      if (!t || !hasMotion(t) || t.durationFrames <= 0) return undefined;
      return {
        frames: t.durationFrames,
        render: (visual: React.ReactNode, cutAt: number) => (
          <CutExit transition={t} cutAt={cutAt}>
            {visual}
          </CutExit>
        ),
      };
    },
    [into],
  );
  return (
    <Report
      edition={edition}
      lang={report.lang}
      timeline={report}
      filters={inputs.filters}
      entrance={entrance}
      exit={exit}
      noBumper={inputs.noBumper}
      theme={inputs.theme}
      storyCard={inputs.storyCard}
      motions={inputs.motions}
    />
  );
};
