import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

/**
 * Fails the build when a page shows a site image that isn't in the build, so
 * a typo in a `mainImage.src` or a markdown image can't ship as a broken icon.
 */
export default function checkImages(): AstroIntegration {
  return {
    name: "check-images",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const root = fileURLToPath(dir);
        const missing = new Set<string>();
        const pages = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));
        for (const page of pages) {
          const html = readFileSync(`${root}/${page}`, "utf8");
          for (const [, src] of html.matchAll(/<img\b[^>]*?\ssrc="(\/[^"/][^"]*)"/g)) {
            const path = decodeURIComponent(src.split(/[?#]/)[0]);
            if (!existsSync(`${root}${path}`)) missing.add(`  - ${src} on /${page}`);
          }
        }
        if (missing.size > 0) {
          throw new Error(`Images missing from the build:\n${[...missing].join("\n")}`);
        }
      },
    },
  };
}
