import React from "react";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { C, FONT } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Portrait keeps key text clear of Instagram/Shorts UI (top bar, caption + buttons at the bottom).
export function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return { portrait, width, height, side: portrait ? 72 : 120, top: portrait ? 220 : 84, bottom: portrait ? 400 : 84 };
}

// A springy entrance starting at `from` (scene-relative frames).
export function usePop(from: number, distance = 34) {
  const frame = useCurrentFrame();
  return {
    opacity: interpolate(frame, [from, from + 5], [0, 1], clamp),
    scale: interpolate(frame, [from, from + 16], [0.72, 1], { ...clamp, easing: Easing.spring({ damping: 11 }), output: "perceptual-scale" }),
    translate: interpolate(frame, [from, from + 16], [`0px ${distance}px`, "0px 0px"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
  } as React.CSSProperties;
}

export const Sky: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.skyTop} 0%, #b9d6ef 48%, ${C.skyBot} 100%)` }} />
);

type ClipProps = {
  src: string;
  trim: number;
  mode?: "cover" | "band"; // band: portrait only, the gameplay sits in a framed strip
  bandScale?: number; // band height as a multiple of a 16:9 strip (1 = whole width visible)
  zoom?: number; // extra zoom beyond filling the viewport
  focusX?: number; // 0..1 across the source, kept as central as the edges allow
  focusY?: number;
  blur?: number;
  dim?: number;
};

const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// The footage covers a viewport (the whole frame, or a band in portrait), zoomed
// toward a focus point without ever exposing an empty edge.
export const Clip: React.FC<ClipProps> = ({ src, trim, mode = "cover", bandScale = 1.3, zoom = 1, focusX = 0.5, focusY = 0.5, blur = 0, dim = 0 }) => {
  const { portrait, width, height } = useLayout();
  const band = portrait && mode === "band";
  const viewW = width;
  const viewH = band ? Math.round(((width * 9) / 16) * bandScale) : height;
  const w = Math.max(viewW, (viewH * 16) / 9) * zoom;
  const h = (w * 9) / 16;
  const left = clampTo(viewW / 2 - focusX * w, viewW - w, 0);
  const top = clampTo(viewH / 2 - focusY * h, viewH - h, 0);
  const frame: React.CSSProperties = band
    ? { position: "absolute", left: 0, width: viewW, height: viewH, top: (height - viewH) / 2 + 30, overflow: "hidden",
        boxShadow: "0 10px 0 rgba(43,37,64,0.18), 0 30px 60px -20px rgba(31,27,46,0.55)" }
    : { position: "absolute", inset: 0, overflow: "hidden" };
  return (
    <AbsoluteFill>
      <div style={frame}>
        <Video src={staticFile(src)} trimBefore={trim} muted
          style={{ position: "absolute", width: w, height: h, left, top, filter: blur ? `blur(${blur}px)` : undefined }} />
      </div>
      {dim > 0 && <AbsoluteFill style={{ background: C.ink, opacity: dim }} />}
    </AbsoluteFill>
  );
};

const TONES = {
  paper: { background: C.paper, color: C.ink, lip: "rgba(43,37,64,0.22)" },
  good: { background: "#e3f6df", color: C.good, lip: "#4f9e4b" },
  bad: { background: "#fde4e4", color: C.bad, lip: "#ef6a6a" },
  coin: { background: C.coin, color: C.ink, lip: "#b8862a" },
} as const;

export const Chip: React.FC<{ from: number; tone?: keyof typeof TONES; size?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  from, tone = "paper", size = 44, style, children,
}) => {
  const pop = usePop(from);
  const t = TONES[tone];
  return (
    <div
      style={{
        display: "inline-block", padding: `${size * 0.32}px ${size * 0.6}px ${size * 0.26}px`, borderRadius: size * 0.7,
        background: t.background, color: t.color, font: `800 ${size}px/1.15 ${FONT.display}`,
        boxShadow: `0 ${size * 0.16}px 0 ${t.lip}, 0 20px 40px -14px rgba(31,27,46,0.5)`, textWrap: "balance", ...pop, ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Headline: React.FC<{ from: number; size?: number; color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  from, size = 96, color = "#fff", style, children,
}) => {
  const pop = usePop(from, 46);
  return (
    <div
      style={{
        font: `800 ${size}px/1.02 ${FONT.display}`, color, letterSpacing: "-0.01em", textWrap: "balance",
        textShadow: color === "#fff" ? `0 ${size * 0.06}px 0 ${C.lip}, 0 18px 40px rgba(31,27,46,0.35)` : undefined,
        ...pop, ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Logo: React.FC<{ from: number; size: number }> = ({ from, size }) => {
  const frame = useCurrentFrame();
  const pop = usePop(from, 80);
  const hop = interpolate(frame, [from + 22, from + 30, from + 38], [0, -0.1, 0], { ...clamp, easing: Easing.bezier(0.3, 0, 0.3, 1) });
  return (
    <div style={{ font: `800 ${size}px/0.9 ${FONT.display}`, color: "#fff", textShadow: `0 ${size * 0.07}px 0 ${C.lip}, 0 24px 50px rgba(31,27,46,0.4)`, ...pop }}>
      <span style={{ display: "inline-block", translate: `0px ${hop * size}px` }}>Hopper</span>
    </div>
  );
};
