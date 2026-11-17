import React from "react";
import {
  spring,
  useVideoConfig,
  AbsoluteFill,
  type CalculateMetadataFunction, // LAB PATCH: type-only import (verbatimModuleSyntax)
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
// LAB PATCH: media goes through the Lab's manifest (silent when a file is missing).
import { Audio, staticFile } from "./media";
import { Intro } from "./Intro";
import { CHROME_H, CHROME_TOP, INTRO_FRAMES, color, display, mono } from "./theme";
import { LocaleContext, STRINGS, type Lang } from "./i18n";
import { LogoMark } from "./Logo";
import { BUMPER_FRAMES, StoryBumper } from "./StoryBumper";
import { PRESETS, themeOf } from "./themes";
import { ThemeTexture } from "./ThemeTexture";
import { CustomBeat } from "./custom/CustomBeat";
import type { Sfx, Timeline, TimedBeat } from "./types";
import * as V from "./beats/visuals";

export type ReportProps = { edition: string; lang: Lang; timeline: Timeline | null };

export const calculateReportMetadata: CalculateMetadataFunction<
  ReportProps
> = async ({ props }) => {
  // An inline timeline (tests/previews) wins; render.mjs passes null → the edition's timeline file.
  const timeline =
    props.timeline ??
    ((await (await fetch(staticFile(`editions/${props.edition}/timeline.${props.lang}.json`))).json()) as Timeline);
  return {
    durationInFrames: timeline.durationInFrames,
    props: { ...props, timeline },
  };
};

export const SFX_VOLUME: Record<Sfx, number> = {
  whoosh: 0.35,
  pop: 0.4,
  boom: 0.45,
  ding: 0.35,
  scratch: 0.4,
  click: 0.35,
  cash: 0.4,
  glitch: 0.35,
  typing: 0.25,
};

export const BeatVisual: React.FC<{ beat: TimedBeat; edition: string }> = ({
  beat,
  edition,
}) => {
  const dur = beat.to - beat.from;
  const v = beat.visual;
  const p = { dur, edition } as const;
  switch (v.type) {
    case "title":
      return <V.TitleBeat v={v} {...p} />;
    case "text":
      return <V.TextBeat v={v} {...p} />;
    case "number":
      return <V.NumberBeat v={v} {...p} />;
    case "image":
      return <V.ImageBeat v={v} {...p} />;
    case "meme":
      return <V.MemeBeat v={v} {...p} />;
    case "gif":
      return <V.GifBeat v={v} {...p} />;
    case "story":
      return <V.StoryBeat v={v} {...p} />;
    case "code":
      return <V.CodeBeat v={v} {...p} />;
    case "terminal":
      return <V.TerminalBeat v={v} {...p} />;
    case "diagram":
      return <V.DiagramBeat v={v} {...p} />;
    case "chart":
      return <V.ChartBeat v={v} {...p} />;
    case "versus":
      return <V.VersusBeat v={v} {...p} />;
    case "clip":
      return <V.ClipBeat v={v} {...p} />;
    case "sequence":
      return <V.SequenceBeat v={v} {...p} />;
    case "list":
      return <V.ListBeat v={v} {...p} />;
    case "quote":
      return <V.QuoteBeat v={v} {...p} />;
    case "emoji":
      return <V.EmojiBeat v={v} {...p} />;
    case "mascot":
      return <V.MascotBeat v={v} {...p} />;
    case "logo":
      return <V.LogoBeat v={v} {...p} />;
    case "callouts":
      return <V.CalloutsBeat v={v} {...p} />;
    case "slider":
      return <V.SliderBeat v={v} {...p} />;
    case "scale":
      return <V.ScaleBeat v={v} {...p} />;
    case "timeline":
      return <V.TimelineBeat v={v} {...p} />;
    case "custom":
      return <CustomBeat v={v} {...p} />;
  }
};

// Top bar pill (4 Nov 2026, Antonio t62u): ONE lead element → 2×40 separator → story title.
// CHROME_LEAD 'calendar' (default): calendar sheet 64×64. 'logo': brand logo 40 px, no date.
// Entrance: lead at 0, separator at 4, title at 8 frames (soft spring). On a story change only the title slides/fades in.
export type ChromeLead = "calendar" | "logo";
// LAB PATCH: was read from process.env.REMOTION_CHROME_LEAD, which does not exist in a browser.
export const CHROME_LEAD: ChromeLead = "calendar";
const TITLE_BIG_MAX = 40; // chapter ≤ 40 chars always fits at 60 px now the logo is gone (~1680 px free)
const soft = { damping: 18, stiffness: 180, mass: 0.8 };
const ChromePill: React.FC<{ month: string; day: number; chapter?: string; titleSize: number; frame: number; chapterFrom: number }> = ({ month, day, chapter, titleSize, frame, chapterFrom }) => {
  const { fps } = useVideoConfig();
  const sp = (d: number) => spring({ frame: frame - d, fps, config: soft });
  const cal = sp(0);
  const sep = sp(4);
  const lead = CHROME_LEAD;
  const firstTitle = sp(8);
  const change = spring({ frame: frame - chapterFrom, fps, config: soft });
  const t = Math.min(firstTitle, change);
  const enter = (v: number): React.CSSProperties => ({ opacity: v, transform: `translateY(${(1 - v) * 14}px)` });
  return (
    <div
      style={{
        position: "absolute",
        left: 44,
        top: CHROME_TOP,
        height: CHROME_H,
        maxWidth: 1832,
        display: "flex",
        alignItems: "center",
        padding: "0 26px 0 12px",
        borderRadius: 14,
        background: "rgba(12,12,18,0.85)",
        boxShadow: "0 10px 30px #0008",
        overflow: "hidden",
      }}
    >
      {lead === "calendar" ? (
      <div style={{ width: 64, height: 64, flex: "none", borderRadius: 10, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column", ...enter(cal) }}>
        <div style={{ height: 22, background: color.accentDeep, color: "#fff", fontFamily: mono, fontWeight: 700, fontSize: 16, lineHeight: "22px", letterSpacing: 1.5, textAlign: "center" }}>{month}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#16131c", fontFamily: display, fontWeight: 700, fontSize: 34, lineHeight: 1 }}>{day}</div>
      </div>
      ) : (
      <div style={{ marginLeft: 6, flex: "none", display: "flex", ...enter(cal) }}>
        <LogoMark size={40} id="badge" />
      </div>
      )}
      {chapter && (
        <>
          <div style={{ width: 2, height: 40, flex: "none", background: "rgba(255,255,255,0.2)", margin: "0 22px", opacity: sep }} />
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              fontFamily: display,
              fontWeight: 700,
              fontSize: titleSize,
              color: "#fff",
              lineHeight: 1.1,
              opacity: t,
              transform: `translateX(${(1 - t) * 24}px)`,
            }}
          >
            {chapter}
          </div>
        </>
      )}
    </div>
  );
};

// Persistent TOP-left ticker (moved from the bottom: YouTube player controls covered it) + chapter label + progress bar, like a news show.
const Chrome: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const inIntro =
    frame >= timeline.introAtFrame &&
    frame < timeline.introAtFrame + INTRO_FRAMES;
  if (inIntro) return null;
  const current = [...timeline.beats].reverse().find((b) => b.from <= frame);
  const chapter = current?.chapter;
  const d = new Date(timeline.date + "T12:00:00Z");
  // Antonio (4 Nov 2026): the date is a calendar sheet — violet strip with the 3-letter month, big day below (ES = EN).
  const month = d
    .toLocaleDateString(STRINGS[timeline.lang].locale, { month: "short", timeZone: "UTC" })
    .replace(".", "")
    .slice(0, 3)
    .toUpperCase();
  const day = d.getUTCDate();
  // 4 Nov 2026 (Antonio t62u): [calendar] | title in one dark pill (logo optional via CHROME_LEAD). Title 60 px (48 if > TITLE_BIG_MAX chars).
  const titleSize = chapter && chapter.length > TITLE_BIG_MAX ? 48 : 60;
  const chapterFrom = chapter ? (timeline.beats.find((b) => b.chapter === chapter)?.from ?? 0) : 0;
  const progress = frame / timeline.durationInFrames;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <ChromePill month={month} day={day} chapter={chapter} titleSize={titleSize} frame={frame} chapterFrom={chapterFrom} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 8,
          width: `${progress * 100}%`,
          background: color.accent,
        }}
      />
    </AbsoluteFill>
  );
};

