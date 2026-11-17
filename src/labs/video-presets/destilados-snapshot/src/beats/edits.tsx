// Edited real images (Antonio, 27 Oct 2026: «puedes editar imágenes y personalizarlas para que encajen con la noticia»).
// Declarative, in script.json, on any `image` beat: focus (crop/zoom), marks (highlight marker band for phrases / circle for one figure / box / arrow / label sticker),
// spotlight (dim or blur everything else) and `with` (side-by-side composite). Coordinates are 0–1 fractions of the
// source image, so they are measured once on the file and survive any frame size (16:9 safe frame, Shorts, panels).
// Nothing here generates imagery: it only crops, dims and draws on real images.
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
// LAB PATCH: media goes through the Lab's manifest (placeholders when a file is missing).
import { Img } from "../media";
import { color, display } from "../theme";
import type { ImageEdit, Mark, MarkColor, Point, Rect } from "../types";
import { type Box, fitViewToText, placeLabel, stickerSize, viewFor } from "./label-place";

export const MARK_COLOR: Record<MarkColor, string> = {
  accent: color.accent,
  green: color.green,
  amber: color.amber,
  red: "#ff4d5e",
  white: "#ffffff",
};
const STICKER: Record<MarkColor, { bg: string; fg: string }> = {
  accent: { bg: color.accentDeep, fg: "#fff" },
  green: { bg: color.green, fg: "#0c0b10" },
  amber: { bg: color.amber, fg: "#0c0b10" },
  red: { bg: "#e5364a", fg: "#fff" },
  white: { bg: "#ffffff", fg: "#0c0b10" },
};
const DEFAULT_MARK: MarkColor = "amber";

export const hasEdits = (v: ImageEdit) => !!(v.focus || v.marks?.length || v.spotlight || v.with);

