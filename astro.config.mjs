// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import checkRegistry from "./src/integrations/check-registry";

export default defineConfig({
  site: "https://jorgemasta.com",
  integrations: [checkRegistry()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
});
