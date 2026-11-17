import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
// LAB PATCH: media goes through the Lab's manifest (placeholders when a file is missing).
import { Img, OffthreadVideo, staticFile } from "../media";
import { SAFE_TOP, color, display, impact, mono } from "../theme";
import type { Mood, Motion, Visual } from "../types";
import {
  Caption,
  Highlighted,
  Pop,
  Stage,
  fitSize,
  fitWord,
  stepFrame,
  usePop,

} from "./primitives";
import { useFormat } from "../i18n";
import { EditedImage, PanelLabel, hasEdits } from "./edits";
import { STORY_CARD_H, STORY_CARD_W, storyCardLayout } from "./story-card";

type P<T extends Visual["type"]> = {
  v: Extract<Visual, { type: T }>;
  dur: number;
  edition: string;
};

// Resolve an image reference from script.json: "img:<id>" → generated, "story:<n>" → edition illustration,
// "mascot:<mood>" → brand mascot, anything with a slash → path under public/.
export const imageSrc = (ref: string, edition: string) => {
  if (ref.startsWith("img:"))
    return staticFile(`editions/${edition}/img/${ref.slice(4)}.png`);
  if (ref.startsWith("story:"))
    return staticFile(`editions/${edition}/story/${ref.slice(6)}.jpg`);
  // "real:<file.jpg>" → a real image/screenshot saved under public/editions/<edition>/real/ (already 1920x1080)
  if (ref.startsWith("real:"))
    return staticFile(`editions/${edition}/real/${ref.slice(5)}`);
  // "gif:<name>" → a GIPHY reaction GIF saved as MP4 by scripts/gif.mjs
  if (ref.startsWith("gif:"))
    return staticFile(`editions/${edition}/gif/${ref.slice(4)}.mp4`);
  if (ref.startsWith("mascot:"))
    return staticFile(`brand/mascot-${ref.slice(7)}.png`);
  return staticFile(ref);
};

const MovingImage: React.FC<{
  src: string;
  motion: Motion;
  dur: number;
  fit?: "cover" | "contain";
}> = ({ src, motion, dur, fit = "cover" }) => {
  const frame = useCurrentFrame();
  const t = Math.min(frame / Math.max(dur, 1), 1);
  const punch = usePop(0, 320);
  let transform = "";
  if (motion === "zoom") transform = `scale(${1.02 + t * 0.12})`;
  if (motion === "pan")
    transform = `scale(1.15) translateX(${interpolate(t, [0, 1], [4, -4])}%)`;
  if (motion === "punch")
    transform = `scale(${interpolate(punch, [0, 1], [1.5, 1.04]) + t * 0.04})`;
  if (motion === "shake") {
    const k = frame < 14 ? (14 - frame) * 1.6 : 0;
    transform = `scale(1.08) translate(${Math.sin(frame * 2.1) * k}px, ${Math.cos(frame * 1.7) * k}px)`;
  }
  return (
    <Img
      src={src}
      style={{ width: "100%", height: "100%", objectFit: fit, transform }}
    />
  );
};


export const TitleBeat: React.FC<P<"title">> = ({ v }) => {
  const words = v.text.split(" ");
  const size = fitSize(v.text, 190, 100, 14);
  return (
    <Stage>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 28px",
          maxWidth: 1600,
        }}
      >
        {words.map((w, i) => (
          <Pop key={i} delay={i * 2} from={1.8}>
            <span
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: size,
                color: i === words.length - 1 ? color.accent : color.ink,
                lineHeight: 1.05,
                letterSpacing: -2,
              }}
            >
              {w}
            </span>
          </Pop>
        ))}
      </div>
      {v.sub && (
        <Pop delay={words.length * 2 + 4}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 52,
              color: color.body,
              marginTop: 36,
            }}
          >
            {v.sub}
          </div>
        </Pop>
      )}
    </Stage>
  );
};

export const TextBeat: React.FC<P<"text">> = ({ v, dur }) => {
  const frame = useCurrentFrame();
  const size = fitSize(v.text, 150, 76, 18);
  const style = v.style ?? "pop";
  let shown: React.ReactNode = (
    <Highlighted text={v.text} highlight={v.highlight} />
  );
  if (style === "type") {
    const n = Math.floor(
      interpolate(
        frame,
        [0, Math.min(dur * 0.6, v.text.length * 1.2)],
        [0, v.text.length],
        { extrapolateRight: "clamp" },
      ),
    );
    shown = (
      <>
        {v.text.slice(0, n)}
        <span
          style={{
            color: color.accent,
            opacity: Math.floor(frame / 8) % 2 ? 1 : 0,
          }}
        >
          ▌
        </span>
      </>
    );
  }
  const strike = interpolate(frame, [8, 16], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Stage>
      <Pop from={style === "pop" ? 1.6 : 1}>
        <div
          style={{
            position: "relative",
            fontFamily: style === "type" ? mono : display,
            fontWeight: 700,
            fontSize: size,
            color: color.ink,
            textAlign: "center",
            lineHeight: 1.12,
            maxWidth: 1600,
            letterSpacing: style === "type" ? 0 : -1.5,
          }}
        >
          {shown}
          {style === "strike" && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "52%",
                height: 14,
                width: `${strike}%`,
                background: color.accent,
                transform: "rotate(-2deg)",
                borderRadius: 7,
              }}
            />
          )}
        </div>
      </Pop>
    </Stage>
  );
};

