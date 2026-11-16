import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import type { CollectionEntry } from "astro:content";
import type { z } from "astro/zod";
import { collections } from "../../content.config";
import { factAnchors } from "../../integrations/fact-anchors";
import { tableScroll } from "../../integrations/table-scroll";

/**
 * DEV ONLY. Fixture entries shaped exactly like the ones `getCollection`
 * returns: frontmatter parsed by the real collection schema (so defaults,
 * coercion and the building-needs-a-url rule apply), and the body rendered by
 * the same markdown pipeline as `astro.config.mjs` (Fact anchors, table wrappers, Shiki with
 * `wrap`), so `render()` from `astro:content` works on them unchanged.
 */

// Mirrors `markdown` in astro.config.mjs.
const renderer = createSatteriMarkdownProcessor({
  hastPlugins: [factAnchors, tableScroll],
  shikiConfig: { theme: "one-dark-pro", wrap: true },
});

type Collection = "blog" | "projects";

async function entry<C extends Collection>(
  collection: C,
  id: string,
  frontmatter: Record<string, unknown>,
  body: string
): Promise<CollectionEntry<C>> {
  const schema = collections[collection].schema as z.ZodType;
  const data = schema.parse(frontmatter);
  const filePath = `src/dev/fixtures/${collection}/${id}.md`;
  const { code, metadata } = await (await renderer).render(body, {
    // fact-anchors takes the owner from the file name, as for a real entry.
    fileURL: new URL(`file:///${filePath}`),
    frontmatter,
  });
  return {
    id,
    collection,
    data,
    body,
    filePath,
    rendered: { html: code, metadata: { headings: metadata.headings, frontmatter, imagePaths: [] } },
  } as unknown as CollectionEntry<C>;
}

export const post = (id: string, frontmatter: Record<string, unknown>, body = "") =>
  entry("blog", id, frontmatter, body);

export const project = (id: string, frontmatter: Record<string, unknown>, body = "") =>
  entry("projects", id, frontmatter, body);

/**
 * A stand-in screenshot as an SVG data URI, so fixtures can use odd image
 * shapes (a phone screenshot, a 4000×12000 diagram) without adding files
 * to `public/`, which would ship.
 */
export function placeholderImage(width: number, height: number, label: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#e7e2d6"/>` +
    `<rect x="4%" y="3%" width="92%" height="6%" rx="12" fill="#173f35"/>` +
    `<rect x="4%" y="12%" width="60%" height="2%" fill="#9c9483"/>` +
    `<rect x="4%" y="16%" width="85%" height="2%" fill="#9c9483"/>` +
    `<text x="50%" y="55%" font-family="sans-serif" font-size="${Math.round(width / 14)}" text-anchor="middle" fill="#173f35">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
