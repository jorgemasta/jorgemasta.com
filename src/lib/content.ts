import { getCollection, type CollectionEntry } from "astro:content";
import { ABOUT } from "../data/about";
import { ROLES, type Role } from "../data/roles";
import { getPodcast, type Podcast } from "./tokenizados";
import { getProjectUrl, isOlderThanOneYear } from "./utils";

/** Drafts are visible while developing, never in a build. */
const isVisible = ({ data }: { data: { draft: boolean } }) =>
  import.meta.env.DEV || !data.draft;

/**
 * The break-ui fixture set picked with `?data=` in `astro dev`, or null for the
 * real content. Behind `import.meta.env.DEV`, so a build never includes it.
 */
const devData = async () => (import.meta.env.DEV ? (await import("../dev/fixtures")).getDevData() : null);

type Dated = { data: { publishedAt: Date } };
const newestFirst = (a: Dated, b: Dated) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime();
const oldestFirst = (a: Dated, b: Dated) => newestFirst(b, a);

/** Scheduled entries are visible while developing, and appear in the first build on or after their date. */
const isPublished = ({ data }: { data: { publishedAt: Date } }) =>
  import.meta.env.DEV || data.publishedAt.getTime() <= Date.now();

/** Blog entries that belong on the site, newest first. */
export async function getPosts(): Promise<CollectionEntry<"blog">[]> {
  const dev = await devData();
  const posts = dev ? dev.posts.filter(isVisible) : await getCollection("blog", isVisible);
  return posts.filter(isPublished).sort(newestFirst);
}

/** Projects that belong on the site, newest first. */
export async function getProjects(): Promise<CollectionEntry<"projects">[]> {
  const dev = await devData();
  return (dev ? dev.projects.filter(isVisible) : await getCollection("projects", isVisible)).sort(newestFirst);
}

/** Labs that belong on the site, newest first: the homepage rows and /lab/ both list these. */
export async function getLabs(): Promise<CollectionEntry<"labs">[]> {
  const dev = await devData();
  return (dev ? dev.labs.filter(isVisible) : await getCollection("labs", isVisible)).sort(newestFirst);
}

/** Where Jorge worked, most recent first. */
export async function getRoles(): Promise<Role[]> {
  return (await devData())?.roles ?? ROLES;
}

/** The About paragraphs. */
export async function getAbout(): Promise<string[]> {
  return (await devData())?.about ?? ABOUT;
}

/** Published entries recent enough not to be Archive, newest first. */
export async function getCurrentPosts(): Promise<CollectionEntry<"blog">[]> {
  return (await getPosts()).filter((post) => !isOlderThanOneYear(post.data.publishedAt));
}

/** A building project is current work: it links out and has no detail page yet. */
export const isBuilding = (project: CollectionEntry<"projects">) =>
  project.data.status === "building";

/** Whether a project gets a page at /projects/[slug]/: everything but building projects. */
export const hasDetailPage = (project: CollectionEntry<"projects">) => !isBuilding(project);

/**
 * The Projects the homepage shows: what Jorge is building, oldest first so the
 * longest-running product leads, then the Earlier work picked for the homepage
 * (`featured`), newest first. Every Project stays on /projects either way.
 */
export async function getHomepageProjects() {
  const projects = await getProjects();
  return {
    building: projects.filter(isBuilding).sort(oldestFirst),
    earlier: projects.filter((project) => !isBuilding(project) && project.data.featured).sort(newestFirst),
  };
}

/** Building projects link out to their live site; earlier ones to their detail page. */
export function getProjectHref(project: CollectionEntry<"projects">): string {
  if (hasDetailPage(project)) return getProjectUrl(project.id);
  // The schema requires a url for building projects; a missing one must not become a 404 link.
  if (!project.data.url) throw new Error(`Project "${project.id}" has no detail page and no url`);
  return project.data.url;
}

/** The podcast as the homepage shows it. Fetched once per build. */
let podcast: Promise<Podcast> | undefined;
export async function getShownPodcast(): Promise<Podcast> {
  return (await devData())?.podcast ?? (podcast ??= getPodcast({ limit: 3 }));
}

/** The complete episodes in the feed; the fallback, when the feed can't be read, is the count on 2026-09-26. */
export const getEpisodeCount = ({ count }: Podcast) => (count > 0 ? count : 25);
