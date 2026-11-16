import { markdownToHtml } from "satteri";
import { describe, expect, it } from "vitest";
import { tableScroll } from "./table-scroll";

// The plugin is synchronous, so satteri returns the result, not a promise.
const render = (markdown: string) =>
  (
    markdownToHtml(markdown, { hastPlugins: [tableScroll] }) as Exclude<
      ReturnType<typeof markdownToHtml>,
      Promise<unknown>
    >
  ).html.trim();

describe("tableScroll", () => {
  it("wraps a table in a focusable, named scroll region", () => {
    const html = render("| Year | Users |\n| --- | --- |\n| 2024 | 1,200 |\n");
    expect(html).toMatch(
      /^<div class="table-scroll" tabindex="0" role="region" aria-label="Table"><table>[\s\S]*<\/table><\/div>$/,
    );
  });

  it("wraps each table on its own", () => {
    const table = "| A |\n| - |\n| 1 |\n";
    const html = render(`${table}\nText\n\n${table}`);
    expect(html.match(/<div class="table-scroll"/g)).toHaveLength(2);
    expect(html).toContain("<p>Text</p>");
  });

  it("leaves markdown without tables alone", () => {
    expect(render("Just text.")).toBe("<p>Just text.</p>");
  });
});
