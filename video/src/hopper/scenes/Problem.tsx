import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Clip, Headline, Sky, useLayout } from "../ui";

// 02 · Problem: the number becomes the viewer's problem.
export const PROBLEM_WORDS = [
  { text: "Could you say", from: 0 },
  { text: "what any of them", from: 10 },
  { text: "actually do?", from: 22 },
];

export const Problem: React.FC = () => {
  const L = useLayout();
  return (
    <AbsoluteFill>
      <Sky />
      <Clip src="capture/hero.mp4" trim={90} blur={14} dim={0.4} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: L.side }}>
        {PROBLEM_WORDS.map((w, i) => (
          <Headline key={w.text} from={w.from} size={L.portrait ? 112 : 132} color={i === 2 ? C.coin : "#fff"}
            style={i === 2 ? { textShadow: `0 8px 0 ${C.lip}, 0 18px 40px rgba(31,27,46,0.35)` } : undefined}>
            {w.text}
          </Headline>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
