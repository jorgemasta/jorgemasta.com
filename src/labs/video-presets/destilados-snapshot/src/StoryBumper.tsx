// Story separator (Antonio, 27 Oct 2026: «la separación entre noticias necesita ser más clara y visual»).
// A 0.9 s card at every story boundary: a violet slab wipes in from the left, the near-black card shows the story
// number big in green, "NOTICIA 2/5" and the chapter title, then the slab wipes out to the right revealing the beat.
// Pure overlay on the first beat's opening: the voice and every beat keep their timing.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { color, display, mono } from "./theme";
import type { Transition } from "./themes";

// LAB PATCH: held 1.8 s instead of 0.9 s (27 frames), so the card reads; entrance and exit keep their speed.
export const BUMPER_FRAMES = 54;

const ease = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// `transition` (theme seed, src/themes.ts): glitch / wipe = the skewed violet slab (glitch adds the RGB split in
// Report), zoom = the card punches in and out, band = hard cut with an accent band sweeping down. `accent2` colours the
// big number and the edge line (green on the original look).
export const StoryBumper: React.FC<{ n: number; total: number; title: string; kicker: string; transition?: Transition; accent2?: string }> = ({
  n,
  total,
  title,
  kicker,
  transition = "glitch",
  accent2 = color.green,
}) => {
  const f = useCurrentFrame();
  const slabbed = transition === "glitch" || transition === "wipe";
  // edge positions in % of the width: the card is visible between `tail` and `head`
  const head = interpolate(f, [0, 7], [0, 112], { ...clamp, easing: ease });
  const tail = interpolate(f, [BUMPER_FRAMES - 7, BUMPER_FRAMES], [0, 112], { ...clamp, easing: ease });
  const content = interpolate(f, [4, 9], [0, 1], clamp) * interpolate(f, [BUMPER_FRAMES - 8, BUMPER_FRAMES - 5], [1, 0], clamp);
  const slide = interpolate(f, [4, 12], [60, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const bar = interpolate(f, [8, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const num = String(n).padStart(2, "0");
  const titleSize = Math.max(72, Math.min(124, Math.round((124 * 14) / Math.max([...title].length, 1))));
  // The slab is skewed, so its edges run diagonally across the frame.
  const slab = (x: number, w: number, c: string) => (
    <div style={{ position: "absolute", top: -60, bottom: -60, left: `${x}%`, width: w, background: c, transform: "skewX(-14deg)" }} />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={
          slabbed
            ? { clipPath: `polygon(${tail}% 0, ${head}% 0, ${head - 6}% 100%, ${tail - 6}% 100%)`, backgroundColor: color.bg }
            : transition === "zoom"
              ? {
                  backgroundColor: color.bg,
                  opacity: interpolate(f, [0, 4, BUMPER_FRAMES - 5, BUMPER_FRAMES], [0, 1, 1, 0], clamp),
                  transform: `scale(${interpolate(f, [0, 7, BUMPER_FRAMES - 6, BUMPER_FRAMES], [1.35, 1, 1, 0.82], { ...clamp, easing: ease })})`,
                }
              : { backgroundColor: color.bg, opacity: f < BUMPER_FRAMES - 2 ? 1 : 0 }
        }
      >
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${color.rule}50 1px, transparent 1px), linear-gradient(90deg, ${color.rule}50 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
        <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 50%, ${color.accentDeep}55, transparent 60%)` }} />
        <div
          style={{
            position: "absolute",
            left: 120,
            right: 120,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 64,
            opacity: content,
            transform: `translateX(${slide}px)`,
          }}
        >
          <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 320, lineHeight: 1, color: accent2, letterSpacing: -12, textShadow: `0 0 60px ${accent2}55` }}>
            {num}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 40, letterSpacing: 6, color: color.accent }}>
              {kicker} {n}/{total}
            </div>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: titleSize, lineHeight: 1.05, color: color.ink, letterSpacing: -2 }}>{title}</div>
            <div style={{ height: 12, width: `${bar * 100}%`, maxWidth: 620, background: `linear-gradient(90deg, ${color.accentDeep}, ${color.accent})`, borderRadius: 6 }} />
          </div>
        </div>
      </AbsoluteFill>
      {/* leading/trailing edges: violet slab + thin green line */}
      {transition === "band" && (f < 8 || f >= BUMPER_FRAMES - 8) && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 150,
            top: `${interpolate(f < 8 ? f : f - (BUMPER_FRAMES - 8), [0, 7], [-15, 105], clamp)}%`,
            background: `linear-gradient(${color.accentDeep}, ${accent2})`,
            boxShadow: `0 0 40px ${accent2}88`,
          }}
        />
      )}
      {slabbed && f < 9 && (
        <>
          {slab(head - 7, 120, color.accentDeep)}
          {slab(head - 0.5, 14, accent2)}
        </>
      )}
      {slabbed && f >= BUMPER_FRAMES - 8 && f < BUMPER_FRAMES && (
        <>
          {slab(tail - 7, 120, color.accentDeep)}
          {slab(tail - 0.5, 14, accent2)}
        </>
      )}
    </AbsoluteFill>
  );
};