export const NumberBeat: React.FC<P<"number">> = ({ v, edition }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const d = v.decimals ?? 0;
  const fmt = useFormat();
  const value = fmt(v.value * t, d);
  const text = `${v.prefix ?? ""}${value}${v.suffix ?? ""}`;
  const landed = usePop(20, 400);
  return (
    <Stage glow={color.amber}>
      {v.image && (
        <AbsoluteFill style={{ zIndex: -1, transform: "scale(1.12)" }}>
          <Img src={imageSrc(v.image, edition)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(12px) brightness(0.35)", opacity: 0.28 }} />
        </AbsoluteFill>
      )}
      <div
        style={{
          transform: `scale(${1 + (1 - landed) * 0.12 * (frame > 20 ? 1 : 0)})`,
          fontFamily: display,
          fontWeight: 700,
          fontSize: fitSize(text, 260, 140, 7),
          color: color.amber,
          letterSpacing: -6,
          textShadow: `0 0 60px ${color.amber}55`,
        }}
      >
        {text}
      </div>
      {v.label && (
        <Pop delay={10}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 60,
              color: color.body,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {v.label}
          </div>
        </Pop>
      )}
    </Stage>
  );
};

// Real screenshots/photos/frames are shown in a "safe frame": a blurred, darkened copy fills the screen and the image
// itself sits below the top ticker (SAFE_TOP) so mastheads/headlines never collide with it. Other images stay full-bleed.
const SAFE_W = 1640;
const SAFE_H = Math.round((SAFE_W * 9) / 16); // 923
export const ImageBeat: React.FC<P<"image">> = ({ v, dur, edition }) => {
  const src = imageSrc(v.image, edition);
  if (v.with) return <CompareImages v={v} dur={dur} edition={edition} />;
  const edited = hasEdits(v);
  if (edited && !v.image.startsWith("real:"))
    return (
      <AbsoluteFill style={{ backgroundColor: color.bg }}>
        <EditedImage src={src} edit={v} W={1920} H={1080} dur={dur} still={v.motion === "still"} />
        <Caption text={v.caption} />
      </AbsoluteFill>
    );
  if (!v.image.startsWith("real:"))
    return (
      <AbsoluteFill style={{ backgroundColor: color.bg }}>
        <MovingImage src={src} motion={v.motion ?? "zoom"} dur={dur} />
        <Caption text={v.caption} />
      </AbsoluteFill>
    );
  const top = SAFE_TOP + Math.round((1080 - SAFE_TOP - 24 - SAFE_H) / 2); // ~127
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg }}>
      <Img
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(36px) brightness(0.35)", transform: "scale(1.15)" }}
      />
      <div
        style={{
          position: "absolute",
          left: (1920 - SAFE_W) / 2,
          top,
          width: SAFE_W,
          height: SAFE_H,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 30px 80px #000a",
        }}
      >
        {edited ? (
          <EditedImage src={src} edit={v} W={SAFE_W} H={SAFE_H} dur={dur} still={v.motion === "still"} />
        ) : (
          <MovingImage src={src} motion={v.motion ?? "zoom"} dur={dur} />
        )}
      </div>
      <Caption text={v.caption} />
    </AbsoluteFill>
  );
};

// Side-by-side composite: `image` (+ label/focus/marks) on the left, `with` on the right, over a blurred backdrop.
// Panels take the images' own aspect (no surprise crops); a focus box crops/zooms inside a panel as usual.
const PW = 880;
const CompareImages: React.FC<P<"image">> = ({ v, dur, edition }) => {
  const w = v.with!;
  const ar = Math.max((v.iw ?? 16) / (v.ih ?? 9), (w.iw ?? 16) / (w.ih ?? 9));
  const PH = Math.round(Math.min(760, Math.max(440, PW / ar)));
  const panel = (src: string, edit: Parameters<typeof EditedImage>[0]["edit"], label: string | undefined, i: number) => (
    <Pop delay={i * 6} from={0.85}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18 }}>
        {label && (
          <div style={{ position: "relative", height: 70, width: PW }}>
            <PanelLabel text={label} c={i ? "green" : "accent"} delay={i * 6 + 4} inline />
          </div>
        )}
        <div style={{ position: "relative", width: PW, height: PH, borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px #000a", outline: `4px solid ${i ? color.green : color.accent}` }}>
          <EditedImage src={src} edit={edit} W={PW} H={PH} dur={dur} delay={i * 6} still={v.motion === "still"} />
        </div>
      </div>
    </Pop>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg }}>
      <Img src={imageSrc(v.image, edition)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(36px) brightness(0.3)", transform: "scale(1.15)" }} />
      <div style={{ position: "absolute", top: SAFE_TOP, bottom: 60, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 48 }}>
        {panel(imageSrc(v.image, edition), { focus: v.focus, marks: v.marks, spotlight: v.spotlight, dim: v.dim, iw: v.iw, ih: v.ih }, v.label, 0)}
        {panel(imageSrc(w.image, edition), w, w.label, 1)}
      </div>
      <Caption text={v.caption} />
    </AbsoluteFill>
  );
};

// GIF / reaction meme (Antonio, 27 Oct 2026: instead of one centred emoji, a GIPHY GIF or meme that does it justice).
// Framed by default (GIPHY renditions are 480–1080 px wide) over a blurred copy of itself; "full" fills the frame.
// Muted; scripts/gif.mjs pre-loops the file to ≥ 12 s so it never runs out inside a beat. Credit pill top-right.
export const GifBeat: React.FC<P<"gif">> = ({ v, edition }) => {
  const src = imageSrc(v.gif.startsWith("gif:") ? v.gif : `gif:${v.gif}`, edition);
  const full = v.layout === "full";
  const ar = (v.iw ?? 16) / (v.ih ?? 9);
  const maxW = 1560;
  const maxH = 1080 - SAFE_TOP - 70;
  // never blow a small rendition up more than ~2.2× (GIPHY's standard MP4 is ~480 px wide)
  const w = full ? 1920 : Math.round(Math.min(maxW, maxH * ar, Math.max(720, (v.iw ?? 900) * 2.2)));
  const h = full ? 1080 : Math.round(w / ar);
  const left = (1920 - w) / 2;
  const top = full ? 0 : SAFE_TOP + Math.round((1080 - SAFE_TOP - 30 - h) / 2);
  const pop = usePop(0, 300);
  const meme: React.CSSProperties = {
    position: "absolute",
    left: 30,
    right: 30,
    textAlign: "center",
    fontFamily: impact,
    fontSize: fitSize(`${v.top ?? ""}${v.bottom ?? ""}`, 96, 64, 26),
    color: "#fff",
    textTransform: "uppercase",
    lineHeight: 1.05,
    WebkitTextStroke: "5px #000",
    paintOrder: "stroke fill",
    textShadow: "0 6px 0 #000",
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {!full && (
        <>
          <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.3) saturate(1.2)", transform: "scale(1.2)" }} />
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${color.accentDeep}30, transparent 65%)` }} />
        </>
      )}
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: w,
          height: h,
          borderRadius: full ? 0 : 22,
          overflow: "hidden",
          boxShadow: full ? undefined : `0 30px 90px #000c, 0 0 0 4px ${color.accent}`,
          transform: `scale(${interpolate(pop, [0, 1], [0.86, 1])})`,
          backgroundColor: "#000",
        }}
      >
        <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {v.top && (
          <Pop from={1.4} style={{ ...meme, top: full ? SAFE_TOP + 10 : 18 }}>
            {v.top}
          </Pop>
        )}
        {v.bottom && (
          <Pop delay={8} from={1.4} style={{ ...meme, bottom: full ? 150 : 22 }}>
            {v.bottom}
          </Pop>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: full ? SAFE_TOP + 6 : top + 16,
          right: full ? 40 : left + 16,
          fontFamily: mono,
          fontSize: 24,
          color: "#fff",
          background: "#000b",
          padding: "5px 14px",
          borderRadius: 8,
          letterSpacing: 0.5,
        }}
      >
        {v.credit ?? "via GIPHY"}
      </div>
      <Caption text={v.caption} />
    </AbsoluteFill>
  );
};

