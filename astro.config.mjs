// @ts-check
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import checkImages from "./src/integrations/check-images";
import checkRegistry from "./src/integrations/check-registry";
import dataToggle from "./src/dev/data-toggle";
import { factAnchors } from "./src/integrations/fact-anchors";
import { tableScroll } from "./src/integrations/table-scroll";

export default defineConfig({
  site: "https://jorgemasta.com",
  integrations: [react(), checkRegistry(), checkImages(), dataToggle()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: satteri({ hastPlugins: [factAnchors, tableScroll] }),
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
});
