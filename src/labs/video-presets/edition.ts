// Edition 78 (English, "Muse Spaces"), timed for the player.
import script from "./destilados-snapshot/editions/078/script.en.json";
import published from "./destilados-snapshot/editions/078/timeline.en.json";
import voice from "./destilados-snapshot/editions/078/voice.en.json";
import { buildTimeline, type Script, type Visual, type VoiceTiming } from "./timeline";

export const EDITION = "078";

/**
 * Length of `media/editions/078/voice.en.mp3`, as the pipeline measures it
 * (`ffprobe` format duration): 6351 MPEG frames × 1152 samples / 44.1 kHz,
 * from the file's LAME Info header.
 */
export const VOICE_DURATION_SEC = (6351 * 1152) / 44100;

// The pipeline fills each visual in after writing the script (image sizes, OCR
// text boxes, GIF credits); the published render's timeline carries them.
const rendered: Script = {
  ...(script as Script),
  beats: (script as Script).beats.map((beat, i) => ({ ...beat, visual: published.beats[i].visual as Visual })),
};

export const edition78 = buildTimeline(rendered, voice as VoiceTiming, {
  lang: "en",
  audio: `editions/${EDITION}/voice.en.mp3`,
  voiceDurationSec: VOICE_DURATION_SEC,
});
