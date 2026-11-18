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

Every day, Destilados, our pipeline, turns the day's AI news into a short video. Edition 78: 2:50, 32 beats, five story changes. The video is generated again tomorrow, so most of what you change has to survive that.

This is an early experiment on top of a snapshot of the renderer. It forced four decisions.

## A tweak owns only what you touched

A look is a preset at some intensity, and you can also tweak a single beat. What happens to that beat when the preset changes?

I tried three rules. Replacing the preset froze the beat while the rest changed. Storing an offset drifted: 60% saturation came out at 32% on another preset. The one that held: the tweak owns only the parameters you touched, and the rest keep following the preset.

## A transition can't move the voice

Beats are timed to the voice, so a transition only plays over the incoming beat's first frames. My first version looked like nothing: the outgoing beat vanished on the cut and the new one slid in over an empty background. Keeping the old beat on screen and pushing it out fixed it.

## One choice, not two

Story cards and transitions started as two rows. Two options looked selected for the same moment, and the transition quietly won. Now it is one choice of eight that applies on tap and replays on the video. The cost: on a phone you can't try a transition without applying it.

## What leaves the editor

Export gives two files. The **preset** holds the rules, with no beat in it, so it works on tomorrow's edition. The **edits** are this video: the preset plus the one-off fixes, by beat.

Changing a generated video should still mostly happen through the agent. But trying variants in a couple of taps and seeing them play straight away earned its place. My current hypothesis: the taste belongs in the preset and the agent, and only the exceptions by hand.
