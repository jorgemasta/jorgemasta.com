import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { REGISTRY_PATH } from "../lib/consts";
import { findMissingAnchors, type Target } from "../lib/registry";

/**
 * Fails the build when a registry target's anchor isn't in the page it points
 * to, so a Focus can never scroll to something that isn't there.
 */
export default function checkRegistry(): AstroIntegration {
  return {
    name: "check-registry",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const file = (path: string) => fileURLToPath(new URL(`.${path}`, dir));
        const registry: Target[] = JSON.parse(readFileSync(file(REGISTRY_PATH), "utf8"));
        const readPage = (path: string) => {
          const page = file(`${path}index.html`);
          return existsSync(page) ? readFileSync(page, "utf8") : undefined;
        };

        const missing = findMissingAnchors(registry, readPage);
        if (missing.length > 0) {
          throw new Error(
            "Registry targets missing from their page:\n" +
              missing.map((t) => `  - ${t.id}: #${t.anchor} on ${t.path}`).join("\n")
          );
        }
      },
    },
  };
}
