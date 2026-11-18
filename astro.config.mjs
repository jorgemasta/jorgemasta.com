// @ts-check
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import checkImages from "./src/integrations/check-images";
import dataToggle from "./src/dev/data-toggle";
import { tableScroll } from "./src/integrations/table-scroll";

export default defineConfig({
  site: "https://jorgemasta.com",
  // React only renders the Lab island; pages without an island ship no script.
  integrations: [react(), checkImages(), dataToggle()],
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
