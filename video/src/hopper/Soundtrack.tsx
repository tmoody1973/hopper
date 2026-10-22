import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { DOCKET, DOME, MISTAKE, READ, SCENES, TOTAL } from "./timeline";
import { PROBLEM_WORDS } from "./scenes/Problem";

// Music plus sound effects. Every sound was rendered from the game's own
// synthesizer recipes (capture.js), so the video sounds like the game.
type Cue = { at: number; name: string; volume?: number; frames?: number };

const s = (scene: keyof typeof SCENES, offset: number) => SCENES[scene][0] + offset;

const CUES: Cue[] = [
  ...Array.from({ length: 13 }, (_, i) => ({ at: 6 + i * 4, name: "tick", volume: 0.55 })),
  { at: 84, name: "whoosh" },
  ...PROBLEM_WORDS.map((w) => ({ at: s("problem", w.from), name: "pop", volume: 0.8 })),
  { at: s("intro", 0), name: "gavel", frames: 36 },
  { at: s("read", 0) - 4, name: "whoosh", volume: 0.6 },
  { at: s("read", READ.launch), name: "launch" },
  { at: s("read", READ.grab), name: "grab" },
  { at: s("read", READ.drop), name: "correct" },
  ...(MISTAKE.grab >= 0 ? [{ at: s("mistake", MISTAKE.grab), name: "grab" }] : []),
  { at: s("mistake", MISTAKE.drop), name: "wrong", frames: 30 },
  ...DOME.rings.filter((_, i) => i % 2 === 0).map((f) => ({ at: s("dome", f), name: "tick", volume: 0.6 })),
  { at: s("dome", DOME.win), name: "win", frames: 70 },
  { at: s("docket", 0) - 4, name: "whoosh", volume: 0.6 },
  { at: s("docket", 6), name: "click" },
  { at: s("docket", DOCKET.journey + 4), name: "pop" },
  { at: s("cta", 6), name: "pop" },
  { at: s("cta", 12), name: "pop" },
];

export const Soundtrack: React.FC = () => (
  <>
    <Audio src={staticFile("capture/audio/music.wav")} volume={0.5} />
    {CUES.filter((c) => c.at >= 0 && c.at < TOTAL).map((c, i) => (
      <Sequence key={`${c.name}-${i}`} from={c.at} durationInFrames={c.frames ?? 24} layout="none">
        <Audio src={staticFile(`capture/audio/${c.name}.wav`)} volume={c.volume ?? 0.9} />
      </Sequence>
    ))}
  </>
);
