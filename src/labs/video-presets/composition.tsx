// The composition the Lab's player renders: the vendored Report, fed with the
// rebuilt timeline. Later edits (per-beat looks, per-cut transitions) are added
// as props here and threaded into the snapshot, keyed by beat and cut ids.
import React from "react";
import { Report } from "./destilados-snapshot/src/Report";
import type { Timeline } from "./timeline";

export type LabCompositionProps = {
  edition: string;
  report: Timeline;
};

export const LabComposition: React.FC<LabCompositionProps> = ({ edition, report }) => (
  <Report edition={edition} lang={report.lang} timeline={report} />
);
