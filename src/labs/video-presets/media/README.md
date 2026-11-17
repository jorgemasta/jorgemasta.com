# Edition 78 media

Audio and images for the video-presets Lab, laid out as the pipeline's `public/`
folder: `editions/078/{real,gif,story}/…`, `editions/078/voice.en.mp3`, `sfx/*.mp3`.

Every file here is picked up at build time (`destilados-snapshot/src/media.tsx`).
A file the composition references but that is not here renders as an explicit
placeholder (images, clips) or is left out (audio). Nothing else needs to change
when media is added.
