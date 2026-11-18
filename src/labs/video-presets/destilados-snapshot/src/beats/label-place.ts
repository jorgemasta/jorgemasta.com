// Label/sticker placement that never covers text (Verifier QA, 5 Nov 2026: the «tolerancias» sticker hid two lines of
// the drawing). Pure functions, no Remotion imports: the renderer (edits.tsx) and check-script (Node strips the types)
// share them, so the warning and the frame agree.
import type { Rect } from "../types";

export type Box = { x: number; y: number; w: number; h: number };
export type View = { s: number; ox: number; oy: number };

// Cover the W×H viewport; with a focus box, scale so the box fills ~90 % of it, centred, never showing past the edges.
export const viewFor = (iw: number, ih: number, W: number, H: number, focus?: Rect): View => {
  const s0 = Math.max(W / iw, H / ih);
  let s = s0;
  let cx = iw / 2;
  let cy = ih / 2;
  if (focus) {
    const [fx, fy, fw, fh] = focus;
    s = Math.max(s0, Math.min(W / (fw * iw), H / (fh * ih)) * 0.9);
    cx = (fx + fw / 2) * iw;
    cy = (fy + fh / 2) * ih;
  }
  const ox = Math.min(0, Math.max(W - iw * s, W / 2 - cx * s));
  const oy = Math.min(0, Math.max(H - ih * s, H / 2 - cy * s));
  return { s, ox, oy };
};

// Safe frame used by ImageBeat for real: screenshots (visuals.tsx).
export const SAFE_FRAME = { W: 1640, H: 923 };

// OCR word boxes ([x,y,w,h] in 0–1 of the source) that straddle the left or right edge of the viewport.
// A word fully outside, or only a sliver inside, is ignored; mid-word cuts are the problem (082 beat 21 ChatPRD:
// «am built…», «ckathon…»).
export const wordsClippedX = (view: View, boxes: Rect[], iw: number, ih: number, W: number, H: number, minOverlap = 4) => {
  const out: { side: "left" | "right"; box: Rect }[] = [];
  for (const box of boxes) {
    const [x, y, w, h] = box;
    const L = view.ox + x * iw * view.s;
    const R = L + w * iw * view.s;
    const T = view.oy + y * ih * view.s;
    const B = T + h * ih * view.s;
    if (B < 0 || T > H) continue;
    const vis = Math.min(R, W) - Math.max(L, 0);
    if (vis <= minOverlap) continue;
    if (L < -minOverlap && R > minOverlap) out.push({ side: "left", box });
    else if (R > W + minOverlap && L < W - minOverlap) out.push({ side: "right", box });
  }
  return out;
};

// Widen the visible range just enough that mid-word left/right clips disappear (shrink scale and/or shift ox).
// Used by EditedImage when OCR textBoxes are present, and by check-script to warn when the un-nudged view would clip.
export const fitViewToText = (view: View, boxes: Rect[], iw: number, ih: number, W: number, H: number): View => {
  const clips = wordsClippedX(view, boxes, iw, ih, W, H);
  if (!clips.length) return view;
  let x0 = -view.ox / view.s;
  let x1 = (W - view.ox) / view.s;
  for (const { side, box } of clips) {
    const [x, , w] = box;
    if (side === "left") x0 = Math.min(x0, x * iw);
    else x1 = Math.max(x1, (x + w) * iw);
  }
  const pad = 8;
  x0 = Math.max(0, x0 - pad);
  x1 = Math.min(iw, x1 + pad);
  let s = view.s;
  const need = x1 - x0;
  if (need * s > W && need > 0) s = W / need;
  let ox = -x0 * s;
  let oy = view.oy;
  ox = Math.min(0, Math.max(W - iw * s, ox));
  oy = Math.min(0, Math.max(H - ih * s, oy));
  return { s, ox, oy };
};

export const STICKER_SIZE = 46;
export const stickerSize = (text: string, size = STICKER_SIZE) => ({ w: [...text].length * size * 0.56 + 44, h: size * 1.25 + 18 });

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// Area of `sticker` (padded by `margin`) that lands on any text box.
export const textOverlap = (sticker: Box, text: Box[], margin = 8) => {
  const p = { x: sticker.x - margin, y: sticker.y - margin, w: sticker.w + 2 * margin, h: sticker.h + 2 * margin };
  return text.reduce((a, t) => a + overlap(p, t), 0);
};

// Try above / below / left / right of the anchor (then further out and the corners) and keep the first spot, inside
// the W×H frame, that touches no text box; if none is clear, the clear spot anywhere nearest the anchor; else the least-covering. Returns the centre.
export const placeLabel = (anchor: Box, sw: number, sh: number, text: Box[], W: number, H: number, minTop = 16): { x: number; y: number; hit: number } => {
  const ax = anchor.x + anchor.w / 2;
  const ay = anchor.y + anchor.h / 2;
  const cands: [number, number][] = [];
  for (const g of [24, 70, 140, 230]) {
    cands.push(
      [ax, anchor.y - g - sh / 2],
      [ax, anchor.y + anchor.h + g + sh / 2],
      [anchor.x - g - sw / 2, ay],
      [anchor.x + anchor.w + g + sw / 2, ay],
      [anchor.x - g - sw / 2, anchor.y - g - sh / 2],
      [anchor.x + anchor.w + g + sw / 2, anchor.y - g - sh / 2],
      [anchor.x - g - sw / 2, anchor.y + anchor.h + g + sh / 2],
      [anchor.x + anchor.w + g + sw / 2, anchor.y + anchor.h + g + sh / 2],
    );
  }
  let best = { x: ax, y: anchor.y - 24 - sh / 2, hit: Infinity };
  for (const [cx0, cy0] of cands) {
    const cx = Math.min(W - sw / 2 - 16, Math.max(sw / 2 + 16, cx0));
    const cy = Math.min(H - sh / 2 - 16, Math.max(sh / 2 + minTop, cy0));
    const box = { x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh };
    const hit = textOverlap(box, text) + overlap(box, anchor) * 4; // never sit on the marked text itself either
    if (hit < best.hit) best = { x: cx, y: cy, hit };
    if (hit === 0) return best;
  }
  // Dense page: scan the whole frame and take the clear spot nearest to the anchor.
  let bestD = Infinity;
  for (let cy = sh / 2 + minTop; cy <= H - sh / 2 - 16; cy += 12)
    for (let cx = sw / 2 + 16; cx <= W - sw / 2 - 16; cx += 16) {
      const box = { x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh };
      if (textOverlap(box, text) + overlap(box, anchor) > 0) continue;
      const d = Math.hypot(cx - ax, cy - ay);
      if (d < bestD) { bestD = d; best = { x: cx, y: cy, hit: 0 }; }
    }
  return best;
};
