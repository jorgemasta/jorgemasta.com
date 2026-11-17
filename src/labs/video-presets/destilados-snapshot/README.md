# Destilados renderer — fixed snapshot

A **fixed snapshot**, not a dependency. It is copied once and never synced
(ADR 0005, `docs/adr/0005-*.md`).

- Source repository: `sejas/destilados-ai-report` (Antonio Sejas's video pipeline)
- Commit: `5c69b010a1eadeab2ff385a4a51796429ca3461b` (2026-11-17)
- Copied: the `Report` composition and what it imports (`src/`), the beat
  visuals edition 078 uses, its custom beat (`src/custom/078/MuseSpaces.tsx`),
  and edition 078's English data (`editions/078/`: script, voice timing, GIF
  records, sources, published YouTube description).
- Not copied: `Root.tsx`, `index.ts`, `Short.tsx`, `shorts/`, `Thumbnail.tsx`,
  `Banner.tsx`, `google/`, other editions' custom beats, and the offline
  scripts. Media (audio, images, GIFs) lives outside the snapshot, in
  `../media/`.

The pipeline is not followed as it changes, and nothing here is written back to
it. If the editor ends up in real use it moves next to the pipeline and this
folder is deleted, not synced.

## Local patches

Every change from the upstream files is marked `LAB PATCH` (or `LAB FILE`):

- `src/media.tsx` (new): `staticFile`, `Img`, `OffthreadVideo` and `Audio`
  resolve through the Lab's media folder; missing files render an explicit
  placeholder (images, clips) or are left out (audio) instead of crashing.
- `src/beats/visuals.tsx`, `src/beats/edits.tsx`, `src/Intro.tsx`,
  `src/Report.tsx`: import those from `media.tsx` instead of `remotion`.
- `src/Report.tsx`: `CHROME_LEAD` is fixed to `"calendar"` (it read
  `process.env`, which does not exist in a browser).
- `src/theme.ts`: self-hosted `@fontsource` fonts instead of
  `@remotion/google-fonts`, so nothing is fetched from Google at runtime.
- `src/Report.tsx`: `CalculateMetadataFunction` imported as a type (the site's
  `verbatimModuleSyntax`).
- `src/types.ts`, `src/Report.tsx`: an optional `id` on every timed beat, set
  by the Lab's `../timeline.ts` (`b<index>`, the one place beat ids are made).
  The props below are keyed by it, and `storyStarts` returns it so a story is
  matched to its first beat by id, not by frame.
- `src/media.tsx`, `src/Report.tsx`: an optional `filters` prop (the beat's
  `id` → CSS filter) on `Report`, passed per beat through `BeatFilterContext` and
  added after the own filter of every `Img` and `OffthreadVideo` (the Lab's
  look presets).
- `src/Report.tsx`: optional `entrance` (wraps a beat's visual so the
  visitor's transition plays over the beat's first frames, inside its own
  `<Sequence>`, so no beat moves off the voice) and `noBumper` (ids of the first beats of
  stories whose generated story card a visitor transition replaces).
- `src/custom/index.ts`: hand-written with edition 078's one custom beat
  (upstream it is generated for every edition).

The frame-timed timeline the pipeline renders (`timeline.en.json`) is not in
its repository; `../timeline.ts` rebuilds it from the script and voice timing.
