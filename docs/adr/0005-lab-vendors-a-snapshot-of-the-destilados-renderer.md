---
status: accepted
---

# The video editor Lab vendors a snapshot of the Destilados renderer

The first Lab is a video editor on top of the Destilados daily video. The video
pipeline is Antonio Sejas's (`sejas/destilados-ai-report`): Claude writes each
edition as a list of beats, a synthetic voice reads it with per-character timing, and
Remotion renders it. The editor needs that pipeline's Remotion components and
one edition's data to play anything.

We copy a fixed snapshot of those components, plus one English edition and its
media, into this repository. The Lab does not follow the pipeline as it
changes, and nothing it does is written back to it.

A Lab makes no claim of real use, and whether the editor is ever used on real
editions is still open. A snapshot keeps the Lab buildable and deployable on
its own, with no coupling to another repository's releases or to keys that
cost money. If the editor ends up in real use, it becomes a Project and moves
next to the pipeline; this snapshot is then deleted, not synced.

This brings React and the Remotion player into a site that otherwise ships
no client-side script. The Lab is its only island, and it loads only on its
own page; the homepage stays script-free.

## Considered options

- **Live in the pipeline's repo, ship a built bundle here.** Easiest path to
  real use, but every change to the Lab waits on, and couples to, another
  repository's deploys.
- **A shared package or third repository.** Clean boundaries, but a release
  process for something that may stay an experiment.
