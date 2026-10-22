import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../theme";
import { Chip, Clip, Headline, Logo, Sky, useLayout } from "../ui";

export const PLAY_URL = "thehoppergame.com";

// 08 · Call to action.
export const Cta: React.FC = () => {
  const L = useLayout();
  return (
    <AbsoluteFill>
      <Sky />
      <Clip src="capture/hero.mp4" trim={150} blur={12} dim={0.35} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: L.side, gap: 22 }}>
        <Logo from={0} size={L.portrait ? 200 : 210} />
        <Headline from={6} size={L.portrait ? 84 : 92}>Play free in your browser</Headline>
        <Chip from={12} size={L.portrait ? 54 : 58} style={{ fontFamily: FONT.mono, fontWeight: 700 }}>{PLAY_URL}</Chip>
        <Chip from={18} tone="coin" size={L.portrait ? 40 : 42} style={{ color: C.ink }}>no sign-up · 2–4 minute rounds</Chip>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