const useDraw = (delay: number, len = 10) =>
  interpolate(useCurrentFrame(), [delay, delay + len], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const Sticker: React.FC<{ text: string; x: number; y: number; c: MarkColor; delay: number; W: number; H: number; size?: number }> = ({
  text,
  x,
  y,
  c,
  delay,
  W,
  H,
  size = 46,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 240 } });
  const { w, h } = stickerSize(text, size);
  const cx = Math.min(W - w / 2 - 16, Math.max(w / 2 + 16, x));
  const cy = Math.min(H - h / 2 - 16, Math.max(h / 2 + 16, y));
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) rotate(-3deg) scale(${interpolate(s, [0, 1], [0.3, 1])})`,
        opacity: s > 0.02 ? 1 : 0,
        background: STICKER[c].bg,
        color: STICKER[c].fg,
        fontFamily: display,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.25,
        padding: "9px 22px",
        borderRadius: 12,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 30px #000b, 0 0 0 3px #0c0b10",
      }}
    >
      {text}
    </div>
  );
};

const MarkShape: React.FC<{ m: Mark; P: (p: Point) => Point; R: (r: Rect) => { x: number; y: number; w: number; h: number }; delay: number; W: number; H: number; boxes: Box[] }> = ({
  m,
  P,
  R,
  delay,
  W,
  H,
  boxes,
}) => {
  // Label sticker: `labelAt` (0–1 of the image) wins; otherwise the first spot around `anchor` that covers no OCR text.
  const tag = (text: string, anchor: Box, c: MarkColor, d: number) => {
    const la = "labelAt" in m ? m.labelAt : undefined;
    const { w, h } = stickerSize(text);
    const [x, y] = la ? P(la) : (() => { const q = placeLabel(anchor, w, h, boxes, W, H); return [q.x, q.y]; })();
    return <Sticker text={text} x={x} y={y} c={c} delay={d} W={W} H={H} />;
  };
  const p = useDraw(delay, m.type === "arrow" ? 8 : 12);
  const c = m.color ?? DEFAULT_MARK;
  const stroke = MARK_COLOR[c];
  const line = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (m.type === "label") {
    const [x, y] = P(m.at);
    return <Sticker text={m.text} x={x} y={y} c={c} delay={delay} W={W} H={H} />;
  }
  if (m.type === "arrow") {
    const [tx, ty] = P(m.to);
    let [fx, fy] = m.from ? P(m.from) : [tx + (tx > W * 0.55 ? -300 : 300), ty + (ty > H * 0.45 ? -200 : 200)];
    const len = Math.hypot(tx - fx, ty - fy) || 1;
    const ux = (tx - fx) / len;
    const uy = (ty - fy) / len;
    const ex = tx - ux * 22;
    const ey = ty - uy * 22;
    const cx = fx + (ex - fx) * p;
    const cy = fy + (ey - fy) * p;
    const head = (k: number) => {
      const a = Math.atan2(uy, ux) + k;
      return `${ex - Math.cos(a) * 46},${ey - Math.sin(a) * 46}`;
    };
    const headPath = `M${head(0.5)} L${ex},${ey} L${head(-0.5)}`;
    return (
      <>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <line x1={fx} y1={fy} x2={cx} y2={cy} stroke="#000" strokeOpacity={0.5} strokeWidth={22} {...line} />
          <line x1={fx} y1={fy} x2={cx} y2={cy} stroke={stroke} strokeWidth={13} {...line} />
          {p > 0.85 && (
            <>
              <path d={headPath} stroke="#000" strokeOpacity={0.5} strokeWidth={22} {...line} />
              <path d={headPath} stroke={stroke} strokeWidth={13} {...line} />
            </>
          )}
        </svg>
        {m.label && tag(m.label, { x: fx - 10, y: fy - 10, w: 20, h: 20 }, c, delay + 6)}
      </>
    );
  }
  const r = R(m.at);
  // Antonio, 5 Nov 2026: «Está bien alternar subrayado para frases, párrafos y circulo para dato específico».
  // `circle` = one specific figure/measure («29 ± 0.15»): a hand-drawn ellipse stroked on around the box.
  if (m.type === "circle") {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const rx = r.w / 2 + Math.max(18, r.h * 0.45);
    const ry = r.h / 2 + Math.max(16, r.h * 0.35);
    const shape = <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(-3 ${cx} ${cy})`} pathLength={1} />;
    return (
      <>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {React.cloneElement(shape, { stroke: "#000", strokeOpacity: 0.45, strokeWidth: 16, strokeDasharray: 1, strokeDashoffset: 1 - p, ...line })}
          {React.cloneElement(shape, { stroke, strokeWidth: 9, strokeDasharray: 1, strokeDashoffset: 1 - p, ...line })}
        </svg>
        {m.label && tag(m.label, { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry }, c, delay + 8)}
      </>
    );
  }
  // Antonio, 3 Nov 2026: «subrayarlos con un fondo semitransparente como un rotulador». `highlight` = phrases and
  // paragraphs: a translucent marker band swept left to right, multiply-blended so the text stays readable. `at` must
  // be the OCR bbox of the text (scripts/locate-text.mjs), never an eyeballed guess.
  if (m.type === "highlight") {
    const padX = Math.max(10, r.h * 0.25);
    const bandH = r.h * 1.08 + 8;
    const bx = r.x - padX;
    const by = r.y + r.h / 2 - bandH / 2;
    const bw = (r.w + padX * 2) * p;
    const tint = m.color && m.color !== "amber" ? MARK_COLOR[m.color] : "#ffe14d";
    const ccx = r.x + r.w / 2;
    return (
      <>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", mixBlendMode: "multiply" }}>
          <g transform={`rotate(-1.2 ${ccx} ${by + bandH / 2})`} opacity={0.5}>
            <path
              d={`M${bx + 4} ${by + 3} L${bx + bw} ${by} L${bx + bw - 3} ${by + bandH} L${bx} ${by + bandH - 2} Z`}
              fill={tint}
             
            />
          </g>
        </svg>
        {m.label && tag(m.label, { x: bx, y: by, w: r.w + padX * 2, h: bandH }, m.color ?? DEFAULT_MARK, delay + 8)}
      </>
    );
  }
  const shape = <rect x={r.x - 12} y={r.y - 12} width={r.w + 24} height={r.h + 24} rx={14} pathLength={1} />;
  const top = r.y - 12;
  const bottom = r.y + r.h + 12;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {React.cloneElement(shape, { stroke: "#000", strokeOpacity: 0.45, strokeWidth: 18, strokeDasharray: 1, strokeDashoffset: 1 - p, ...line })}
        {React.cloneElement(shape, { stroke, strokeWidth: 10, strokeDasharray: 1, strokeDashoffset: 1 - p, ...line, style: { filter: `drop-shadow(0 0 14px ${stroke}88)` } })}
      </svg>
      {m.label && tag(m.label, { x: r.x - 12, y: top, w: r.w + 24, h: bottom - top }, c, delay + 8)}
    </>
  );
};

