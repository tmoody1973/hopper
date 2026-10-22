import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import "./theme";
import { C } from "./theme";
import { len } from "./timeline";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Intro } from "./scenes/Intro";
import { Dome, Docket, Mistake, ReadSort } from "./scenes/Beats";
import { Cta } from "./scenes/Cta";
import { Soundtrack } from "./Soundtrack";

// The 30 s launch video. Hard cuts on the music's beat grid; each scene animates
// its own entrance. One component serves both 16:9 and 9:16 (layout reads the size).
export const Launch: React.FC = () => (
  <AbsoluteFill style={{ background: C.skyTop }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={len("hook")} name="01 Hook"><Hook /></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={len("problem")} name="02 Problem"><Problem /></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={len("intro")} name="03 Intro"><Intro /></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={len("read")} name="04 Read & sort"><ReadSort /></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={len("mistake")} name="05 Mistakes teach"><Mistake /></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={len("dome")} name="06 Build the dome"><Dome /></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={len("docket")} name="07 Your docket"><Docket /></TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={len("cta")} name="08 Play"><Cta /></TransitionSeries.Sequence>
    </TransitionSeries>
    <Soundtrack />
  </AbsoluteFill>
);
