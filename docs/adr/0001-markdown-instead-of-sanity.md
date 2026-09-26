# Markdown files instead of a Sanity CMS

The site began as a Sanity Studio + Gatsby monorepo, which meant a CMS, a hosted
dataset and a second deploy step to maintain for a site with a handful of
entries and exactly one author. Content now lives as markdown in
`src/content/`, validated by Astro content collections, and the `studio/` and
`web/` packages, the lerna monorepo and the Sanity project are gone.

## Consequences

The Sanity dataset was **not** exported before deletion — the content that
mattered had already been ported to markdown by hand, and the one document that
had not (an unpublished draft about running LLMs locally) was deliberately
dropped. Its text is unrecoverable. Anyone wanting a CMS back starts from
scratch rather than restoring.

Frontmatter now carries what the CMS used to: `draft` replaces the publish
toggle, `type` (`note` / `article`) replaces document types, and `episode`
replaces a reference field.
