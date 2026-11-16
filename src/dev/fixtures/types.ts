import type { CollectionEntry } from "astro:content";
import type { UIMessage } from "ai";
import type { Role } from "../../data/roles";
import type { Prose } from "../../lib/facts";
import type { Podcast } from "../../lib/tokenizados";

/** DEV ONLY. Everything a fixture set replaces, at the data boundary. */
export type DevData = {
  posts: CollectionEntry<"blog">[];
  projects: CollectionEntry<"projects">[];
  podcast: Promise<Podcast>;
  roles: Role[];
  about: Prose[];
  /**
   * The Concierge conversation seeded into the tab's session, ending with
   * the question the Focus is for. Empty clears it.
   */
  conversation: UIMessage[];
  /** How many of the last answer's stops the seeded Focus has stepped through. */
  focusStep?: number;
};
