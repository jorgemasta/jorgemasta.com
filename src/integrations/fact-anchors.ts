import { basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";
import { MARKDOWN_FACT_OPENING } from "../lib/facts";
import { anchors } from "../lib/registry";

type HastPlugin = NonNullable<SatteriProcessorOptions["hastPlugins"]>[number];

/**
 * Gives each Fact annotated in a markdown body its anchor, so the passage
 * renders like plain text plus an id: `<span data-fact="mcp">` in
 * `padelful.md` becomes `<span id="fact-padelful-mcp">`.
 *
 * The owner is the entry's id, which the glob loader takes from the file name.
 * `check-registry` fails the build if the two ever disagree.
 */
export const factAnchors: HastPlugin = ({ fileURL }) => {
  if (!fileURL) return null;
  const owner = basename(fileURLToPath(fileURL), extname(fileURL.pathname));
  return {
    name: "fact-anchors",
    raw(node) {
      const name = node.value.match(MARKDOWN_FACT_OPENING)?.[1];
      if (name === undefined) return;
      return { type: "raw", value: `<span id="${anchors.fact(owner, name)}">` };
    },
  };
};
