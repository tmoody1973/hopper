import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";
import { Chip, Clip, Headline, Logo, Sky } from "./ui";
import { BILL_COUNT } from "./scenes/Hook";
import { DOME, READ } from "./timeline";

// Thumbnails: YouTube 1280x720 and Instagram Reel covers 1080x1920. Each one aims
// at one reaction: Quiz -> comments, Stat -> reposts, Challenge -> likes/plays.
// Reel covers keep text inside the centre 3:4 the profile grid shows.
const SETTLED = -30; // pop-in animations start well before frame 0, so stills are fully settled

function useUnit() {
  const { width, height } = useVideoConfig();
  return { u: width / 100, portrait: height > width };
}

const Stack: React.FC<{ gap: number; children: React.ReactNode }> = ({ gap, children }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 6%", gap }}>{children}</AbsoluteFill>
);

const Brand: React.FC = () => {
  const { u, portrait } = useUnit();
  return (
    <div style={{ position: "absolute", ...(portrait ? { top: "15%", left: 0, right: 0, textAlign: "center" } : { left: u * 3, top: u * 2 }) }}>
      <Logo from={SETTLED} size={u * (portrait ? 9 : 5)} />
    </div>
  );
};

// Opaque title, three plausible bins. Answer: Energy (geothermal permits).
const GUESSES = [
  { text: "Education?", color: "#6c9fe0" },
  { text: "Energy?", color: "#f39a4b" },
  { text: "Environment?", color: "#4fb3a9" },
];

export const ThumbQuiz: React.FC = () => {
  const { u, portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Sky />
      <Clip src="capture/play.mp4" trim={READ.trim + READ.drop - 20} blur={5} dim={0.45} />
      <Brand />
      <Stack gap={u * 1.6}>
        <Chip from={SETTLED} tone="coin" size={u * 3} style={{ fontFamily: FONT.mono }}>a real bill · H.R. 301</Chip>
        <Headline from={SETTLED} size={u * (portrait ? 21 : 16)}>GEO Act</Headline>
        <Headline from={SETTLED} size={u * (portrait ? 10 : 7)}>Which bin?</Headline>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: u * 1.4, marginTop: u }}>
          {GUESSES.map((g) => (
            <Chip key={g.text} from={SETTLED} size={u * (portrait ? 5.6 : 3.8)} style={{ background: g.color, color: C.ink }}>{g.text}</Chip>
          ))}
        </div>
        {portrait && <Chip from={SETTLED} size={u * 4.4} style={{ marginTop: u * 3 }}>guess in the comments ↓</Chip>}
      </Stack>
    </AbsoluteFill>
  );
};

export const ThumbStat: React.FC = () => {
  const { u, portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Sky />
      <Clip src="capture/dome.mp4" trim={0} blur={10} dim={0.5} />
      <Brand />
      <Stack gap={u * 0.8}>
        <Headline from={SETTLED} size={u * (portrait ? 24 : 19)} style={{ fontVariantNumeric: "tabular-nums" }}>
          {BILL_COUNT.toLocaleString("en-US")}
        </Headline>
        <Headline from={SETTLED} size={u * (portrait ? 9 : 6.5)}>bills this Congress</Headline>
        <Chip from={SETTLED} tone="coin" size={u * (portrait ? 6.4 : 4.6)} style={{ marginTop: u * 2.4 }}>
          Most never leave committee.
        </Chip>
      </Stack>
    </AbsoluteFill>
  );
};

export const ThumbChallenge: React.FC = () => {
  const { u, portrait } = useUnit();
  return (
    <AbsoluteFill>
      <Sky />
      <Clip src="capture/dome.mp4" trim={DOME.win - 4} zoom={portrait ? 1 : 1.35} focusY={0.4} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(31,27,46,0.55) 0%, rgba(31,27,46,0.3) 80%)" }} />
      <Brand />
      <Stack gap={u * 1.6}>
        <Headline from={SETTLED} size={u * (portrait ? 13 : 10)}>Can you finish the dome?</Headline>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: u * 1.4, marginTop: u }}>
          <Chip from={SETTLED} size={u * (portrait ? 7 : 5)} style={{ fontFamily: FONT.mono }}>24 / 25</Chip>
          <Chip from={SETTLED} tone="good" size={u * (portrait ? 5 : 3.6)}>sort real bills from Congress</Chip>
        </div>
      </Stack>
    </AbsoluteFill>
  );
};
