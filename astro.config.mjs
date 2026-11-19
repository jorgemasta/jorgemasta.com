// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import checkImages from "./src/integrations/check-images";
import dataToggle from "./src/dev/data-toggle";
import { tableScroll } from "./src/integrations/table-scroll";

// Site fonts: the latin and latin-ext files of the installed Fontsource packages,
// with Fontsource's own unicode ranges, so latin-ext loads only when a page needs it.
/** @param {"latin" | "latin-ext"} subset */
const inter = (subset) => `./node_modules/@fontsource-variable/inter/files/inter-${subset}-wght-normal.woff2`;
/** @param {"latin" | "latin-ext"} subset */
const newsreader = (subset) =>
  `./node_modules/@fontsource-variable/newsreader/files/newsreader-${subset}-opsz-normal.woff2`;
/** @type {[string, ...string[]]} */
const LATIN = [
  "U+0000-00FF", "U+0131", "U+0152-0153", "U+02BB-02BC", "U+02C6", "U+02DA", "U+02DC", "U+0304", "U+0308",
  "U+0329", "U+2000-206F", "U+20AC", "U+2122", "U+2191", "U+2193", "U+2212", "U+2215", "U+FEFF", "U+FFFD",
];
/** @type {[string, ...string[]]} */
const LATIN_EXT = [
  "U+0100-02BA", "U+02BD-02C5", "U+02C7-02CC", "U+02CE-02D7", "U+02DD-02FF", "U+0304", "U+0308", "U+0329",
  "U+1D00-1DBF", "U+1E00-1E9F", "U+1EF2-1EFF", "U+2020", "U+20A0-20AB", "U+20AD-20C0", "U+2113", "U+2C60-2C7F",
  "U+A720-A7FF",
];

export default defineConfig({
  site: "https://jorgemasta.com",
  // React only renders the Lab island; pages without an island ship no script.
  integrations: [react(), checkImages(), dataToggle()],
  /*
   * Astro generates a metric-matched fallback for each family (size-adjust and
   * ascent overrides on Arial / Times New Roman), so the swap barely reflows
   * text. BaseHead preloads the latin files so the swap usually lands before
   * first paint.
   */
  fonts: [
    {
      name: "Inter Variable",
      cssVariable: "--font-inter",
      provider: fontProviders.local(),
      options: {
        variants: [
          { src: [inter("latin")], weight: "100 900", style: "normal", unicodeRange: LATIN },
          { src: [inter("latin-ext")], weight: "100 900", style: "normal", unicodeRange: LATIN_EXT },
        ],
      },
      display: "swap",
      fallbacks: ["sans-serif"],
    },
    {
      name: "Newsreader Variable",
      cssVariable: "--font-newsreader",
      provider: fontProviders.local(),
      options: {
        variants: [
          { src: [newsreader("latin")], weight: "200 800", style: "normal", unicodeRange: LATIN },
          { src: [newsreader("latin-ext")], weight: "200 800", style: "normal", unicodeRange: LATIN_EXT },
        ],
      },
      display: "swap",
      fallbacks: ["serif"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    // Dev only: pre-bundle the React island renderer with react-dom/client (CommonJS),
    // otherwise the dev server serves it unbundled and hydration fails.
    optimizeDeps: { include: ["@astrojs/react/client.js", "react-dom/client"] },
  },
  markdown: {
    processor: satteri({ hastPlugins: [tableScroll] }),
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
});
