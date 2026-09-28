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
| `npm run dev:worker` | Build, then serve it with the Concierge Worker (`wrangler dev`) |
| `npm run deploy` | Build, then `wrangler deploy` to Cloudflare   |

Every push to `main` deploys through `.github/workflows/deploy.yml`, which also
rebuilds weekly so the Tokenizados episode list stays fresh. It needs the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

## Concierge secrets

The Concierge Worker calls its model through Cloudflare AI Gateway, paid from
Cloudflare credits (Unified Billing), so there's no model-provider key. It needs
`CF_ACCOUNT_ID`, `CF_AI_GATEWAY` and `CF_AIG_TOKEN`: in a gitignored `.dev.vars`
for `wrangler dev`, and as Worker secrets in production. Names are in
`.dev.vars.example`. To set up the gateway token, credits, logging and spend
limit, and fill everything in, run:

```sh
./scripts/setup-concierge.sh
```

The Concierge's endpoint only exists in the Worker, so `npm run dev` shows the
panel but can't answer. Use `npm run dev:worker` to try it locally. The model id
and reasoning effort are `vars` in `wrangler.jsonc`.