export const MemeBeat: React.FC<P<"meme">> = ({ v, dur, edition }) => {
  const txt: React.CSSProperties = {
    position: "absolute",
    left: 40,
    right: 40,
    textAlign: "center",
    fontFamily: impact,
    fontSize: 104,
    color: "#fff",
    textTransform: "uppercase",
    lineHeight: 1.05,
    WebkitTextStroke: "5px #000",
    paintOrder: "stroke fill",
    textShadow: "0 6px 0 #000",
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <MovingImage src={imageSrc(v.image, edition)} motion="punch" dur={dur} />
      {v.top && (
        <Pop from={1.4} style={{ ...txt, top: SAFE_TOP + 10 }}>
          {v.top}
        </Pop>
      )}
      {v.bottom && (
        <Pop delay={10} from={1.4} style={{ ...txt, bottom: 140 }}>
          {v.bottom}
        </Pop>
      )}
    </AbsoluteFill>
  );
};

export const StoryBeat: React.FC<P<"story">> = ({ v, dur, edition }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, dur], [1, 1.08]);
  const box = v.image ? storyCardLayout(v.iw, v.ih) : null;
  const textW = box ? box.textW : STORY_CARD_W;
  const fontSize = Math.min(
    fitSize(v.headline, 78, 54, 50),
    Math.max(40, fitWord(v.headline, textW - 112)),
  );
  return (
    <Stage>
      <div style={{ transform: `scale(${zoom}) rotate(-1deg)` }}>
        <Pop from={0.7}>
          <div
            style={{
              width: STORY_CARD_W,
              minHeight: box?.cardH ?? STORY_CARD_H,
              background: "#fbfbf8",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 40px 100px #000c",
              display: "flex",
              alignItems: "center",
            }}
          >
            {v.image && box && (
              <div
                style={{
                  width: box.imgW,
                  height: box.imgH,
                  flexShrink: 0,
                  alignSelf: "center",
                  background: "#111",
                }}
              >
                <Img
                  src={imageSrc(v.image, edition)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center",
                  }}
                />
              </div>
            )}
            <div
              style={{
                width: textW,
                flex: "1 1 auto",
                padding: "48px 56px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 26,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 34,
                  color: color.accent,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {v.source}
              </div>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize,
                  color: "#1b1b1b",
                  lineHeight: 1.18,
                }}
              >
                <Highlighted
                  text={v.headline}
                  highlight={v.highlight}
                  delay={10}
                  tint={color.amber}
                />
              </div>
            </div>
          </div>
        </Pop>
      </div>
    </Stage>
  );
};

// Tiny syntax colouring: strings, comments, keywords, numbers.
const KW =
  /\b(const|let|var|function|return|await|async|if|else|for|while|import|from|export|new|class|def|true|false|null|None|True|False)\b/;
