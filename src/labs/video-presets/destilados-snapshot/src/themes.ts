// Per-edition theme seed (Antonio, 5 Nov 2026: «Quiero que los vídeos se vean únicos entre sí»). Six brand presets: a
// secondary accent, a subtle background texture and the story-transition style. The violet brand (accent, top bar,
// logo) never changes. script.json `theme` picks one; without it the edition date hashes to one (stable).
// Pure module: check-script imports it too (Node strips the types), so the warning and the render agree.
export const THEMES = ["violet-grain", "cyan-grid", "amber-paper", "green-gradient", "pink-scan", "white-blueprint"] as const;
export type ThemeName = (typeof THEMES)[number];
export type Texture = "grain" | "grid" | "paper" | "gradient" | "scan" | "blueprint";
export type Transition = "glitch" | "wipe" | "zoom" | "band";
export type ThemePreset = { accent2: string; texture: Texture; transition: Transition };

export const PRESETS: Record<ThemeName, ThemePreset> = {
  "violet-grain": { accent2: "#5cf08a", texture: "grain", transition: "glitch" }, // the 4 Nov look
  "cyan-grid": { accent2: "#4fd1ff", texture: "grid", transition: "wipe" },
  "amber-paper": { accent2: "#ffb547", texture: "paper", transition: "band" },
  "green-gradient": { accent2: "#5cf08a", texture: "gradient", transition: "zoom" },
  "pink-scan": { accent2: "#f472b6", texture: "scan", transition: "glitch" },
  "white-blueprint": { accent2: "#e8eefc", texture: "blueprint", transition: "wipe" },
};

export const seedTheme = (date: string): ThemeName => THEMES[[...String(date ?? "")].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % THEMES.length];
export const themeOf = (s: { theme?: string; date?: string }): ThemeName =>
  s.theme && (THEMES as readonly string[]).includes(s.theme) ? (s.theme as ThemeName) : seedTheme(s.date ?? "");
