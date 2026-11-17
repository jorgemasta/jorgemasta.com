// The composition the Lab's player renders: the vendored Report, fed with the
// rebuilt timeline. Later edits (per-beat looks, per-cut transitions) are added
// as props here and threaded into the snapshot, keyed by beat and cut ids.
import React from "react";
import { Report } from "./destilados-snapshot/src/Report";
import { CutEntrance } from "./CutEntrance";
import { lookToCssFilter, type EffectiveEdition, type EffectiveTransition } from "./edit-model";
import type { Cut, Timeline } from "./timeline";

export type LabCompositionProps = {
  edition: string;
  report: Timeline;
  /** The edition's cuts, to place each cut's transition on its incoming beat. */
  cuts?: readonly Pick<Cut, "id" | "toBeat" | "storyChange">[];
  /** The edit model's output; omitted = the generated original. */
  effective?: EffectiveEdition;
};

export const LabComposition: React.FC<LabCompositionProps> = ({ edition, report, cuts, effective }) => {
  const filters = React.useMemo(
    () => (effective ? Object.fromEntries(Object.entries(effective.looks).map(([id, look]) => [id, lookToCssFilter(look)])) : undefined),
    [effective],
  );
  // Transitions by incoming beat, and the story cards they replace.
  const { into, noBumper } = React.useMemo(() => {
    const into = new Map<string, EffectiveTransition>();
    const noBumper: string[] = [];
    for (const cut of cuts ?? []) {
      const t = effective?.transitions[cut.id];
      if (!t) continue;
      into.set(cut.toBeat, t);
      if (cut.storyChange) noBumper.push(cut.toBeat);
    }
    return { into, noBumper };
  }, [cuts, effective]);
  const entrance = React.useCallback(
    (beatId: string, visual: React.ReactNode) => {
      const t = into.get(beatId);
      return t ? <CutEntrance transition={t}>{visual}</CutEntrance> : visual;
    },
    [into],
  );
  return (
    <Report edition={edition} lang={report.lang} timeline={report} filters={filters} entrance={entrance} noBumper={noBumper} />
  );
};