const tokenColor = (tok: string) => {
  if (/^\/\/|^#/.test(tok)) return color.muted;
  if (/^["'`]/.test(tok)) return color.green;
  if (KW.test(tok) && tok.match(KW)?.[0] === tok) return color.purple;
  if (/^\d/.test(tok)) return color.amber;
  if (/^[A-Za-z_]\w*(?=\()/.test(tok)) return color.cyan;
  return color.body;
};
const tokenize = (line: string) =>
  line.match(
    /(\/\/.*|#.*|"[^"]*"|'[^']*'|`[^`]*`|\d+(?:\.\d+)?|[A-Za-z_]\w*\(?|\s+|.)/g,
  ) ?? [];

export const CodeBeat: React.FC<P<"code">> = ({ v }) => {
  const frame = useCurrentFrame();
  const lines = v.code.split("\n");
  return (
    <Stage glow={color.purple}>
      <Pop from={0.9}>
        <div
          style={{
            width: 1640,
            background: "#16171a",
            borderRadius: 18,
            overflow: "hidden",
            border: `2px solid ${color.rule}`,
            boxShadow: "0 40px 100px #000c",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "16px 22px",
              background: "#1f2024",
              alignItems: "center",
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div
                key={c}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: c,
                }}
              />
            ))}
            <div
              style={{
                marginLeft: 18,
                fontFamily: mono,
                fontSize: 30,
                color: color.muted,
              }}
            >
              {v.file}
            </div>
          </div>
          <div
            style={{
              padding: "26px 0",
              fontFamily: mono,
              fontSize: lines.length > 10 ? 38 : 48,
              lineHeight: 1.55,
            }}
          >
            {lines.map((line, i) => {
              const on = v.highlight?.includes(i + 1);
              const appear = interpolate(frame, [i * 2, i * 2 + 4], [0, 1], {
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    opacity: appear,
                    background:
                      on && frame > 10 ? color.accent + "30" : "transparent",
                    borderLeft: `6px solid ${on && frame > 10 ? color.accent : "transparent"}`,
                    padding: "0 30px 0 18px",
                  }}
                >
                  <span style={{ width: 54, color: color.muted, opacity: 0.5 }}>
                    {i + 1}
                  </span>
                  <span style={{ whiteSpace: "pre" }}>
                    {tokenize(line).map((tok, j) => (
                      <span key={j} style={{ color: tokenColor(tok) }}>
                        {tok}
                      </span>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Pop>
    </Stage>
  );
};

export const TerminalBeat: React.FC<P<"terminal">> = ({ v }) => {
  const frame = useCurrentFrame();
  return (
    <Stage glow={color.green}>
      <Pop from={0.9}>
        <div
          style={{
            width: 1640,
            minHeight: 600,
            background: "#0a0b0a",
            borderRadius: 18,
            border: `2px solid ${color.rule}`,
            padding: "40px 46px",
            fontFamily: mono,
            fontSize: 52,
            lineHeight: 1.6,
            boxShadow: "0 40px 100px #000c",
          }}
        >
          {v.lines.map((l, i) => {
            const start = i * 9;
            const n = Math.floor(
              interpolate(frame, [start, start + 8], [0, l.length], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            );
            if (frame < start) return null;
            const cmd = l.startsWith("$ ");
            return (
              <div
                key={i}
                style={{
                  color: cmd
                    ? color.ink
                    : l.toLowerCase().includes("error")
                      ? color.accent
                      : color.green,
                  whiteSpace: "pre-wrap",
                }}
              >
                {l.slice(0, n)}
              </div>
            );
          })}
        </div>
      </Pop>
    </Stage>
  );
};

export const DiagramBeat: React.FC<P<"diagram">> = ({ v, dur }) => {
  const frame = useCurrentFrame();
  const n = v.nodes.length;
  const at = (i: number) => stepFrame(i, n, dur, v.steps);
  const w = Math.min(460, Math.floor(1640 / n) - 90);
  return (
    <Stage glow={color.cyan}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {v.nodes.map((node, i) => {
          const d = at(i);
          // the arrow to the next node draws in the 8 frames before that node lands
          const a0 = v.steps ? Math.max(d + 2, at(i + 1) - 8) : d + 4;
          const arrow = interpolate(frame, [a0, a0 + (v.steps ? 8 : 5)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <React.Fragment key={i}>
              <Pop delay={d} from={0.3}>
                <div
                  style={{
                    width: w,
                    minHeight: 280,
                    borderRadius: 22,
                    background: color.card,
                    border: `3px solid ${i === n - 1 ? color.accent : color.cyan}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 22,
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: Math.min(fitSize(node, 68, 40, 10), fitWord(node, w - 50)),
                    color: color.ink,
                    boxShadow: `0 0 40px ${(i === n - 1 ? color.accent : color.cyan) + "33"}`,
                  }}
                >
                  {node}
                </div>
              </Pop>
              {i < n - 1 && (
                <svg width={90} height={40} style={{ overflow: "visible" }}>
                  <line
                    opacity={arrow > 0 ? 1 : 0}
                    x1={8}
                    y1={20}
                    x2={8 + 66 * arrow}
                    y2={20}
                    stroke={color.ink}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  {arrow > 0.9 && (
                    <path
                      d="M66 6 L84 20 L66 34"
                      fill="none"
                      stroke={color.ink}
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {v.caption && (
        <Pop delay={at(n - 1) + 6}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 54,
              color: color.body,
              marginTop: 60,
            }}
          >
            {v.caption}
          </div>
        </Pop>
      )}
    </Stage>
  );
};

export const ChartBeat: React.FC<P<"chart">> = ({ v }) => {
  const frame = useCurrentFrame();
  const fmt = useFormat();
  const max = Math.max(...v.bars.map((b) => b.value), 1);
  return (
    <Stage glow={color.amber}>
      <Pop>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 80,
            color: color.ink,
            marginBottom: 50,
            textAlign: "center",
          }}
        >
          {v.title}
        </div>
      </Pop>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          width: 1640,
        }}
      >
        {v.bars.map((b, i) => {
          const g = interpolate(frame, [6 + i * 5, 24 + i * 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 26 }}
            >
              <div
                style={{
                  width: 360,
                  textAlign: "right",
                  fontFamily: mono,
                  fontSize: 46,
                  color: color.body,
                }}
              >
                {b.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 100,
                  background: color.card,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(b.value / max) * 100 * g}%`,
                    height: "100%",
                    background: b.highlight ? color.accent : color.muted,
                    borderRadius: 12,
                  }}
                />
              </div>
              <div
                style={{
                  minWidth: 200,
                  whiteSpace: "nowrap",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 56,
                  color: b.highlight ? color.accent : color.ink,
                }}
              >
                {fmt(Math.round(b.value * g))}
                {v.unit ?? ""}
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

// Versus: two sides with no boxes; each side shows an image/logo (leftImage/rightImage) with its label under it.
// Logos (svg/png with transparency) are shown contained; photos/screenshots get a rounded crop.
const isLogo = (ref?: string) => !!ref && /\.(svg|png)$/i.test(ref);

export const VersusBeat: React.FC<P<"versus">> = ({ v, edition }) => {
  const side = (text: string, img: string | undefined, c: string, delay: number) => (
    <Pop delay={delay} from={0.4}>
      <div
        style={{
          width: 680,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34,
        }}
      >
        {img &&
          (isLogo(img) ? (
            <div style={{ height: 340, width: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img
                src={imageSrc(img, edition)}
                style={{ height: 300, width: 560, objectFit: "contain", filter: `drop-shadow(0 0 40px ${c}55)` }}
              />
            </div>
          ) : (
            <Img
              src={imageSrc(img, edition)}
              style={{ width: 640, height: 360, objectFit: "cover", borderRadius: 22, boxShadow: "0 30px 60px #0008" }}
            />
          ))}
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: img ? fitSize(text, 72, 48, 16) : fitSize(text, 110, 64, 14),
            color: color.ink,
            textAlign: "center",
            lineHeight: 1.05,
            borderBottom: `6px solid ${c}`,
            paddingBottom: 8,
          }}
        >
          {text}
        </div>
      </div>
    </Pop>
  );
  return (
    <Stage>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        {side(v.left, v.leftImage, color.cyan, 0)}
        <Pop delay={5} from={3}>
          <div style={{ fontFamily: impact, fontSize: 170, color: color.accent }}>VS</div>
        </Pop>
        {side(v.right, v.rightImage, color.accent, 8)}
      </div>
      {v.verdict && (
        <Pop delay={16}>
          <div style={{ fontFamily: mono, fontSize: 56, color: color.amber, marginTop: 50 }}>{v.verdict}</div>
        </Pop>
      )}
    </Stage>
  );
};

// Sequence: 2–4 images left→right, each with a short caption, appearing one by one (replaces most "list" beats).
export const SequenceBeat: React.FC<P<"sequence">> = ({ v, dur, edition }) => {
  const n = v.items.length;
  const step = Math.max(6, Math.min(16, Math.floor((dur * 0.6) / Math.max(n, 1))));
  const w = n <= 2 ? 720 : n === 3 ? 500 : 380;
  const h = Math.round((w * 9) / 16);
  return (
    <Stage>
      {v.title && (
        <Pop>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 76, color: color.ink, marginBottom: 46 }}>
            {v.title}
          </div>
        </Pop>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: n === 4 ? 30 : 44 }}>
        {v.items.map((it, i) => (
          <Pop key={i} delay={4 + i * step} from={0.6}>
            <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
              {isLogo(it.image) ? (
                <div style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Img src={imageSrc(it.image, edition)} style={{ width: w * 0.62, height: h * 0.62, objectFit: "contain" }} />
                </div>
              ) : (
                <Img
                  src={imageSrc(it.image, edition)}
                  style={{ width: w, height: h, objectFit: "cover", borderRadius: 20, boxShadow: "0 24px 50px #0008" }}
                />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: display, fontWeight: 700, fontSize: n === 4 ? 46 : 56, color: color.ink, textAlign: "center" }}>
                <span style={{ fontFamily: mono, fontSize: n === 4 ? 34 : 40, color: color.accent }}>{i + 1}</span>
                {it.caption}
              </div>
            </div>
          </Pop>
        ))}
      </div>
    </Stage>
  );
};

export const ListBeat: React.FC<P<"list">> = ({ v, dur }) => {
  const step = Math.max(
    5,
    Math.min(14, Math.floor((dur * 0.7) / Math.max(v.items.length, 1))),
  );
  return (
    <Stage>
      {v.title && (
        <Pop>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 84,
              color: color.ink,
              marginBottom: 40,
            }}
          >
            {v.title}
          </div>
        </Pop>
      )}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {v.items.map((it, i) => (
          <Pop key={i} delay={4 + i * step} from={0.5}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                fontFamily: display,
                fontWeight: 500,
                fontSize: 76,
                color: color.ink,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: color.accentDeep,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 50,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              {it}
            </div>
          </Pop>
        ))}
        {/* Anchored under the list's bottom-right corner, not the frame: a frame-anchored stamp
            covered the last item's end ("Delta, United: limitad|NO BOTS", 048). */}
        {v.stamp && (
        <Pop
          delay={4 + v.items.length * step + 4}
          from={3}
          style={{
            position: "absolute",
            right: -60,
            top: "100%",
            marginTop: -12,
          }}
        >
          <div
            style={{
              fontFamily: impact,
              fontSize: 92,
              color: color.accent,
              border: `10px solid ${color.accent}`,
              padding: "0 30px",
              borderRadius: 16,
              transform: "rotate(-12deg)",
            }}
          >
            {v.stamp}
          </div>
        </Pop>
        )}
      </div>
    </Stage>
  );
};

export const QuoteBeat: React.FC<P<"quote">> = ({ v }) => (
  <Stage>
    <Pop from={0.9}>
      <div
        style={{
          maxWidth: 1450,
          borderLeft: `12px solid ${color.accent}`,
          paddingLeft: 56,
        }}
      >
        <div
          style={{
            fontFamily: display,
            fontWeight: 500,
            fontSize: fitSize(v.text, 104, 60, 36),
            color: color.ink,
            lineHeight: 1.25,
          }}
        >
          “{v.text}”
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 48,
            color: color.accent,
            marginTop: 34,
          }}
        >
          — {v.author}
        </div>
      </div>
    </Pop>
  </Stage>
);

export const EmojiBeat: React.FC<P<"emoji">> = ({ v }) => {
  const frame = useCurrentFrame();
  const wob = Math.sin(frame / 3) * 6;
  return (
    <Stage>
      <Pop from={3}>
        <div
          style={{
            fontSize: 420,
            transform: `rotate(${wob}deg)`,
            lineHeight: 1,
          }}
        >
          {v.emoji}
        </div>
      </Pop>
      <Caption text={v.caption} delay={6} />
    </Stage>
  );
};

const MOOD_GLOW: Record<Mood, string> = {
  neutral: color.accent,
  shocked: color.amber,
  smug: color.purple,
  facepalm: color.muted,
  money: color.green,
  panic: color.accent,
  thinking: color.cyan,
  fire: color.amber,
};

export const MascotBeat: React.FC<P<"mascot">> = ({ v }) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 5) * 10;
  const shake =
    v.mood === "panic" || v.mood === "shocked"
      ? Math.sin(frame * 2.4) * Math.max(0, 12 - frame)
      : 0;
  return (
    <Stage glow={MOOD_GLOW[v.mood]}>
      <Pop from={0.2}>
        <Img
          src={staticFile(`brand/mascot-${v.mood}.png`)}
          style={{ height: 720, transform: `translate(${shake}px, ${bob}px)` }}
        />
      </Pop>
      <Caption text={v.caption} delay={6} />
    </Stage>
  );
};

export const LogoBeat: React.FC<P<"logo">> = ({ v, edition }) => (
  <Stage>
    <Pop from={0.3}>
      {v.image ? (
        <Img
          src={imageSrc(v.image, edition)}
          style={{ maxHeight: 420, maxWidth: 1100, borderRadius: 24 }}
        />
      ) : (
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: fitSize(v.name, 200, 110, 8),
            color: color.ink,
            letterSpacing: -4,
          }}
        >
          {v.name}
        </div>
      )}
    </Pop>
    {v.sub && (
      <Pop delay={8}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 56,
            color: color.accent,
            marginTop: 30,
          }}
        >
          {v.sub}
        </div>
      </Pop>
    )}
  </Stage>
);


// Clip: a real (official, credited) video clip, muted, full-bleed under the narration. `start` in seconds into the file.
export const ClipBeat: React.FC<P<"clip">> = ({ v, edition }) => {
  const top = SAFE_TOP + Math.round((1080 - SAFE_TOP - 24 - SAFE_H) / 2);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${color.accentDeep}33, #000 70%)` }}>
      <div
        style={{
          position: "absolute",
          left: (1920 - SAFE_W) / 2,
          top,
          width: SAFE_W,
          height: SAFE_H,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 30px 80px #000a",
          backgroundColor: "#000",
        }}
      >
        <OffthreadVideo
          src={imageSrc(v.video, edition)}
          muted
          startFrom={Math.round((v.start ?? 0) * 30)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {v.caption && (
          <div style={{ position: "absolute", top: 20, right: 20, fontFamily: mono, fontSize: 32, color: color.ink, background: "#000b", padding: "8px 20px", borderRadius: 10 }}>
            {v.caption}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Timeline (4 Nov 2026): a horizontal rail that draws left→right while 3–5 dated milestones land one by one.
export const TimelineBeat: React.FC<P<"timeline">> = ({ v, dur }) => {
  const frame = useCurrentFrame();
  const n = v.items.length;
  const at = (i: number) => stepFrame(i, n, dur, v.steps ?? true);
  const last = at(n - 1);
  const rail = interpolate(frame, [0, last + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const W = 1640;
  const colW = Math.floor(W / n);
  const longest = v.items.reduce((a, it) => (it.label.length > a.length ? it.label : a), "");
  const labelSize = Math.min(fitSize(longest, 54, 40, 12), fitWord(longest, colW - 40));
  return (
    <Stage glow={color.cyan}>
      {v.title && (
        <Pop>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 76, color: color.ink, marginBottom: 70, textAlign: "center" }}>{v.title}</div>
        </Pop>
      )}
      <div style={{ position: "relative", width: W, height: 380 }}>
        <div style={{ position: "absolute", left: colW / 2, top: 110, height: 8, borderRadius: 4, width: (W - colW) * rail, background: `linear-gradient(90deg, ${color.cyan}, ${color.accent})` }} />
        {v.items.map((it, i) => {
          const d = at(i);
          const on = frame >= d;
          const isLast = i === n - 1;
          return (
            <div key={i} style={{ position: "absolute", left: i * colW, width: colW, top: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", ...staggerAt(frame, d) }}>
              <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 46, color: isLast ? color.accent : color.cyan, height: 70 }}>{it.date}</div>
              <div style={{ width: 44, height: 44, borderRadius: 22, marginTop: 4, background: on ? (isLast ? color.accent : color.cyan) : color.card, border: `6px solid ${color.bg}`, boxShadow: `0 0 30px ${(isLast ? color.accent : color.cyan) + "88"}` }} />
              <div style={{ marginTop: 34, padding: "0 18px", fontFamily: display, fontWeight: 700, fontSize: labelSize, color: color.ink, lineHeight: 1.15 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
      {v.caption && (
        <Pop delay={last + 8}>
          <div style={{ fontFamily: mono, fontSize: 50, color: color.body, marginTop: 30 }}>{v.caption}</div>
        </Pop>
      )}
    </Stage>
  );
};

// Hook-free stagger (safe inside .map): opacity 0→1 + translateY 24→0 over 10 frames from frame d.
const staggerAt = (frame: number, d: number): React.CSSProperties => {
  const t = interpolate(frame, [d, d + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return { opacity: t, transform: `translateY(${(1 - t) * 24}px)` };
};

// ---- New layouts (5 Nov 2026, Antonio: «Hacer más tipos de Slides o incluso slides únicas… el VS y el flujo de cajas
// es usado mucho»). callouts replaces the box flow when describing parts; slider replaces an image VS; scale replaces a
// number VS. All on real images / source figures only.

// Fit an iw×ih image inside maxW×maxH (contain) → rendered box size.
const containBox = (iw: number, ih: number, maxW: number, maxH: number) => {
  const k = Math.min(maxW / iw, maxH / ih);
  return { w: Math.round(iw * k), h: Math.round(ih * k) };
};
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// callouts: a real product photo with a leader line + label drawn onto each part, one by one.
export const CalloutsBeat: React.FC<P<"callouts">> = ({ v, dur, edition }) => {
  const frame = useCurrentFrame();
  const { w, h } = containBox(v.iw ?? 1600, v.ih ?? 900, 1280, 820);
  const n = v.points.length;
  const at = (i: number) => 10 + stepFrame(i, n, Math.max(dur - 10, 1), v.steps ?? true);
  const drift = 1.0 + Math.min(frame / Math.max(dur, 1), 1) * 0.04;
  const intro = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: ease });
  const left = (1920 - w) / 2;
  const top = SAFE_TOP + (1080 - SAFE_TOP - h) / 2 + 10;
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left, top, width: w, height: h, borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 80px #000a", opacity: intro, transform: `scale(${(0.94 + intro * 0.06) * drift})` }}>
        <Img src={imageSrc(v.image, edition)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: `rgba(12,11,16,${0.15 + 0.25 * interpolate(frame, [at(0) - 6, at(0) + 6], [0, 1], clamp)})` }} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {v.points.map((pt, i) => {
          const d = at(i);
          const p = interpolate(frame, [d, d + 12], [0, 1], { ...clamp, easing: ease });
          if (p <= 0) return null;
          const px = left + pt.at[0] * w;
          const py = top + pt.at[1] * h;
          const side = pt.side ?? (pt.at[0] < 0.5 ? "left" : "right");
          const lx = side === "left" ? Math.max(70, left - 40) : Math.min(1850, left + w + 40);
          const ly = py;
          const ex = px + (lx - px) * p;
          const isNow = frame >= d && (i === n - 1 || frame < at(i + 1));
          const c = isNow ? color.amber : color.accentSoft;
          return (
            <g key={i}>
              <circle cx={px} cy={py} r={14 * Math.min(1, p * 2) + (isNow ? Math.sin(frame / 4) * 3 : 0)} fill="none" stroke={c} strokeWidth={6} />
              <circle cx={px} cy={py} r={6} fill={c} />
              <line x1={px} y1={py} x2={ex} y2={ly} stroke="#000" strokeOpacity={0.5} strokeWidth={10} strokeLinecap="round" />
              <line x1={px} y1={py} x2={ex} y2={ly} stroke={c} strokeWidth={5} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      {v.points.map((pt, i) => {
        const d = at(i) + 8;
        const t = interpolate(frame, [d, d + 10], [0, 1], { ...clamp, easing: ease });
        const side = pt.side ?? (pt.at[0] < 0.5 ? "left" : "right");
        const py = top + pt.at[1] * h;
        const isNow = frame >= at(i) && (i === n - 1 || frame < at(i + 1));
        const anchor = side === "left" ? { right: 1920 - Math.max(70, left - 40) + 14 } : { left: Math.min(1850, left + w + 40) + 14 };
        return (
          <div key={i} style={{ position: "absolute", top: py - 34, ...anchor, maxWidth: Math.max(220, (1920 - w) / 2 - 70), opacity: t, transform: `translateX(${(1 - t) * (side === "left" ? 30 : -30)}px)`, textAlign: side === "left" ? "right" : "left" }}>
            <div style={{ display: "inline-block", padding: "8px 18px", borderRadius: 12, background: isNow ? color.amber : color.card, color: isNow ? "#111" : color.ink, fontFamily: display, fontWeight: 700, fontSize: 40, lineHeight: 1.1, boxShadow: "0 10px 26px #0009" }}>{pt.label}</div>
            {pt.sub && <div style={{ marginTop: 6, fontFamily: mono, fontSize: 26, color: color.body }}>{pt.sub}</div>}
          </div>
        );
      })}
      {v.title && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", opacity: intro }}>
          <span style={{ fontFamily: mono, fontSize: 34, color: color.muted, background: "#0009", padding: "6px 16px", borderRadius: 8 }}>{v.title}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// slider: two real images, one frame, a divider that sweeps across (before/after, A vs B of the same kind).
export const SliderBeat: React.FC<P<"slider">> = ({ v, dur, edition }) => {
  const frame = useCurrentFrame();
  const W = 1700;
  const H = 1080 - SAFE_TOP - 90;
  const left = (1920 - W) / 2;
  const top = SAFE_TOP + 30;
  const from = v.from ?? 0.92;
  const mid = 0.5;
  const to = v.to ?? 0.3;
  const k1 = Math.min(26, dur * 0.3);
  const k2 = Math.max(k1 + 10, dur * 0.7);
  const x = frame < k1 + 8
    ? interpolate(frame, [4, k1], [from, mid], { ...clamp, easing: ease })
    : interpolate(frame, [k1 + 8, k2], [mid, to], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const drift = 1.02 + Math.min(frame / Math.max(dur, 1), 1) * 0.04;
  const intro = interpolate(frame, [0, 10], [0, 1], clamp);
  const img = (s: { image: string }, fit: "cover" | "contain") => (
    <Img src={imageSrc(s.image, edition)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, transform: `scale(${drift})`, background: color.bg2 }} />
  );
  const tag = (txt: string | undefined, side: "l" | "r", on: number) =>
    txt ? (
      <div style={{ position: "absolute", top: 26, [side === "l" ? "left" : "right"]: 26, padding: "10px 22px", borderRadius: 12, background: side === "l" ? color.accentDeep : color.amber, color: side === "l" ? color.ink : "#111", fontFamily: display, fontWeight: 700, fontSize: 44, opacity: on, boxShadow: "0 10px 26px #0009" }}>{txt}</div>
    ) : null;
  const fit = v.fit ?? "cover";
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg }}>
      <div style={{ position: "absolute", left, top, width: W, height: H, borderRadius: 18, overflow: "hidden", opacity: intro, boxShadow: "0 30px 80px #000a" }}>
        {img(v.right, fit)}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${(1 - x) * 100}% 0 0)` }}>{img(v.left, fit)}</div>
        {tag(v.left.label, "l", interpolate(x, [0.12, 0.25], [0, 1], clamp))}
        {tag(v.right.label, "r", interpolate(x, [0.75, 0.88], [1, 0], clamp))}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${x * 100}% - 3px)`, width: 6, background: color.ink, boxShadow: "0 0 24px #000c" }} />
        <div style={{ position: "absolute", top: H / 2 - 38, left: `calc(${x * 100}% - 38px)`, width: 76, height: 76, borderRadius: 38, background: color.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display, fontWeight: 700, fontSize: 34, color: color.bg, boxShadow: "0 8px 24px #000c" }}>◀▶</div>
      </div>
      {v.caption && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, textAlign: "center", fontFamily: mono, fontSize: 38, color: color.body, opacity: interpolate(frame, [k1, k1 + 10], [0, 1], clamp) }}>{v.caption}</div>
      )}
    </AbsoluteFill>
  );
};

// scale shape "range" (15 Nov 2026, 086): a min / central / max uncertainty range on one bar,
// with the central estimate marked. Not a steps/arrow diagram of multipliers.
const RangeScale: React.FC<P<"scale">> = ({ v, dur }) => {
  const frame = useCurrentFrame();
  const items = v.items ?? [];
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1] ?? lo;
  const mid =
    items.find((it) => it.highlight) ??
    (sorted.length === 3 ? sorted[1] : sorted[Math.floor(sorted.length / 2)]);
  const span = Math.max((hi?.value ?? 0) - (lo?.value ?? 0), 1e-9);
  const xOf = (val: number) => ((val - (lo?.value ?? 0)) / span);
  const trackW = 1400;
  const trackH = 36;
  const at = (i: number) => 6 + stepFrame(i, Math.max(items.length, 3), Math.max(dur * 0.6, 1), v.steps ?? true);
  const grow = interpolate(frame, [4, 22], [0, 1], { ...clamp, easing: ease });
  const endG = interpolate(frame, [at(0), at(0) + 14], [0, 1], { ...clamp, easing: ease });
  const midG = interpolate(frame, [at(1), at(1) + 16], [0, 1], { ...clamp, easing: ease });
  const midX = xOf(mid?.value ?? 0);
  const tick = (it: typeof lo, side: "left" | "right", opacity: number) => (
    <div
      style={{
        position: "absolute",
        left: side === "left" ? 0 : undefined,
        right: side === "right" ? 0 : undefined,
        top: 200 + trackH + 18,
        width: 320,
        textAlign: side,
        opacity,
      }}
    >
      <div style={{ fontFamily: impact, fontSize: 72, lineHeight: 1, color: color.ink }}>{it?.display ?? String(it?.value ?? "")}</div>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 36, color: color.body, marginTop: 8 }}>{it?.label}</div>
    </div>
  );
  return (
    <Stage glow={color.accentDeep}>
      {v.title && (
        <Pop>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, color: color.ink, marginBottom: 40, textAlign: "center" }}>{v.title}</div>
        </Pop>
      )}
      <div style={{ position: "relative", width: trackW, height: 460 }}>
        <div style={{ position: "absolute", left: 0, top: 200, width: trackW * grow, height: trackH, borderRadius: 18, background: color.card, overflow: "hidden" }}>
          <div style={{ width: `${Math.max(midX, 0) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${color.muted}, ${color.accent})`, opacity: midG }} />
        </div>
        {tick(lo, "left", endG)}
        {tick(hi, "right", endG)}
        <div
          style={{
            position: "absolute",
            left: midX * trackW,
            top: 200 + trackH / 2,
            transform: `translate(-50%, -50%) scale(${0.55 + midG * 0.45})`,
            opacity: midG,
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: color.accent,
            boxShadow: `0 0 40px ${color.accent}`,
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: midX * trackW,
            top: 40,
            transform: "translateX(-50%)",
            width: 520,
            textAlign: "center",
            opacity: midG,
          }}
        >
          <div style={{ fontFamily: impact, fontSize: 110, lineHeight: 1, color: color.accent }}>{mid?.display ?? String(mid?.value ?? "")}</div>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 40, color: color.ink, marginTop: 10 }}>{mid?.label}</div>
        </div>
      </div>
      {v.caption && (
        <Pop delay={at(Math.max(items.length, 1) - 1) + 18}>
          <div style={{ fontFamily: mono, fontSize: 44, color: color.body, marginTop: 12 }}>{v.caption}</div>
        </Pop>
      )}
    </Stage>
  );
};

// scale: 2–4 source figures as shapes whose AREA is proportional to the value (√v), grown one by one with a counter.
// shape "range" (15 Nov 2026) is a low / marked-central / high bar for an uncertainty range.
export const ScaleBeat: React.FC<P<"scale">> = ({ v, dur, edition }) => {
  if (v.shape === "range") return <RangeScale v={v} dur={dur} edition={edition} />;
  const frame = useCurrentFrame();
  const n = v.items.length;
  const max = Math.max(...v.items.map((i) => i.value), 1e-9);
  const shape = v.shape ?? "circle";
  const maxD = shape === "circle" ? (n <= 2 ? 560 : n === 3 ? 440 : 340) : n <= 2 ? 400 : n === 3 ? 360 : 300; // bars leave room for figure + label
  const fit = (txt: string, box: number, maxFs: number) => Math.min(maxFs, (box * 2.4) / Math.max(txt.length, 1)); // long figures («1,404 billones $») shrink to fit
  const at = (i: number) => 6 + stepFrame(i, n, Math.max(dur * 0.6, 1), v.steps ?? true);
  const palette = [color.accent, color.amber, color.cyan, color.green];
  return (
    <Stage glow={color.accentDeep}>
      {v.title && (
        <Pop>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, color: color.ink, marginBottom: 30, textAlign: "center" }}>{v.title}</div>
        </Pop>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 70, height: shape === "circle" ? maxD + 40 : undefined }}>
        {v.items.map((it, i) => {
          const d = at(i);
          const g = interpolate(frame, [d, d + 22], [0, 1], { ...clamp, easing: ease });
          const r = it.value / max;
          const size = shape === "circle" ? maxD * Math.sqrt(r) : 0;
          const c = it.color ? (color as Record<string, string>)[it.color] ?? palette[i % 4] : palette[i % 4];
          const shown = it.display ?? String(Math.round(it.value * g));
          const count = it.display ? it.display : shown;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: shape === "circle" ? Math.max(size, 260) : 340, opacity: interpolate(g, [0, 0.15], [0, 1], clamp) }}>
              <div style={{ height: maxD, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {shape === "circle" ? (
                  <div style={{ width: size * g, height: size * g, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${c}ee, ${c}66)`, boxShadow: `0 0 60px ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
                    {size > 200 && <div style={{ fontFamily: impact, fontSize: Math.min(120, size * 0.28, fit(count, size * 0.78, 120)), lineHeight: 1, whiteSpace: "nowrap", textAlign: "center", color: color.bg, opacity: g }}>{count}</div>}
                  </div>
                ) : (
                  <div style={{ width: 200, height: maxD * r * g, borderRadius: "14px 14px 0 0", background: `linear-gradient(180deg, ${c}, ${c}77)`, boxShadow: `0 0 50px ${c}44` }} />
                )}
              </div>
              {(shape !== "circle" || size <= 200) && <div style={{ fontFamily: impact, fontSize: fit(count, 300, 84), lineHeight: 1.05, whiteSpace: "nowrap", color: c, marginTop: 14, opacity: g }}>{count}</div>}
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 42, color: color.ink, marginTop: 10, textAlign: "center", opacity: g }}>{it.label}</div>
            </div>
          );
        })}
      </div>
      {v.caption && (
        <Pop delay={at(n - 1) + 18}>
          <div style={{ fontFamily: mono, fontSize: 44, color: color.body, marginTop: 34 }}>{v.caption}</div>
        </Pop>
      )}
    </Stage>
  );
};
