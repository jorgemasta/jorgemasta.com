import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const mainImage = z
  .object({
    src: z.string(),
    alt: z.string(),
  })
  .optional();

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.coerce.date(),
    excerpt: z.string(),
    mainImage,
    /**
     * A note is short, first-hand writing about something built, tested or
     * observed; an article is long-form and stands on its own.
     */
    type: z.enum(["note", "article"]).default("note"),
    /** Optional provenance: the Tokenizados episode a note came from. */
    episode: z.url().optional(),
    /** Replaces the CMS publish toggle: drafts are excluded from the build. */
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.coerce.date(),
    excerpt: z.string(),
    mainImage,
    featured: z.boolean().default(false),
    /**
     * `building` projects are current: they link out to their live site and
     * get no detail page. `earlier` projects are history with a detail page.
     */
    status: z.enum(["building", "earlier"]).default("earlier"),
    /** The live site. */
    url: z.url().optional(),
    /** Concrete numbers, shown as they are: numbers over adjectives. */
    stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    /** Secondary links such as docs or packages. */
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    draft: z.boolean().default(false),
  }).refine((p) => p.status !== "building" || p.url, {
    message: "A building project links out, so it needs a url",
    path: ["url"],
  }),
});

export const collections = { blog, projects };
