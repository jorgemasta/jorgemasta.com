// Subtle per-edition background texture (src/themes.ts) laid over every beat, under the top bar and the separators.
// Low opacity + blend modes: it tints the frame without hiding real images or text.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Texture } from "./themes";

const noise = (freq: number, oct: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}")`;

export const ThemeTexture: React.FC<{ texture: Texture; accent2: string }> = ({ texture, accent2 }) => {
  const f = useCurrentFrame();
  const base: React.CSSProperties = { pointerEvents: "none" };
  if (texture === "grain")
    return <AbsoluteFill style={{ ...base, backgroundImage: noise(0.9, 2), backgroundPosition: `${(f * 37) % 320}px ${(f * 53) % 320}px`, opacity: 0.1, mixBlendMode: "overlay" }} />;
  if (texture === "paper")
    return (
      <>
        <AbsoluteFill style={{ ...base, backgroundImage: noise(0.035, 4), opacity: 0.3, mixBlendMode: "soft-light" }} />
        <AbsoluteFill style={{ ...base, background: `${accent2}`, opacity: 0.1, mixBlendMode: "soft-light" }} />
      </>
    );
  if (texture === "grid")
    return (
      <AbsoluteFill
        style={{ ...base, backgroundImage: `linear-gradient(${accent2}30 1px, transparent 1px), linear-gradient(90deg, ${accent2}30 1px, transparent 1px)`, backgroundSize: "96px 96px", backgroundPosition: `0 ${(f * 0.5) % 96}px`, mixBlendMode: "screen" }}
      />
    );
  if (texture === "blueprint")
    return (
      <AbsoluteFill
        style={{
          ...base,
          backgroundImage: `linear-gradient(${accent2}26 2px, transparent 2px), linear-gradient(90deg, ${accent2}26 2px, transparent 2px), linear-gradient(${accent2}12 1px, transparent 1px), linear-gradient(90deg, ${accent2}12 1px, transparent 1px)`,
          backgroundSize: "240px 240px, 240px 240px, 40px 40px, 40px 40px",
          mixBlendMode: "screen",
        }}
      />
    );
  if (texture === "scan")
    return (
      <>
        <AbsoluteFill style={{ ...base, backgroundImage: "repeating-linear-gradient(0deg, #ffffff10 0 1px, transparent 1px 4px)", mixBlendMode: "screen" }} />
        <div style={{ ...base, position: "absolute", left: 0, right: 0, height: 180, top: `${((f * 6) % 1400) - 200}px`, background: `linear-gradient(transparent, ${accent2}14, transparent)`, mixBlendMode: "screen" }} />
      </>
    );
  // gradient
  return (
    <AbsoluteFill
      style={{ ...base, background: `radial-gradient(ellipse at ${10 + 6 * Math.sin(f / 90)}% 100%, ${accent2}30, transparent 55%), radial-gradient(ellipse at 100% 0%, ${accent2}1c, transparent 50%)`, mixBlendMode: "screen" }}
    />
  );
};
