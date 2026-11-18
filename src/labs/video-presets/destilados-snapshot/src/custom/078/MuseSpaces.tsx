// 078 · Meta Muse Spaces (6 Nov 2026): describe → connect apps → live space.
// Figures/flow from Meta Newsroom only. Soft spring 18/180/0.8.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { color, display, mono } from "../../theme";
import type { CustomProps } from "../types";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

type Step = { key: string; es: string; en: string; subEs: string; subEn: string };

const STEPS: Step[] = [
  { key: "describe", es: "Describe", en: "Describe", subEs: "la idea en lenguaje natural", subEn: "the idea in plain language" },
  { key: "connect", es: "Conecta", en: "Connect", subEs: "apps · calendario · pedidos", subEn: "apps · calendar · orders" },
  { key: "live", es: "Space en vivo", en: "Live space", subEs: "sidebar · tabs · horario", subEn: "sidebar · tabs · schedule" },
];

const MuseSpaces: React.FC<CustomProps> = ({ props, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const locale = String(props.locale ?? "es");
  const enter = spring({ frame: f, fps, config: { damping: 18, stiffness: 180, mass: 0.8 } });
  const end = Math.max(24, Math.round(dur * 0.85));
  const t = interpolate(f, [4, end], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const step = Math.min(STEPS.length - 1, Math.floor(t * STEPS.length));
  const title = locale === "en" ? "Muse Spaces · from a description" : "Muse Spaces · desde una descripción";

  return (
    <AbsoluteFill style={{ backgroundColor: color.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 140,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 18}px)`,
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 32, color: color.accentSoft, letterSpacing: 2, marginBottom: 36 }}>
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 18 }}>
          {STEPS.map((s, i) => {
            const on = i <= step;
            const pop = spring({
              frame: f - Math.round((i / STEPS.length) * end),
              fps,
              config: { damping: 18, stiffness: 180, mass: 0.8 },
            });
            return (
              <React.Fragment key={s.key}>
                <div
                  style={{
                    flex: 1,
                    background: on ? "rgba(139, 92, 246, 0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${on ? color.accent : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 18,
                    padding: "28px 22px",
                    opacity: 0.35 + 0.65 * Math.max(0, Math.min(1, pop)),
                    transform: `scale(${0.92 + 0.08 * Math.max(0, Math.min(1, pop))})`,
                  }}
                >
                  <div style={{ fontFamily: mono, fontSize: 18, color: color.accentSoft, marginBottom: 10 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontFamily: display, fontSize: 42, color: "#fff", lineHeight: 1.1, marginBottom: 12 }}>
                    {locale === "en" ? s.en : s.es}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 22, color: "rgba(255,255,255,0.7)", lineHeight: 1.35 }}>
                    {locale === "en" ? s.subEn : s.subEs}
                  </div>
                </div>
                {i < STEPS.length - 1 ? (
                  <div
                    style={{
                      alignSelf: "center",
                      fontFamily: display,
                      fontSize: 36,
                      color: i < step ? color.accent : "rgba(255,255,255,0.25)",
                      opacity: enter,
                    }}
                  >
                    →
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ marginTop: 40, fontFamily: mono, fontSize: 24, color: "rgba(255,255,255,0.55)" }}>
          Meta · November 6, 2026 · muse.ai
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default MuseSpaces;
