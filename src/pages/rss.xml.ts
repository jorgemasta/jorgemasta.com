import rss from "@astrojs/rss";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import type { APIContext } from "astro";
import { getPosts } from "../lib/content";
import { getBlogUrl } from "../lib/utils";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_URL } from "../lib/consts";

const parser = new MarkdownIt();

/** Resolve root-relative image/link paths so feed readers can follow them. */
const absolutise = (html: string) =>
  html.replace(/(src|href)="\//g, `$1="${SITE_URL}/`);

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: `${SITE_AUTHOR} - RSS Feed`,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.excerpt,
      link: getBlogUrl(post.id, post.data.publishedAt),
      content: absolutise(
        sanitizeHtml(parser.render(post.body ?? ""), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        })
      ),
    })),
  });
}
