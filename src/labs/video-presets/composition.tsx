// The composition the Lab's player renders: the vendored Report, fed with the
// rebuilt timeline. Later edits (per-beat looks, per-cut transitions) are added
// as props here and threaded into the snapshot, keyed by beat and cut ids.
import React from "react";
import { Report } from "./destilados-snapshot/src/Report";
import { lookToCssFilter, type EffectiveEdition } from "./edit-model";
import type { Timeline } from "./timeline";

export type LabCompositionProps = {
  edition: string;
  report: Timeline;
  /** The edit model's output; omitted = the generated original. */
  effective?: EffectiveEdition;
};

export const LabComposition: React.FC<LabCompositionProps> = ({ edition, report, effective }) => {
  const filters = React.useMemo(
    () => (effective ? Object.fromEntries(Object.entries(effective.looks).map(([id, look]) => [id, lookToCssFilter(look)])) : undefined),
    [effective],
  );
  return <Report edition={edition} lang={report.lang} timeline={report} filters={filters} />;
};
