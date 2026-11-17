# Edition 78 media

Audio and images for the video-presets Lab, laid out as the pipeline's `public/`
folder: `editions/078/{real,gif}/…`, `editions/078/voice.en.mp3`, `sfx/*.mp3`.

Every file here is picked up at build time (`destilados-snapshot/src/media.tsx`).
A file the composition references but that is not here renders as an explicit
placeholder (images, clips) or is left out (audio).

## Where it came from

- `editions/078/`: release `media-078` of `sejas/destilados-ai-report` (Antonio
  Sejas's built media for edition 78). Only what the English edition references
  is kept: the voice, the 13 `real/` images its beats use (derived from
  `../destilados-snapshot/editions/078/timeline.en.json`) and both GIF clips.
  Left out: the Spanish voice and timeline, the shorts, `story/3.png` (nothing
  references it; it is the same file as `real/biobasics-story.png`), and the
  images only the thumbnail or nothing uses.
- `sfx/`: `public/sfx/*.mp3` of `sejas/destilados-ai-report` at commit
  `5c69b010a1eadeab2ff385a4a51796429ca3461b` (the snapshot's commit), the ten
  `Report.tsx` and `Intro.tsx` play. Unchanged.

## What was changed

- `voice.en.mp3`, the GIF clips, the SVG logos and the SFX are byte-identical.
- Photos saved as PNG are WebP (quality 85) under the same base name:
  `muse-spaces-og`, `cultfit-og`, `perplexity-teammate`, `biobasics-story`. The
  data still says `real:<name>.png`; `../media-path.ts` serves the `.webp` copy.
- JPEGs are re-encoded (mozjpeg, quality 85) under the same name: `axiom-tc`,
  `muse-voice-og`.
- Screenshots and diagrams stay PNG, quantised to a palette (quality 90):
  `muse-spaces-hero`, `muse-spaces-page`, `biobasics-page`, `axiom-cfsg`.
- No image was resized: all already fit the 1920×1080 frame. Every file keeps
  its pixel size, so the `iw`/`ih` the published timeline carries still hold.
