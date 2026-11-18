// The visitor's edits as React state (memory only: a reload starts from the
// original). A preview is a proposed set of edits the player shows without
// committing it; clearing the preview falls back to the committed edits.
import { useMemo, useState } from "react";
import { effectiveEdition, NO_EDITS, type EditionShape, type Edits, type EffectiveEdition } from "./edit-model";

export type LabEdits = {
  edits: Edits;
  setEdits: (edits: Edits) => void;
  preview: Edits | null;
  setPreview: (edits: Edits | null) => void;
  /** What the player renders: the preview if there is one, else the committed edits. */
  effective: EffectiveEdition;
};

export const useLabEdits = (edition: EditionShape): LabEdits => {
  const [edits, setEdits] = useState<Edits>(NO_EDITS);
  const [preview, setPreview] = useState<Edits | null>(null);
  const effective = useMemo(() => effectiveEdition(edition, preview ?? edits), [edition, preview, edits]);
  return { edits, setEdits, preview, setPreview, effective };
};