// 4 Nov 2026: 4-frame RGB-split glitch at every story boundary (on top of the bumper's slide-push), Fireship-style.
const Glitch: React.FC = () => {
  const f = useCurrentFrame();
  if (f > 3) return null;
  const k = [1, 0.8, 0.5, 0.2][f];
  const rows = [8, 22, 37, 55, 71, 86];
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {rows.map((y, i) => (
        <div key={i} style={{ position: "absolute", top: `${(y + f * 9) % 100}%`, left: 0, right: 0, height: 18 + ((i * 13) % 40), transform: `translateX(${(i % 2 ? -1 : 1) * 60 * k}px)`, background: i % 3 === 0 ? `#ff2a6d${Math.round(k * 160).toString(16).padStart(2, "0")}` : i % 3 === 1 ? `#05d9e8${Math.round(k * 160).toString(16).padStart(2, "0")}` : `#ffffff${Math.round(k * 60).toString(16).padStart(2, "0")}` }} />
      ))}
    </AbsoluteFill>
  );
};

// (legacy) Hard cuts used to get a 2-frame white flash every few beats.
export const CutFlash: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#fff",
        opacity: interpolate(frame, [0, 2], [0.25, 0], {
          extrapolateRight: "clamp",
        }),
      }}
    />
  );
};

