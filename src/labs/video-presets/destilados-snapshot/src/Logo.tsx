import React from "react";
import { color, display, mono } from "./theme";

// The show's mark: a single distilled drop with a play button cut into it.
// 100×100 box; the drop's belly is centred on (50, 62).
export const DROP =
  "M50 4 C50 4 16 42 16 62 A34 34 0 0 0 84 62 C84 42 50 4 50 4 Z";
export const PLAY =
  "M42.5 48.5 Q42.5 45 45.6 46.7 L64.5 58.6 Q67.5 60.5 64.5 62.4 L45.6 74.3 Q42.5 76 42.5 72.5 Z";

export const LogoMark: React.FC<{
  size: number;
  fill?: number; // 0–1, how full the drop is (for the intro)
  play?: number; // 0–1, scale of the play button
  id?: string;
}> = ({ size, fill = 1, play = 1, id = "lm" }) => {
  const level = 96 - fill * 92;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={color.accentSoft} />
          <stop offset="0.55" stopColor={color.accent} />
          <stop offset="1" stopColor={color.accentDeep} />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <path d={DROP} />
        </clipPath>
        <mask id={`${id}-m`}>
          <rect x="0" y="0" width="100" height="100" fill="#fff" />
          <path
            d={PLAY}
            fill="#000"
            transform={`translate(54 60.5) scale(${play}) translate(-54 -60.5)`}
          />
        </mask>
      </defs>
      <g mask={`url(#${id}-m)`}>
        <g clipPath={`url(#${id}-c)`}>
          <rect
            x="0"
            y={level}
            width="100"
            height="100"
            fill={`url(#${id}-g)`}
          />
        </g>
      </g>
      <path
        d={DROP}
        fill="none"
        stroke={color.accentSoft}
        strokeWidth={fill < 1 ? 2.5 : 0}
      />
      {/* glint */}
      <path
        d="M30 56 Q31 44 40 34"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.55 * fill}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
};

export const LogoLockup: React.FC<{
  size?: number;
  name: string;
  sub?: string;
}> = ({ size = 1, name, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 34 * size }}>
    <LogoMark size={190 * size} />
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 132 * size,
          color: color.ink,
          letterSpacing: -3 * size,
          lineHeight: 1,
        }}
      >
        {name}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: mono,
            fontSize: 40 * size,
            color: color.accent,
            marginTop: 10 * size,
            letterSpacing: 6 * size,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  </div>
);
