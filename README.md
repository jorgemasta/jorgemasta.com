# jorgemasta.com

Personal site of Jorge Masta. Astro, static, no CMS — all content is markdown in
this repository. Deployed to Cloudflare Workers.

See [`CONTEXT.md`](./CONTEXT.md) for the vocabulary and [`docs/adr/`](./docs/adr)
for why it is built this way.

## Content

```text
src/content/
├── blog/       ← notes and articles
└── projects/   ← proof of work
```

Frontmatter is validated by `src/content.config.ts`. A blog entry:

```yaml
---
title: "Why agents beat dashboards"
publishedAt: 2026-09-20
excerpt: "One paragraph for listings, search results and the feed."
type: note # note (default, podcast-derived) | article
episode: https://example.com/tokenizados/42 # optional
draft: false # true keeps it out of the build
mainImage: # optional
  src: "/images/blog/whatever.jpg"
  alt: "Described for screen readers"
---
```

Drafts are visible with `npm run dev` and excluded from `npm run build`.

Blog URLs are `/blog/YYYY/MM/<filename>/`, derived from `publishedAt` — see
ADR-0002 before changing that.

## Commands

| Command          | Action                                        |
| :--------------- | :-------------------------------------------- |
| `npm run dev`    | Dev server on `localhost:4321`, drafts shown  |
| `npm run build`  | Static build into `./dist/`                   |
| `npm run preview`| Serve the build locally                       |
| `npm run deploy` | Build, then `wrangler deploy` to Cloudflare   |

Every push to `main` deploys through `.github/workflows/deploy.yml`, which also
rebuilds weekly so the Tokenizados episode list stays fresh. It needs the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