// First beat of every story (a beat that starts a new chapter), after the cold open.
export const storyStarts = (tl: Timeline) => {
  const out: { from: number; chapter: string; sfx?: string }[] = [];
  let last: string | undefined;
  for (const b of tl.beats) {
    if (b.chapter && b.chapter !== last && b.from >= tl.introAtFrame) out.push({ from: b.from, chapter: b.chapter, sfx: b.sfx });
    last = b.chapter ?? last;
  }
  return out;
};

export const Report: React.FC<ReportProps> = ({ edition, timeline }) => {
  if (!timeline) return <AbsoluteFill style={{ backgroundColor: color.bg }} />;
  const splitFrame = Math.round(timeline.voiceSplitSec * 30);
  const audio = staticFile(timeline.audio);
  const theme = PRESETS[themeOf(timeline)]; // per-edition seed: texture, accent2, story transition
  return (
    <LocaleContext.Provider value={STRINGS[timeline.lang].locale}>
    <AbsoluteFill style={{ backgroundColor: color.bg }}>
      {timeline.beats.map((b, i) => (
        <Sequence
          key={i}
          from={b.from}
          durationInFrames={Math.max(1, b.to - b.from)}
          layout="none"
        >
          <AbsoluteFill>
            <BeatVisual beat={b} edition={edition} />
            {/* 4 Nov 2026: dry cuts between beats (Fireship); the old every-3rd-beat white flash is gone. */}
          </AbsoluteFill>
          {b.sfx && (
            <Audio
              src={staticFile(`sfx/${b.sfx}.mp3`)}
              volume={SFX_VOLUME[b.sfx]}
            />
          )}
        </Sequence>
      ))}

      {/* Theme texture over the beats, under the separators and the top bar (5 Nov 2026). */}
      <ThemeTexture texture={theme.texture} accent2={theme.accent2} />

      {/* Story separators: a 0.9 s card over the opening of each story's first beat (audio untouched). */}
      {storyStarts(timeline).map((s, k, all) => (
        <Sequence key={`bumper-${k}`} from={s.from} durationInFrames={BUMPER_FRAMES} layout="none">
          <StoryBumper n={k + 1} total={all.length} title={s.chapter} kicker={STRINGS[timeline.lang].story} transition={theme.transition} accent2={theme.accent2} />
          {theme.transition === "glitch" && <Glitch />}
          {s.sfx !== "whoosh" && <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.22} />}
        </Sequence>
      ))}

      <Sequence from={timeline.introAtFrame} durationInFrames={INTRO_FRAMES}>
        <Intro lang={timeline.lang} />
      </Sequence>

      {/* Voice: cold open, pause for the intro, then the rest. */}
      <Sequence from={0} durationInFrames={timeline.introAtFrame}>
        <Audio src={audio} />
      </Sequence>
      <Sequence from={timeline.introAtFrame + INTRO_FRAMES + (timeline.introGapFrames ?? 0)}>
        <Audio src={audio} trimBefore={splitFrame} />
      </Sequence>

      {/* Low music bed under the voice, ducked under the intro. */}
      <Sequence from={timeline.introAtFrame + INTRO_FRAMES + (timeline.introGapFrames ?? 0)}>
        <Audio src={staticFile("sfx/bed.mp3")} volume={0.07} loop />
      </Sequence>

      <Chrome timeline={timeline} />
    </AbsoluteFill>
    </LocaleContext.Provider>
  );
};