// Everything outside the spotlight is dimmed/blurred (a copy of the image clipped with an even-odd hole).
const holePath = (W: number, H: number, r: { x: number; y: number; w: number; h: number }, shape: "circle" | "box") => {
  const outer = `M0 0 H${W} V${H} H0 Z`;
  if (shape === "box") {
    const pad = 14;
    return `${outer} M${r.x - pad} ${r.y - pad} H${r.x + r.w + pad} V${r.y + r.h + pad} H${r.x - pad} Z`;
  }
  const rx = r.w / 2 * 1.12 + 16;
  const ry = r.h / 2 * 1.2 + 16;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return `${outer} M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
};

// LAB PATCH: `move` = a CSS transform (the visitor's image motion) that replaces the slow drift.
export const EditedImage: React.FC<{ src: string; edit: ImageEdit; W: number; H: number; dur: number; still?: boolean; delay?: number; move?: string }> = ({
  src,
  edit,
  W,
  H,
  dur,
  still,
  delay = 0,
  move,
}) => {
  const frame = useCurrentFrame() - delay;
  const iw = edit.iw ?? 1920;
  const ih = edit.ih ?? 1080;
  const ocrBoxes = edit.textBoxes ?? [];
  const v0 = fitViewToText(viewFor(iw, ih, W, H), ocrBoxes, iw, ih, W, H);
  const v1 = fitViewToText(viewFor(iw, ih, W, H, edit.focus), ocrBoxes, iw, ih, W, H);
  const t = edit.focus && !still ? interpolate(frame, [3, 21], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 1;
  const v = { s: v0.s + (v1.s - v0.s) * t, ox: v0.ox + (v1.ox - v0.ox) * t, oy: v0.oy + (v1.oy - v0.oy) * t };
  const P = ([x, y]: Point): Point => [v.ox + x * iw * v.s, v.oy + y * ih * v.s];
  const R = ([x, y, w, h]: Rect) => ({ x: v.ox + x * iw * v.s, y: v.oy + y * ih * v.s, w: w * iw * v.s, h: h * ih * v.s });
  const drift = 1 + 0.025 * Math.min(1, Math.max(0, frame) / Math.max(dur, 1));
  const base = (edit.focus && !still ? 20 : 6) + delay;
  const spot = edit.spotlight ? (Array.isArray(edit.spotlight) ? { at: edit.spotlight, shape: "circle" as const } : { shape: "circle" as const, ...edit.spotlight }) : null;
  const spotOn = interpolate(frame, [base - 6, base + 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dim = edit.dim ?? "darken";
  const boxes = (edit.textBoxes ?? []).map((b) => R(b));
  const imgStyle: React.CSSProperties = { position: "absolute", left: v.ox, top: v.oy, width: iw * v.s, height: ih * v.s, maxWidth: "none" };
  return (
    <div style={{ position: "relative", width: W, height: H, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: move ?? `scale(${drift})` /* LAB PATCH: + move */ }}>
        <Img src={src} style={imgStyle} />
        {spot && (
          <div style={{ position: "absolute", inset: 0, opacity: spotOn, clipPath: `path(evenodd, "${holePath(W, H, R(spot.at), spot.shape ?? "circle")}")` }}>
            <Img
              src={src}
              style={{
                ...imgStyle,
                filter: dim === "darken" ? "brightness(0.32) saturate(0.7)" : dim === "blur" ? "blur(14px) brightness(0.75)" : "blur(10px) brightness(0.38)",
              }}
            />
          </div>
        )}
        {(edit.marks ?? []).map((m, i) => (
          <MarkShape key={i} m={m} P={P} R={R} delay={(m.delay !== undefined ? m.delay + delay : base + i * 10)} W={W} H={H} boxes={boxes} />
        ))}
      </div>
    </div>
  );
};

// Small pill naming one side of a side-by-side composite.
export const PanelLabel: React.FC<{ text: string; c?: MarkColor; delay?: number; inline?: boolean }> = ({ text, c = "accent", delay = 0, inline }) => {
  const p = useDraw(delay, 8);
  return (
    <div
      style={{
        position: "absolute",
        left: inline ? 0 : 22,
        top: inline ? 0 : 22,
        transform: `translateY(${(1 - p) * -20}px)`,
        opacity: p,
        background: STICKER[c].bg,
        color: STICKER[c].fg,
        fontFamily: display,
        fontWeight: 700,
        fontSize: inline ? 50 : 44,
        padding: "6px 22px",
        borderRadius: 12,
        boxShadow: "0 8px 24px #000a",
      }}
    >
      {text}
    </div>
  );
};
