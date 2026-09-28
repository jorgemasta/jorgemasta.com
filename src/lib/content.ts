import { getCollection, type CollectionEntry } from "astro:content";
import { ABOUT } from "../data/about";
import { ROLES } from "../data/roles";
import { buildRegistry, type Target } from "./registry";
import { getPodcast, type Podcast } from "./tokenizados";
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

/**
 * The podcast as the homepage shows it. Fetched once per build, so the
 * homepage and the registry always agree on which Episodes are shown.
 */
let podcast: Promise<Podcast> | undefined;
export const getShownPodcast = () => (podcast ??= getPodcast({ limit: 3 }));

/** The latest episode number is the episode count; the fallback is the count on 2026-09-26. */
export const getEpisodeCount = ({ episodes }: Podcast) => episodes[0]?.number ?? 25;

/** Every place on the built site a Focus can point at. */
export async function getRegistry(): Promise<Target[]> {
  const [projects, entries, shown] = await Promise.all([
    getProjects(),
    getPosts(),
    getShownPodcast(),
  ]);
  return buildRegistry({
    projects: projects.map((project) => ({ id: project.id, body: project.body ?? "", ...project.data })),
    entries: entries.map((entry) => ({ id: entry.id, body: entry.body ?? "", ...entry.data })),
    roles: ROLES,
    episodes: shown.episodes,
    episodeCount: getEpisodeCount(shown),
    about: ABOUT,
  });
}
