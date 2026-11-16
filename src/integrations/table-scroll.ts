import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";

type HastPlugin = NonNullable<SatteriProcessorOptions["hastPlugins"]>[number];

/**
 * Wraps each markdown table in a scroll container, so a wide table scrolls
 * sideways inside the page instead of pushing it wider than a phone.
 *
 * The container takes keyboard focus and has a name, so keyboard and screen
 * reader users can reach and scroll the hidden columns too.
 */
export const tableScroll: HastPlugin = {
  name: "table-scroll",
  element: {
    filter: ["table"],
    visit(node, ctx) {
      ctx.wrapNode(node, {
        type: "element",
        tagName: "div",
        properties: {
          className: ["table-scroll"],
          tabIndex: 0,
          role: "region",
          ariaLabel: "Table",
        },
        children: [],
      });
    },
  },
};
