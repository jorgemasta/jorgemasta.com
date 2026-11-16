import { XMLParser, XMLValidator } from "fast-xml-parser";

export const HOMEPAGE_URL = "https://tokenizadospodcast.com/";
export const FEED_URL = "https://tokenizadospodcast.com/podcast.xml";

export type Episode = {
  number: number;
  title: string;
  date: Date;
  link: string;
};

export type Podcast = {
  episodes: Episode[];
  /** How many complete episodes the feed has, before the limit. */
  count: number;
  coverArt: string | null;
};

type Options = {
  /** How many of the newest episodes to return. */
  limit?: number;
  fetch?: typeof fetch;
};

const EMPTY: Podcast = { episodes: [], count: 0, coverArt: null };

/** Long enough for a slow feed, short enough that a hung one can't stall a deploy. */
const TIMEOUT_MS = 10_000;

/**
 * The latest Tokenizados episodes, read from the podcast feed at build time.
 *
 * Never throws: if the feed is unreachable or unreadable it returns no
 * episodes, so the site still builds and the podcast band renders without
 * the list.
 */
export async function getPodcast({ limit = 3, fetch = globalThis.fetch }: Options = {}): Promise<Podcast> {
  const get = async (url: string) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return res.text();
  };

  const [feed, homepage] = await Promise.allSettled([get(FEED_URL), get(HOMEPAGE_URL)]);
  if (feed.status === "rejected") return EMPTY;

  try {
    const podcast = parseFeed(feed.value);
    const pages = homepage.status === "fulfilled" ? episodePages(homepage.value) : new Map();
    return {
      coverArt: podcast.coverArt,
      count: podcast.count,
      episodes: podcast.episodes
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, limit)
        .map((episode) => ({ ...episode, link: pages.get(episode.number) ?? episode.link })),
    };
  } catch {
    return EMPTY;
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => name === "item",
});

function parseFeed(xml: string): Podcast {
  if (XMLValidator.validate(xml) !== true) throw new Error("Malformed feed");
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel) throw new Error("Not an RSS feed");

  const episodes: Episode[] = (channel.item ?? []).map((item: Record<string, any>) => ({
    number: Number(item["itunes:episode"]),
    // Every title repeats "Tokenizados #NN: " (or " - "); the number is shown on its own.
    title:
      item.title == null
        ? ""
        : decodeEntities(String(item.title)).replace(/^Tokenizados\s*#\d+\s*[:\-–—]\s*/, ""),
    date: new Date(item.pubDate),
    link: String(item.link),
  }));
  const complete = episodes.filter(
    (e) => Number.isInteger(e.number) && e.title && !Number.isNaN(e.date.getTime()) && e.link.startsWith("http")
  );

  return { episodes: complete, count: complete.length, coverArt: channel["itunes:image"]?.href ?? null };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };

/** The parser leaves entities inside CDATA as written, so a title can still carry `&amp;`. */
function decodeEntities(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] !== "#") return ENTITIES[name.toLowerCase()] ?? whole;
    const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/**
 * The feed only links the MP3. The episode pages have hand-written slugs, so
 * they are read off the Tokenizados homepage by episode number.
 */
function episodePages(html: string): Map<number, string> {
  const pages = new Map<number, string>();
  for (const [, path, number] of html.matchAll(/href="(\/episodios\/0*(\d+)-[^"]*)"/g)) {
    pages.set(Number(number), new URL(path, HOMEPAGE_URL).href);
  }
  return pages;
}
