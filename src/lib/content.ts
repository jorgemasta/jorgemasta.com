import { getCollection, type CollectionEntry } from "astro:content";
import { getProjectUrl, isOlderThanOneYear } from "./utils";

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

/** Published entries recent enough not to be Archive, newest first. */
export async function getCurrentPosts(): Promise<CollectionEntry<"blog">[]> {
  return (await getPosts()).filter((post) => !isOlderThanOneYear(post.data.publishedAt));
}

/** A building project is current work: it links out and has no detail page yet. */
export const isBuilding = (project: CollectionEntry<"projects">) =>
  project.data.status === "building";

/** Building projects link out to their live site; earlier ones to their detail page. */
export function getProjectHref(project: CollectionEntry<"projects">): string {
  return isBuilding(project) && project.data.url
    ? project.data.url
    : getProjectUrl(project.id);
}
