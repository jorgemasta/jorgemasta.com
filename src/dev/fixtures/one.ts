import { post, project } from "./entries";
import { item, podcastFrom } from "./podcast";
import type { DevData } from "./types";

/**
 * DEV ONLY. One of everything: singular counts ("1 episodes"), a single
 * building project with no alternating rhythm, one-row lists.
 */
export default async function one(): Promise<DevData> {
  return {
    posts: [await post("retries", { title: "Retries", publishedAt: "2026-10-30", excerpt: "Yes." }, "One line.")],
    projects: await Promise.all([
      project(
        "padelful",
        {
          title: "Padelful",
          publishedAt: "2023-01-01",
          status: "building",
          url: "https://www.padelful.com",
          excerpt: "Racket reviews, ratings and price tracking for padel players, in English and Spanish.",
          mainImage: {
            src: "/images/building/padelful.webp",
            alt: "Padelful homepage: a racket search box above the latest racket reviews, each with a score",
          },
          stats: [{ value: "1", label: "racket tracked" }],
          links: [{ label: "API docs", url: "https://docs.padelful.com" }],
        },
        "One paragraph."
      ),
      project(
        "kontroloo",
        { title: "Kontroloo", publishedAt: "2017-01-15", excerpt: "Access control" },
        "One body paragraph."
      ),
    ]),
    podcast: podcastFrom(item({ title: "Tokenizados #1: Empezamos", number: 1, pubDate: "Sat, 07 Mar 2026 10:00:00 GMT" })),
    roles: [
      {
        company: "Nexcess (formerly Liquid Web)",
        title: "Engineer III",
        start: "Mar 2024",
        impact: "Second-largest contributor to the customer portal.",
        url: "https://www.nexcess.net",
      },
    ],
    about: ["I'm Jorge."],
  };
}
