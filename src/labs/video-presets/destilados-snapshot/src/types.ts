// Visual vocabulary of a beat. script.json (written by the skill) uses these;
// scripts/check-script.mjs validates them against the same list.

export type Motion = "zoom" | "punch" | "shake" | "pan" | "still";

export type Visual =
  | { type: "title"; text: string; sub?: string }
  | {
      type: "text";
      text: string;
      highlight?: string;
      style?: "pop" | "type" | "strike";
    }
  | {
      type: "number";
      value: number;
      prefix?: string;
      suffix?: string;
      label?: string;
      decimals?: number;
      image?: string; // 4 Nov 2026: the source screenshot, blurred behind the figure ("cifra en contexto")
    }
  | ({ type: "image"; image: string; caption?: string; motion?: Motion } & ImageEdit)
  // A real animated GIF / reaction meme from GIPHY ("gif:<name>" → public/editions/NNN/gif/<name>.mp4, made by
  // scripts/gif.mjs). Framed over a blurred copy by default; "full" fills the frame. top/bottom = Impact meme text.
  | {
      type: "gif";
      gif: string;
      caption?: string;
      top?: string;
      bottom?: string;
      layout?: "framed" | "full";
      credit?: string; // filled from gifs.json by voice.mjs ("via GIPHY · The Simpsons")
      iw?: number;
      ih?: number;
    }
  | { type: "meme"; image: string; top?: string; bottom?: string }
  | {
      type: "story";
      headline: string;
      source: string;
      image?: string;
      highlight?: string;
      iw?: number; // natural size, filled by voice.mjs / render.mjs
      ih?: number;
    }
  | {
      type: "code";
      file: string;
      lang?: string;
      code: string;
      highlight?: number[];
    }
  | { type: "terminal"; lines: string[] }
  // steps (4 Nov 2026): build the diagram one node per sentence. true → spread over the beat; number[] → seconds from beat start.
  | { type: "diagram"; nodes: string[]; caption?: string; steps?: boolean | number[] }
  // timeline (4 Nov 2026): 3–5 dated milestones that build in one by one ("how we got here").
  | { type: "timeline"; title?: string; items: { date: string; label: string }[]; steps?: boolean | number[]; caption?: string; story?: number }
  | {
      type: "chart";
      title: string;
      bars: { label: string; value: number; highlight?: boolean }[];
      unit?: string;
    }
  // 5 Nov 2026 (unique slides): callouts = labelled parts on a real photo (instead of a box flow); slider = two real
  // images with a sweeping divider (instead of an image VS); scale = area ∝ value (instead of a number VS).
  // 15 Nov 2026: scale shape "range" = low / marked central / high of an uncertainty range (086 METR 1,3×–3×).
  | { type: "callouts"; image: string; points: { at: [number, number]; label: string; sub?: string; side?: "left" | "right" }[]; title?: string; steps?: boolean | number[]; iw?: number; ih?: number }
  | { type: "slider"; left: { image: string; label?: string }; right: { image: string; label?: string }; from?: number; to?: number; fit?: "cover" | "contain"; caption?: string }
  | { type: "scale"; items: { value: number; label: string; display?: string; color?: string; highlight?: boolean }[]; shape?: "circle" | "bar" | "range"; title?: string; caption?: string; steps?: boolean | number[] }
  | { type: "versus"; left: string; right: string; leftImage?: string; rightImage?: string; verdict?: string }
  | { type: "clip"; video: string; caption?: string; start?: number }
  | { type: "sequence"; title?: string; items: { image: string; caption: string }[] }
  | { type: "list"; title?: string; items: string[]; stamp?: string }
  | { type: "quote"; text: string; author: string }
  | { type: "emoji"; emoji: string; caption?: string }
  | { type: "mascot"; mood: Mood; caption?: string }
  | { type: "logo"; name: string; image?: string; sub?: string }
  // custom (4 Nov 2026): a per-edition animation, src/custom/<NNN>/<component>.tsx. fallback = title text if it fails.
  | { type: "custom"; component: string; props?: Record<string, unknown>; fallback?: string; story?: number };

// ---- Image edits (27 Oct 2026): make a real image say exactly what the story means. ----
// All coordinates are fractions (0–1) of the SOURCE image: [x, y, w, h] boxes and [x, y] points, measured on the file.
export type Rect = [number, number, number, number];
export type Point = [number, number];
export type MarkColor = "accent" | "green" | "amber" | "red" | "white";
export type Mark =
  | { type: "highlight" | "circle" | "box"; at: Rect; label?: string; labelAt?: Point /* force the sticker centre; default: auto, off the OCR text */; text?: string /* exact text under `at`, OCR-checked by check-script */; color?: MarkColor; delay?: number }
  | { type: "arrow"; to: Point; from?: Point; label?: string; labelAt?: Point; color?: MarkColor; delay?: number }
  | { type: "label"; at: Point; text: string; color?: MarkColor; delay?: number };
export type ImageEdit = {
  focus?: Rect; // crop/zoom: pushes in from the whole image to this region in the first ~0.6 s
  marks?: Mark[]; // highlight marker band (phrases), circle (one figure), box, arrow, label sticker — drawn on in order
  spotlight?: Rect | { at: Rect; shape?: "circle" | "box" }; // everything outside is dimmed
  dim?: "darken" | "blur" | "both"; // how the spotlight treats the rest (default darken: context stays readable)
  label?: string; // this image's label in a side-by-side (e.g. "Hace un año")
  with?: { image: string; label?: string; focus?: Rect; marks?: Mark[]; textBoxes?: Rect[]; iw?: number; ih?: number }; // side-by-side composite
  textBoxes?: Rect[]; // OCR line bboxes (0–1), filled into the timeline by scripts/text-boxes.mjs; labels avoid them
  iw?: number; // natural size, filled by voice.mjs
  ih?: number;
};

export type Mood =
  | "neutral"
  | "shocked"
  | "smug"
  | "facepalm"
  | "money"
  | "panic"
  | "thinking"
  | "fire";

export type Sfx =
  | "whoosh"
  | "pop"
  | "boom"
  | "ding"
  | "scratch"
  | "click"
  | "cash"
  | "glitch"
  | "typing";

export type ScriptBeat = { say: string; visual: Visual; sfx?: Sfx; chapter?: string };

export type Script = {
  edition: number;
  date: string; // YYYY-MM-DD
  title: string; // YouTube title
  coldOpenBeats: number; // beats before the intro sting
  coldOpenChapter?: string; // YouTube chapter name at 00:00 (the hook), distinct from every story chapter
  theme?: string; // one of src/themes.ts THEMES; omitted = hashed from date
  images: Record<string, string>; // id → prompt, referenced as "img:<id>"
  beats: ScriptBeat[];
};

// timeline.json = script + timing, in video frames (intro already inserted).
export type TimedBeat = ScriptBeat & {
  id?: string; // LAB PATCH: the Lab's beat id, keying the visitor's looks and transitions
  from: number;
  to: number;
  chapter?: string;
};

export type Timeline = {
  edition: number;
  lang: "en" | "es";
  date: string;
  title: string;
  coldOpenChapter?: string; // 00:00 chapter name (from the script)
  audio: string; // staticFile path
  introAtFrame: number; // video frame where the intro starts
  introGapFrames?: number; // silence after the intro before the voice resumes
  voiceSplitSec: number; // voice-audio seconds where the cold open ends
  durationInFrames: number;
  beats: TimedBeat[];
  theme?: string; // copied from script.json by scripts/text-boxes.mjs; else derived from `date` (src/themes.ts)
};
