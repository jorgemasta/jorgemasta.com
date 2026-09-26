import { defineCollection, z } from "astro:content";
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
    /** A note is podcast-derived and short; an article stands on its own. */
    type: z.enum(["note", "article"]).default("note"),
    /** Link to the Tokenizados episode a note came from. */
    episode: z.string().url().optional(),
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
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, projects };
