# Blog URLs keep the /blog/YYYY/MM/slug/ shape

Blog entries are routed as `/blog/2020/06/appcenter-bugnag-automatic/` even
though the markdown files are flat and Astro would happily serve
`/blog/<slug>/`. The date segments come from the original Gatsby + Sanity site,
and the one post with any inbound links and search history lives at such a URL.

Keeping the shape means the migration breaks no existing link and needs no
redirect rules. The cost is dated URLs, which read as older than they are and
which we are now stuck with: flattening them later would need permanent
redirects, so the scheme is effectively load-bearing.
