---
title: Presets on a generated video
publishedAt: 2026-11-17
excerpt: A small editor on top of an AI-generated daily video, built to find out how look presets and hand-made tweaks should live together.
question: How should presets and manual tweaks coexist when editing an AI-generated video?
mainImage:
  src: /images/lab/video-presets/poster.jpg
  alt: "Distilled #78 thumbnail: Muse Spaces, one description becomes your mini-app"
attribution: The video pipeline is Antonio Sejas's (Destilados); the editor on top of it is Jorge's.
# One line per image source, from the edition's published "Image credits" (youtube.en.md) and gifs.json.
imageCredits:
  - Meta Newsroom (Muse Spaces and Muse voice social images, newsroom page screenshots, the Muse character on the poster)
  - OpenAI / Contentful (Cult.fit social image)
  - img.destilados (BioBasicsBench illustration)
  - OpenAI (wet-lab measuring page screenshot)
  - TechCrunch (Axiom team photo)
  - Axiom (CFSG blueprint)
  - Perplexity (Teammates product page screenshot)
  - Meta, OpenAI, Perplexity and Slack logos
  - GIFs via GIPHY (StoryBots; Parks and Recreation)
  - Rights belong to their owners; shown for news reporting and commentary.
draft: true
---

Every day, Destilados, our pipeline, turns the day's AI news into a short video: a script, a voice, and around thirty beats of screenshots, titles and GIFs, rendered with Remotion. Edition 78 is 2:50 long, with 32 beats and five story changes.

I wanted to know what editing it would feel like. Not a timeline editor: the video is generated again tomorrow, so most of what you change has to survive that. Above is the editor I built on top of a snapshot of the renderer.

This is an early experiment: one edition, one editor, and the first decisions it forced. There were four.

## A tweak owns only what you touched

A look is a preset (Punch, Golden hour, Newsprint…) at some intensity. You can also open a single beat and move its sliders. The question is what that beat does when you change the preset afterwards.

I tried three rules with the same script: Punch, lower one beat's saturation to 60% and raise its brightness to 130%, then switch to Newsprint, drop intensity to 50% and switch to Golden hour.

- **The tweak replaces the preset on that beat.** Predictable, but the beat froze. It kept Punch's contrast while every other beat went black and white, and intensity did nothing to it.
- **The tweak is an offset from the preset.** Fine for brightness. Saturation came out at 32% on Golden hour, a number I never chose. The sliders drifted under my hand.
- **The tweak owns only the parameters I touched.** Saturation stayed at 60% and brightness at 130% everywhere; contrast, warmth and hue kept following the preset.

The third won. Every parameter on a beat has exactly one owner, me or the preset, and the inspector says which. The cost: a value set by hand that happens to equal the preset still counts as mine, and you can't see that in the image.

## A transition can't move the voice

Beats are timed to the voice. A transition that eats frames from the end of one beat or the start of the next would drift the narration, so transitions only ever play over the incoming beat's own first frames.

My first version did exactly that and looked like nothing. The outgoing beat disappeared on the cut, so the next one slid in over an empty background, for a third of a second. Keeping the outgoing beat on screen under the new one, and pushing it out, is what made a slide read as a slide. The voice never moves; the picture overlaps.

## One choice, not two

At every story change the original plays a title card ("Story 2/5" and the headline). I added transitions as a second row next to the card styles. Testing it, the video didn't match what the screen said: two rows let two options look selected for the same moment, and the transition quietly won.

The fix was one choice of eight: four cards, four ways in without one. A pick applies straight away and replays on the video three times. It cost one thing: on a phone you can't try a transition without applying it. Reset, or picking something else, is the undo.

## What leaves the editor

Export gives two files, and the split is the answer to the question I started with. The **preset** holds the rules: look, theme, story change, photo motion, with no beat in it, so it applies to tomorrow's edition as it is. The **edits** are this video: the preset plus every one-off fix, keyed by beat, plus the exact inputs the renderer takes.

Having the AI generate the video is the good part, and changing it should still mostly happen upstream, through the agent: the prompt and the pipeline. But trying variants and alternatives in a couple of taps, and seeing them play straight away, earned its place.

My current hypothesis is that the taste belongs in the preset and the agent, and only the exceptions belong by hand.
