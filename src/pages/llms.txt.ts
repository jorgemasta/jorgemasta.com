import type { CollectionEntry } from "astro:content";
import { getPosts, getProjectHref, getProjects } from "../lib/content";
import { getBlogUrl } from "../lib/utils";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_URL } from "../lib/consts";

type Link = { title: string; url: string; description: string };

/** Site-relative paths are made absolute; external URLs pass through. */
const absolute = (url: string) => new URL(url, SITE_URL).href;

/** An llms.txt section (https://llmstxt.org); empty sections are dropped. */
const section = (heading: string, links: Link[]) =>
  links.length === 0
    ? []
    : [
        `## ${heading}`,
        "",
        ...links.map((l) => `- [${l.title}](${absolute(l.url)}): ${l.description}`),
        "",
      ];

/** Generated at build time, so it lists every published entry without upkeep. */
export async function GET() {
  const [posts, projects] = await Promise.all([getPosts(), getProjects()]);

  const postLinks = (type: CollectionEntry<"blog">["data"]["type"]) =>
    posts
      .filter((post) => post.data.type === type)
      .map((post) => ({
        title: post.data.title,
        url: getBlogUrl(post.id, post.data.publishedAt),
        description: post.data.excerpt,
      }));

  const body = [
    `# ${SITE_AUTHOR}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    ...section("Notes", postLinks("note")),
    ...section("Articles", postLinks("article")),
    ...section(
      "Projects",
      projects.map((project) => ({
        title: project.data.title,
        url: getProjectHref(project),
        description: project.data.excerpt,
      }))
    ),
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
