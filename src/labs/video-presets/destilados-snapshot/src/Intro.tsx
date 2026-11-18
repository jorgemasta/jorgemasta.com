import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// LAB PATCH: audio goes through the Lab's manifest (silent when a file is missing).
import { Audio, staticFile } from "./media";
import { LogoMark } from "./Logo";
import { STRINGS, type Lang } from "./i18n";
import { color, display, mono, sec } from "./theme";

// The reusable title sting (3.5 s, same every day, per language).
// A drop falls, splashes with ripples, the play button pops, the name slams in, camera punches through.

const IMPACT = 14; // frame the drop lands
const SLAM = sec(1.3); // title slam, on the sting's last big hit
const EXIT = sec(3.0);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Intro: React.FC<{ withAudio?: boolean; lang?: Lang }> = ({
  withAudio = true,
  lang = "en",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = STRINGS[lang];

  // Fall + squash-and-stretch.
  const fallY = interpolate(frame, [0, IMPACT], [-760, 0], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
  const squash = spring({
    frame: frame - IMPACT,
    fps,
    config: { damping: 7, stiffness: 260 },
  });
  const sx = frame < IMPACT ? 0.82 : interpolate(squash, [0, 1], [1.35, 1]);
  const sy = frame < IMPACT ? 1.28 : interpolate(squash, [0, 1], [0.7, 1]);
  const play = spring({
    frame: frame - IMPACT - 6,
    fps,
    config: { damping: 9, stiffness: 240 },
  });

  // Mark slides left when the title lands.
  const slide = spring({
    frame: frame - SLAM + 10,
    fps,
    config: { damping: 15, stiffness: 170 },
  });
  const markX = interpolate(slide, [0, 1], [0, -600]);
  const markScale = interpolate(slide, [0, 1], [1, 0.78]);

  // Camera shake on impact and on slam.
  const shakeAt = (start: number, amp: number) => {
    const k = frame - start;
    return k > 0 && k < 10 ? Math.sin(k * 2.3) * (10 - k) * amp : 0;
  };
  const shake = shakeAt(IMPACT, 1.6) + shakeAt(SLAM + 3, 2.4);

  const exit = interpolate(frame, [EXIT, sec(3.5)], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const typed = Math.floor(
    interpolate(frame, [sec(1.9), sec(2.6)], [0, t.tagline.length], clamp),
  );

  let letter = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: color.bg, overflow: "hidden" }}>
      {withAudio && (
        <>
          <Audio src={staticFile("sfx/intro-sting.mp3")} volume={0.6} />
          <Sequence from={IMPACT - 1} layout="none">
            <Audio src={staticFile("sfx/drop.mp3")} volume={0.9} />
          </Sequence>
          <Sequence from={SLAM} layout="none">
            <Audio src={staticFile("sfx/boom.mp3")} volume={0.55} />
          </Sequence>
          <Sequence from={EXIT} layout="none">
            <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.6} />
          </Sequence>
        </>
      )}

      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${color.rule}66 1px, transparent 1px), linear-gradient(90deg, ${color.rule}66 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          transform: `scale(${1 + frame / 300})`,
          opacity: 0.7,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 55%, ${color.accentDeep}55, transparent 55%)`,
          opacity: interpolate(frame, [IMPACT, IMPACT + 10], [0.3, 1], clamp),
        }}
      />

      <AbsoluteFill
        style={{
          transform: `translate(${shake}px, ${shake * 0.6}px) scale(${1 + exit * 6})`,
          opacity: 1 - exit * 0.9,
        }}
      >
        {/* ripples */}
        {[0, 6, 12].map((d, i) => {
          const r = interpolate(
            frame,
            [IMPACT + d, IMPACT + d + 26],
            [0, 1],
            clamp,
          );
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 960 + markX,
                top: 690,
                width: 900 * r,
                height: 180 * r,
                marginLeft: -450 * r,
                marginTop: -90 * r,
                borderRadius: "50%",
                border: `${6 - i * 1.5}px solid ${color.accent}`,
                opacity: (1 - r) * (frame > IMPACT ? 0.9 : 0),
              }}
            />
          );
        })}
        {/* the drop */}
        <div
          style={{
            position: "absolute",
            left: 960 - 210,
            top: 540 - 250,
            width: 420,
            height: 420,
            transform: `translate(${markX}px, ${fallY}px) scale(${markScale}) scale(${sx}, ${sy})`,
            transformOrigin: "50% 100%",
          }}
        >
          <LogoMark size={420} play={play} id="intro" />
        </div>
        {/* title */}
        <div
          style={{
            position: "absolute",
            left: 760,
            top: 365,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 168,
              lineHeight: 1,
              color: color.ink,
              letterSpacing: -4,
            }}
          >
            {t.showName.split("").map((ch) => {
              const i = letter++;
              const s = spring({
                frame: frame - SLAM - i * 1.1,
                fps,
                config: { damping: 11, stiffness: 230 },
              });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    opacity: s > 0.01 ? 1 : 0,
                    transform: `translateY(${(1 - s) * -90}px) scale(${interpolate(s, [0, 1], [2.4, 1])})`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontWeight: 700,
              fontSize: 46,
              color: color.accent,
              letterSpacing: 14,
              marginTop: 14,
              opacity: interpolate(
                frame,
                [SLAM + 10, SLAM + 16],
                [0, 1],
                clamp,
              ),
            }}
          >
            {t.sub}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 36,
              color: color.body,
              marginTop: 26,
              height: 46,
              opacity: frame >= sec(1.9) ? 1 : 0,
            }}
          >
            <span style={{ color: color.accent }}>{"> "}</span>
            {t.tagline.slice(0, typed)}
            <span
              style={{
                opacity: Math.floor(frame / 8) % 2 ? 1 : 0,
                color: color.accent,
              }}
            >
              ▌
            </span>
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          backgroundColor: "#fff",
          opacity: interpolate(
            frame,
            [IMPACT, IMPACT + 1, IMPACT + 5],
            [0, 0.16, 0],
            clamp,
          ),
        }}
      />
      <AbsoluteFill
        style={{
          backgroundColor: color.accentDeep,
          opacity: interpolate(frame, [sec(3.3), sec(3.5)], [0, 1], clamp),
        }}
      />
    </AbsoluteFill>
  );
};
