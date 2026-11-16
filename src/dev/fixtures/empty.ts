import { podcastFrom } from "./podcast";
import type { DevData } from "./types";

/** DEV ONLY. Nothing at all: no posts, no projects, an unreachable feed, no roles, no About. */
export default async function empty(): Promise<DevData> {
  return {
    posts: [],
    projects: [],
    podcast: podcastFrom(null),
    roles: [],
    about: [],
    conversation: [],
  };
}
