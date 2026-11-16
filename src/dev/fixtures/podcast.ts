import { FEED_URL, HOMEPAGE_URL, getPodcast, type Podcast } from "../../lib/tokenizados";

/**
 * DEV ONLY. The podcast as `getShownPodcast` returns it, read from a fixture
 * feed by the real `getPodcast`, so the title-prefix stripping, date parsing
 * and episode-page lookup all run on it. `items` null is an unreachable feed.
 */
export function podcastFrom(items: string | null, homepage = ""): Promise<Podcast> {
  const feed =
    items === null
      ? null
      : `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title><![CDATA[Tokenizados - Podcast de Inteligencia Artificial]]></title>
    <link>https://tokenizadospodcast.com</link>
    <itunes:image href="https://tokenizadospodcast.com/podcast/tokenizados-portada.jpeg"/>
    ${items}
  </channel>
</rss>`;

  const fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url === FEED_URL && feed !== null) return new Response(feed);
    if (url === HOMEPAGE_URL && homepage) return new Response(homepage);
    return new Response("Not found", { status: 404 });
  }) as typeof globalThis.fetch;

  return getPodcast({ limit: 3, fetch });
}

/** One feed `<item>`, shaped like the real feed's. */
export const item = ({
  title,
  number,
  pubDate,
  season = 1,
}: {
  title: string;
  number: number;
  pubDate: string;
  season?: number;
}) => `<item>
      <title><![CDATA[${title}]]></title>
      <link>https://tokenizadospodcast.com/podcast/tokenizados-${season > 1 ? `s${season}-` : ""}${String(number).padStart(2, "0")}.mp3</link>
      <pubDate>${pubDate}</pubDate>
      <itunes:season>${season}</itunes:season>
      <itunes:episode>${number}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
    </item>`;
