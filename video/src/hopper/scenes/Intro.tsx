import React from "react";
import { AbsoluteFill } from "remotion";
import { Chip, Clip, Headline, Logo, Sky, useLayout } from "../ui";

// 03 · Product intro: the logo lands on the music drop, over the live scene.
export const Intro: React.FC = () => {
  const L = useLayout();
  return (
    <AbsoluteFill>
      <Sky />
      <Clip src="capture/hero.mp4" trim={120} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(31,27,46,0.42) 0%, rgba(31,27,46,0) 55%)" }} />
      <AbsoluteFill style={{ alignItems: "center", textAlign: "center", paddingTop: L.portrait ? L.top + 60 : 110, gap: 18 }}>
        <Logo from={0} size={L.portrait ? 230 : 250} />
        <Headline from={14} size={L.portrait ? 70 : 76}>Every bill needs a home.</Headline>
        <Chip from={34} size={L.portrait ? 42 : 44} style={{ marginTop: 14 }}>
          a 3D game made of real bills from Congress
        </Chip>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
