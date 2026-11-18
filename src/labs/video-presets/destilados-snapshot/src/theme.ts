// LAB PATCH: self-hosted @fontsource fonts instead of @remotion/google-fonts (no runtime Google Fonts fetch).
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-grotesk/latin-ext-500.css";
import "@fontsource/space-grotesk/latin-ext-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-ext-700.css";
import "@fontsource/anton/latin-400.css";
import "@fontsource/anton/latin-ext-400.css";

// Show name and per-language strings live in i18n.ts; the mark in Logo.tsx.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const display = "'Space Grotesk', sans-serif";
export const mono = "'JetBrains Mono', monospace";
export const impact = "Anton, Impact, sans-serif";

// Video palette: near-black with a violet cast, violet accent (chosen 2026-10-04).
// accentDeep is for fills behind white text (contrast); accent for strokes, glows and type on dark.
export const color = {
  bg: "#0c0b10",
  bg2: "#14121b",
  card: "#1b1924",
  rule: "#2a2735",
  ink: "#f4f2fa",
  body: "#d2cfdc",
  muted: "#8d89a0",
  accent: "#a78bfa",
  accentDeep: "#7c3aed",
  accentSoft: "#c4b5fd",
  amber: "#ffb547",
  cyan: "#4fd1ff",
  green: "#5cf08a",
  purple: "#f472b6", // code keywords; pink so it doesn't blur into the violet accent
};

export const alpha = (c: string, a: number) =>
  `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;

export const sec = (s: number) => Math.round(s * FPS);

// Intro sting length (frames). The voice pauses while it plays.
export const INTRO_FRAMES = sec(3.5);

// Top ticker (lower-thirds moved to the top: YouTube's player controls cover the bottom ~120 px).
// Everything placed near the top of a 16:9 frame must start below SAFE_TOP.
export const CHROME_TOP = 30;
export const CHROME_H = 88; // 4 Nov 2026: calendar + logo + 60 px story title pill
export const SAFE_TOP = CHROME_TOP + CHROME_H + 26; // 144
