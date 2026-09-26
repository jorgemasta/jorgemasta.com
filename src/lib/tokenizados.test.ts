import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEED_URL, SITE_URL, getPodcast } from "./tokenizados";

const feed = readFileSync(new URL("./__fixtures__/podcast.xml", import.meta.url), "utf8");

/** The Tokenizados homepage links every episode page as /episodios/NN-slug/. */
const homepage = `
  <a href="/episodios/22-psicohistoria-deepmind-hackeo-bitcoin/">22</a>
  <a href="/episodios/24-navier-stokes-mosca-conduciendo-alexander-wang/">24</a>
  <a href="/episodios/25-sistema-1-decide-no-razona-freno-ia-hackeo-openai/">25</a>
`;

type Routes = Record<string, () => Response | Promise<Response>>;

/** A fetch that serves canned responses by URL and refuses everything else. */
const fakeFetch = (routes: Routes): typeof fetch =>
  (async (input: RequestInfo | URL) => {
    const route = routes[String(input)];
    if (!route) throw new TypeError(`fetch failed: ${String(input)}`);
    return route();
  }) as typeof fetch;

const ok = (body: string) => () => new Response(body);

describe("getPodcast", () => {
  it("returns the latest episodes newest-first with number, title, date and link", async () => {
    const { episodes } = await getPodcast({
      limit: 3,
      fetch: fakeFetch({ [FEED_URL]: ok(feed), [SITE_URL]: ok(homepage) }),
    });

    expect(episodes).toEqual([
      {
        number: 25,
        title: "El Sistema 1 que decide pero no razona, el freno a la IA y el hackeo a OpenAI con Claude",
        date: new Date("2026-09-19T16:39:58Z"),
        link: "https://tokenizadospodcast.com/episodios/25-sistema-1-decide-no-razona-freno-ia-hackeo-openai/",
      },
      {
        number: 24,
        title: "Navier-Stokes Resuelto, una mosca conduciendo coches y el Ascenso de Alexander Wang",
        date: new Date("2026-09-13T21:21:04Z"),
        link: "https://tokenizadospodcast.com/episodios/24-navier-stokes-mosca-conduciendo-alexander-wang/",
      },
      {
        number: 23,
        title: "El Gran Escape de OpenAI, Emails Agénticos y la Venta de Hugging Face",
        date: new Date("2026-09-07T06:42:23Z"),
        // Not listed on the homepage: falls back to the feed's own link.
        link: "https://tokenizadospodcast.com/podcast/tokenizados-23.mp3",
      },
    ]);
  });

  it("returns the channel cover-art URL", async () => {
    const { coverArt } = await getPodcast({
      fetch: fakeFetch({ [FEED_URL]: ok(feed), [SITE_URL]: ok(homepage) }),
    });

    expect(coverArt).toBe("https://tokenizadospodcast.com/podcast/tokenizados-portada.jpeg");
  });

  it("sorts newest-first even when the feed is not in order", async () => {
    const items = feed.match(/<item>[\s\S]*?<\/item>/g)!;
    const shuffled = feed.replace(items.join("\n\t\t"), [...items].reverse().join("\n\t\t"));

    const { episodes } = await getPodcast({
      limit: 2,
      fetch: fakeFetch({ [FEED_URL]: ok(shuffled), [SITE_URL]: ok(homepage) }),
    });

    expect(episodes.map((e) => e.number)).toEqual([25, 24]);
  });

  it("uses the feed links when the Tokenizados homepage is unreachable", async () => {
    const { episodes } = await getPodcast({
      limit: 1,
      fetch: fakeFetch({ [FEED_URL]: ok(feed) }),
    });

    expect(episodes[0].link).toBe("https://tokenizadospodcast.com/podcast/tokenizados-25.mp3");
  });

  it.each<[string, Routes]>([
    ["a network error", {}],
    ["an HTTP error", { [FEED_URL]: () => new Response("nope", { status: 503 }) }],
    ["malformed XML", { [FEED_URL]: ok("<rss><channel><item><title>oops") }],
    ["something that is not a feed", { [FEED_URL]: ok("<html><body>Hello</body></html>") }],
    ["an empty feed", { [FEED_URL]: ok('<rss version="2.0"><channel><title>T</title></channel></rss>') }],
  ])("returns no episodes and does not throw on %s", async (_, routes) => {
    const podcast = await getPodcast({ fetch: fakeFetch({ [SITE_URL]: ok(homepage), ...routes }) });

    expect(podcast.episodes).toEqual([]);
  });
});
