import type { Role } from "../data/roles";
import { TOKENIZADOS } from "./consts";
import type { Episode } from "./tokenizados";
import { getBlogUrl, getProjectUrl, isOlderThanOneYear } from "./utils";

/**
 * A place on the site a Focus can point at. The Concierge's Worker reads the
 * text as its corpus; the client resolves an id to its page and anchor.
 */
export type Target = {
  /** Stable: it appears in `[[id]]` references and in shared links. */
  id: string;
  kind: "project" | "entry" | "role" | "episode" | "tokenizados";
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
};

/** Element ids for targets, shared by the pages that render them and the registry. */
export const anchors = {
  project: (id: string) => `project-${id}`,
  entry: (id: string) => `entry-${id}`,
  role: (id: string) => `role-${id}`,
  episode: (number: number) => `episode-${number}`,
  tokenizados: "tokenizados",
};

const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n\n");

/**
 * Every place on the site a Focus can point at, in page order.
 *
 * Throws on duplicate ids, so the build fails before a Focus can point at the
 * wrong place.
 */
export function buildRegistry(input: RegistryInput): Target[] {
  const targets: Target[] = [
    ...input.projects.map((project): Target => {
      const building = project.status === "building";
      return {
        id: project.id,
        kind: "project",
        // Building projects link out and are shown on the homepage; Earlier work has its own page.
        path: building ? "/" : getProjectUrl(project.id),
        anchor: anchors.project(project.id),
        text: lines(
          `${project.title} (${building ? "building now" : "Earlier work"}): ${project.excerpt}`,
          project.body.trim(),
          // Stats are only rendered for building projects.
          building &&
            project.stats.length > 0 &&
            project.stats.map((stat) => `${stat.value} ${stat.label}`).join("; ")
        ),
      };
    }),
    ...input.entries.map((entry): Target => ({
      id: entry.id,
      kind: "entry",
      path: getBlogUrl(entry.id, entry.publishedAt),
      anchor: anchors.entry(entry.id),
      text: lines(
        `${entry.title} (${entry.publishedAt.toISOString().slice(0, 10)}${
          isOlderThanOneYear(entry.publishedAt) ? ", Archive: no longer current" : ""
        }): ${entry.excerpt}`,
        entry.body.trim()
      ),
    })),
    ...input.roles.map((role): Target => ({
      id: role.id,
      kind: "role",
      path: "/",
      anchor: anchors.role(role.id),
      text: `${role.title}, ${role.company}, ${role.start} – ${role.end ?? "now"}. ${role.impact}`,
    })),
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
      text: `Tokenizados: ${TOKENIZADOS.about} ${TOKENIZADOS.length(input.episodeCount)}`,
    },
  ];

  const seen = new Map<string, Target>();
  for (const target of targets) {
    const first = seen.get(target.id);
    if (first) {
      throw new Error(
        `Duplicate target id "${target.id}": used by a ${first.kind} and a ${target.kind}. ` +
          "Focus ids must be unique across the site; give one of them a different id."
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
