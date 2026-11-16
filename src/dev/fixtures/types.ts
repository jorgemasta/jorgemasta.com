import type { CollectionEntry } from "astro:content";
import type { Role } from "../../data/roles";
import type { Podcast } from "../../lib/tokenizados";

/** DEV ONLY. Everything a fixture set replaces, at the data boundary. */
export type DevData = {
  posts: CollectionEntry<"blog">[];
  projects: CollectionEntry<"projects">[];
  podcast: Promise<Podcast>;
  roles: Role[];
  about: string[];
};
