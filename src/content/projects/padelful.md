---
title: "Padelful"
publishedAt: 2023-01-01
status: building
url: "https://www.padelful.com"
excerpt: "Racket reviews, ratings and price tracking for padel players, in English and Spanish."
mainImage:
  src: "/images/building/padelful.webp"
  alt: "Padelful homepage: a racket search box above the latest racket reviews, each with a score"
stats:
  - value: "1,708"
    label: "rackets tracked"
  - value: "2"
    label: "languages"
  - value: "2023"
    label: "live since"
links:
  - label: "API docs"
    url: "https://docs.padelful.com"
  - label: "MCP server"
    url: "https://www.npmjs.com/package/@padelful/mcp-server"
---

Padelful crawls stores and affiliate feeds, and a matcher ties each listing to the right racket. When a listing is ambiguous, an agent investigates it.

The problem I'm exploring is how far that agent can go on messy catalogue data before a person has to step in. The same data is open to other developers through <span data-fact="mcp">a public API and an MCP server</span>.
