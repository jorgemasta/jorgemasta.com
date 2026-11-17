// Renders a `custom` beat (4 Nov 2026): looks the component up in the generated registry (src/custom/index.ts) under
// "<edition>/<component>". Missing component or a runtime error → a clean fallback card (never a broken render).
import React from "react";
import { AbsoluteFill } from "remotion";
import { color, display } from "../theme";
import { CUSTOM } from "./index";

type V = { type: "custom"; component: string; props?: Record<string, unknown>; fallback?: string; story?: number };

const Fallback: React.FC<{ text: string; vertical: boolean }> = ({ text, vertical }) => (
  <AbsoluteFill style={{ backgroundColor: color.bg, justifyContent: "center", alignItems: "center", padding: vertical ? 90 : 160 }}>
    <div style={{ fontFamily: display, fontWeight: 700, fontSize: vertical ? 84 : 110, color: color.ink, textAlign: "center", lineHeight: 1.1 }}>{text}</div>
  </AbsoluteFill>
);

class Guard extends React.Component<{ fallback: React.ReactNode; name: string; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn(`custom beat ${this.props.name} failed — fallback used:`, e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export const CustomBeat: React.FC<{ v: V; dur: number; edition: string; vertical?: boolean }> = ({ v, dur, edition, vertical = false }) => {
  const key = `${edition}/${v.component}`;
  const C = CUSTOM[key];
  const text = v.fallback ?? (typeof v.props?.title === "string" ? (v.props.title as string) : "");
  const fb = <Fallback text={text} vertical={vertical} />;
  if (!C) {
    console.warn(`custom beat ${key} not registered (run scripts/custom-index.mjs) — fallback used`);
    return fb;
  }
  return (
    <Guard fallback={fb} name={key}>
      <C props={v.props ?? {}} dur={dur} edition={edition} vertical={vertical} />
    </Guard>
  );
};
