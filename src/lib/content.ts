import { getCollection, type CollectionEntry } from "astro:content";

/** Drafts are visible while developing, never in a build. */
const isVisible = ({ data }: { data: { draft: boolean } }) =>
  import.meta.env.DEV || !data.draft;

const newestFirst = (
  a: { data: { publishedAt: Date } },
  b: { data: { publishedAt: Date } }
) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime();

/** Blog entries that belong on the site, newest first. */
export async function getPosts(): Promise<CollectionEntry<"blog">[]> {
  return (await getCollection("blog", isVisible)).sort(newestFirst);
}

/** Projects that belong on the site, newest first. */
export async function getProjects(): Promise<CollectionEntry<"projects">[]> {
  return (await getCollection("projects", isVisible)).sort(newestFirst);
}
