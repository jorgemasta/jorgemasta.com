// Edition 78 (English, "Muse Spaces"), timed for the player.
import script from "./destilados-snapshot/editions/078/script.en.json";
import voice from "./destilados-snapshot/editions/078/voice.en.json";
import { buildTimeline, type Script, type VoiceTiming } from "./timeline";

export const EDITION = "078";

export const edition78 = buildTimeline(script as Script, voice as VoiceTiming, {
  lang: "en",
  audio: `editions/${EDITION}/voice.en.mp3`,
});
