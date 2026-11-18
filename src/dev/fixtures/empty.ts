import { podcastFrom } from "./podcast";
import type { DevData } from "./types";

/** DEV ONLY. Nothing at all: no posts, no projects, no Labs, an unreachable feed, no roles, no About. */
export default async function empty(): Promise<DevData> {
  return {
    posts: [],
    projects: [],
    labs: [],
    podcast: podcastFrom(null),
    roles: [],
    about: [],
  };
}
