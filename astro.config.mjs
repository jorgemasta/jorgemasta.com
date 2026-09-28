// @ts-check
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import tailwindcss from "@tailwindcss/vite";
import checkRegistry from "./src/integrations/check-registry";
import { factAnchors } from "./src/integrations/fact-anchors";

export default defineConfig({
  site: "https://jorgemasta.com",
  integrations: [checkRegistry()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: satteri({ hastPlugins: [factAnchors] }),
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
});
