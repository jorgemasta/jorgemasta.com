// @ts-check
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import tailwindcss from "@tailwindcss/vite";
import checkImages from "./src/integrations/check-images";
import dataToggle from "./src/dev/data-toggle";
import { tableScroll } from "./src/integrations/table-scroll";

export default defineConfig({
  site: "https://jorgemasta.com",
  integrations: [checkImages(), dataToggle()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: satteri({ hastPlugins: [tableScroll] }),
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
});
