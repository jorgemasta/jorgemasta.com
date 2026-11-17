import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, display } from "../theme";

// Shared motion helpers. Fireship rhythm: things arrive with a punch, never fade in slowly.

// 4 Nov 2026 (Antonio: «animaciones más fluidas»): the default entrance is a soft spring with no visible bounce
// (~10–12 frames). An explicit stiffness keeps the old snappy 13-damping spring for stickers/labels/punches.
export const usePop = (delay = 0, stiffness?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: stiffness === undefined ? { damping: 18, stiffness: 180, mass: 0.8 } : { damping: 13, stiffness },
  });
};

// Staggered entrance for list items / nodes / lines: delay = i·step frames, opacity 0→1 + translateY 24→0 in 10 frames.
export const useStagger = (i: number, step = 4, base = 0) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [base + i * step, base + i * step + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: t, transform: `translateY(${(1 - t) * 24}px)` } as React.CSSProperties;
};

// Frame at which step i of n appears: explicit seconds from the beat start, or spread evenly over the first 75 % of
// the beat (one step per sentence when the beat is written that way). Without steps → the old quick cascade (i·7).
export const stepFrame = (i: number, n: number, dur: number, steps?: boolean | number[], fps = 30) => {
  if (Array.isArray(steps) && steps[i] !== undefined) return Math.max(0, Math.round(steps[i] * fps));
  if (steps) return Math.round((i * Math.max(dur * 0.75, n * 8)) / Math.max(n, 1));
  return i * 7;
};

export const Pop: React.FC<{
  delay?: number;
  from?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, from = 0.6, children, style }) => {
  const s = usePop(delay);
  return (
    <div
      style={{
        transform: `scale(${interpolate(s, [0, 1], [from, 1])})`,
        opacity: s > 0.02 ? 1 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Background used by every beat: dark grid + soft accent glow that drifts.
export const Stage: React.FC<{ children: React.ReactNode; glow?: string }> = ({
  children,
  glow = color.accent,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${color.rule}40 1px, transparent 1px), linear-gradient(90deg, ${color.rule}40 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `${frame * 0.6}px ${frame * 0.3}px`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${50 + Math.sin(frame / 40) * 10}% 45%, ${glow}26, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "150px 110px 90px", // top clears the ticker (SAFE_TOP), bottom clears the caption
          // slow camera push-in so no beat is a dead still
          // 4 Nov 2026: keeps drifting for the whole beat (Ken Burns), so no plane is ever static
          transform: `scale(${1 + Math.min(frame, 120) * 0.00028 + Math.max(0, frame - 120) * 0.00008})`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Marker-style highlight behind a substring, swept in left to right.
export const Highlighted: React.FC<{
  text: string;
  highlight?: string;
  delay?: number;
  tint?: string;
}> = ({ text, highlight, delay = 6, tint = color.accentDeep }) => {
  const frame = useCurrentFrame();
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase()))
    return <>{text}</>;
  const i = text.toLowerCase().indexOf(highlight.toLowerCase());
  const sweep = interpolate(frame, [delay, delay + 8], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <>
      {text.slice(0, i)}
      <span
        style={{
          backgroundImage: `linear-gradient(90deg, ${tint} ${sweep}%, transparent ${sweep}%)`,
          color: sweep > 50 ? "#fff" : undefined,
          padding: "0 8px",
          borderRadius: 6,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}
      >
        {text.slice(i, i + highlight.length)}
      </span>
      {text.slice(i + highlight.length)}
    </>
  );
};

export const Caption: React.FC<{ text?: string; delay?: number }> = ({
  text,
  delay = 4,
}) => {
  if (!text) return null;
  return (
    <Pop
      delay={delay}
      style={{
        position: "absolute",
        bottom: 160,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 54,
          color: color.ink,
          background: color.bg + "e6",
          border: `3px solid ${color.accent}`,
          padding: "10px 28px",
          borderRadius: 14,
          maxWidth: 1500,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </Pop>
  );
};

// Font size that keeps a line inside the frame.
export const fitSize = (
  text: string,
  max: number,
  min: number,
  charsAtMax: number,
) =>
  Math.max(
    min,
    Math.min(max, Math.round((max * charsAtMax) / Math.max(text.length, 1))),
  );

// Font size at which the longest single word still fits a box of `width` px (display font ≈ 0.62 em per character).
// fitSize only counts total characters, so one long word in a narrow box overflowed ("Leaderboard", 048).
export const fitWord = (text: string, width: number) =>
  Math.floor(width / (0.62 * Math.max(1, ...text.split(/\s+/).map((w) => [...w].length))));
