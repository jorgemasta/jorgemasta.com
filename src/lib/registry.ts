import { ABOUT_ID } from "../data/about";
import type { Role } from "../data/roles";
import { TOKENIZADOS } from "./consts";
import { factsInMarkdown, factsInProse, proseText, withoutFactMarkup, type Fact, type Prose } from "./facts";
import type { Episode } from "./tokenizados";
import { getBlogUrl, getProjectUrl, isOlderThanOneYear } from "./utils";

/**
 * A place on the site a Focus can point at. The Concierge's Worker reads the
 * text as its corpus; the client resolves an id to its page and anchor.
 */
export type Target = {
  /** Stable: it appears in `[[id]]` references and in shared links. */
  id: string;
  kind: "project" | "entry" | "role" | "fact" | "episode" | "tokenizados";
  /** The site-relative page the target is rendered on. */
  path: string;
  /** The element id of the target on that page. */
  anchor: string;
  /** What the Concierge may say about it: only what the page shows. */
  text: string;
};

export type RegistryInput = {
  projects: {
    id: string;
    title: string;
    excerpt: string;
    body: string;
    status: "building" | "earlier";
    stats: { value: string; label: string }[];
  }[];
  entries: { id: string; title: string; excerpt: string; body: string; publishedAt: Date }[];
  roles: Role[];
  /** Only the Episodes the homepage shows. */
  episodes: Episode[];
  episodeCount: number;
  /** The About paragraphs on the homepage. */
  about: Prose[];
};

/** Element ids for targets, shared by the pages that render them and the registry. */
export const anchors = {
  project: (id: string) => `project-${id}`,
  entry: (id: string) => `entry-${id}`,
  role: (id: string) => `role-${id}`,
  // `--` keeps `a-b` + `c` apart from `a` + `b-c`: names are slugs without it.
  fact: (owner: string, name: string) => `fact-${owner}--${name}`,
  episode: (number: number) => `episode-${number}`,
  tokenizados: "tokenizados",
};

const FACT_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** An owner's Facts, placed on the owner's page. */
const factTargets = (owner: { id: string; title: string; path: string }, facts: Fact[]) =>
  facts.map((fact): Target => {
    if (!FACT_NAME.test(fact.name)) {
      throw new Error(
        `Fact "${owner.id}/${fact.name}" needs a lowercase slug name, like "mcp" or "canary-islands".`
      );
    }
    return {
      id: `${owner.id}/${fact.name}`,
      kind: "fact",
      path: owner.path,
      anchor: anchors.fact(owner.id, fact.name),
      text: `${owner.title}: ${fact.text}`,
    };
  });

const paragraphs = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n\n");

/**
 * Every place on the site a Focus can point at, in page order.
 *
 * Throws on duplicate ids, so the build fails before a Focus can point at the
 * wrong place.
 */
export function buildRegistry(input: RegistryInput): Target[] {
  const targets: Target[] = [
    ...input.projects.flatMap((project): Target[] => {
      const building = project.status === "building";
      // Building projects link out and are shown on the homepage; Earlier work has its own page.
      const path = building ? "/" : getProjectUrl(project.id);
      const target: Target = {
        id: project.id,
        kind: "project",
        path,
        anchor: anchors.project(project.id),
        text: paragraphs(
          `${project.title} (${building ? "building now" : "Earlier work"}): ${project.excerpt}`,
          withoutFactMarkup(project.body).trim(),
          // Stats are only rendered for building projects.
          building &&
            project.stats.length > 0 &&
            project.stats.map((stat) => `${stat.value} ${stat.label}`).join("; ")
        ),
      };
      return [target, ...factTargets({ ...project, path }, factsInMarkdown(project.id, project.body))];
    }),
    ...input.entries.flatMap((entry): Target[] => {
      const path = getBlogUrl(entry.id, entry.publishedAt);
      const target: Target = {
        id: entry.id,
        kind: "entry",
        path,
        anchor: anchors.entry(entry.id),
        text: paragraphs(
          `${entry.title} (${entry.publishedAt.toISOString().slice(0, 10)}${
            isOlderThanOneYear(entry.publishedAt) ? ", Archive" : ""
          }): ${entry.excerpt}`,
          withoutFactMarkup(entry.body).trim()
        ),
      };
      return [target, ...factTargets({ ...entry, path }, factsInMarkdown(entry.id, entry.body))];
    }),
    ...input.roles.flatMap((role): Target[] => [
      {
        id: role.id,
        kind: "role",
        path: "/",
        anchor: anchors.role(role.id),
        text: `${role.title}, ${role.company}, ${role.start} – ${role.end ?? "now"}. ${proseText(role.impact)}`,
      },
      ...factTargets({ id: role.id, title: role.company, path: "/" }, factsInProse(role.impact)),
    ]),
    ...input.episodes.map((episode): Target => ({
      id: anchors.episode(episode.number),
      kind: "episode",
      path: "/",
      anchor: anchors.episode(episode.number),
      text: `Tokenizados #${episode.number} (${episode.date.toISOString().slice(0, 10)}): ${episode.title}`,
    })),
    {
      id: "tokenizados",
      kind: "tokenizados",
      path: "/",
      anchor: anchors.tokenizados,
      text: `Tokenizados: ${TOKENIZADOS.about} ${TOKENIZADOS.episodesSince(input.episodeCount)}`,
    },
    ...factTargets({ id: ABOUT_ID, title: "About Jorge", path: "/" }, input.about.flatMap(factsInProse)),
  ];

  const seen = new Map<string, Target>();
  for (const target of targets) {
    const first = seen.get(target.id);
    if (first) {
      throw new Error(
        `Duplicate target id "${target.id}": used by a ${first.kind} and a ${target.kind}. ` +
          "Target ids must be unique across the site; give one of them a different id."
      );
    }
    seen.set(target.id, target);
  }
  return targets;
}

/**
 * Targets whose anchor isn't in the built page they point to, including those
 * whose page wasn't built at all (`readPage` returns undefined).
 */
export function findMissingAnchors(
  registry: Target[],
  readPage: (path: string) => string | undefined
): Target[] {
  return registry.filter((target) => {
    const html = readPage(target.path);
    const id = target.anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return !html || !new RegExp(`\\sid=["']?${id}(["'\\s>])`).test(html);
  });
}
