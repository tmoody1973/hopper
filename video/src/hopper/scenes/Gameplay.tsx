import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Chip, Clip, Headline, Sky, useLayout } from "../ui";

// Shared layout for the gameplay beats. Landscape: full-bleed footage with paper
// chips in the corner the action isn't using. Portrait: footage in a band, the
// headline above it and the chips below, inside the Reels/Shorts safe zones.
export type Callout = { from: number; text: string; tone?: "paper" | "good" | "bad" | "coin" };

type Props = {
  // Portrait camera: zoom/focus/bandScale. Landscape camera: `wide`.
  clip: { src: string; trim: number; zoom?: number; focusX?: number; focusY?: number; bandScale?: number; wide?: { zoom?: number; focusX?: number; focusY?: number } };
  headline: string;
  headlinePortrait?: string; // shorter line when the portrait band needs the room
  callouts: Callout[];
  calloutsPortrait?: Callout[]; // fewer chips when the portrait band needs the room
  corner: "top-left" | "top-right" | "bottom-left" | "left-column";
};

export const Gameplay: React.FC<Props> = ({ clip, headline, headlinePortrait, callouts, calloutsPortrait, corner }) => {
  const L = useLayout();
  if (L.portrait) {
    return (
      <AbsoluteFill>
        <Sky />
        <Clip src={clip.src} trim={clip.trim} mode="band" bandScale={clip.bandScale} zoom={clip.zoom ?? 1} focusX={clip.focusX ?? 0.5} focusY={clip.focusY ?? 0.5} />
        <div style={{ position: "absolute", left: L.side, right: L.side, top: L.top, textAlign: "center" }}>
          <Headline from={0} size={92} color={C.ink}>{headlinePortrait ?? headline}</Headline>
        </div>
        <div style={{ position: "absolute", left: L.side, right: L.side, bottom: L.bottom, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          {(calloutsPortrait ?? callouts).map((c) => (
            <Chip key={c.text} from={c.from} tone={c.tone} size={44}>{c.text}</Chip>
          ))}
        </div>
      </AbsoluteFill>
    );
  }
  const pos: React.CSSProperties = {
    "top-left": { left: L.side, top: L.top, alignItems: "flex-start" },
    "top-right": { right: L.side, top: L.top, alignItems: "flex-end" },
    "bottom-left": { left: L.side, bottom: L.bottom, alignItems: "flex-start" },
    "left-column": { left: L.side, top: L.top + 40, width: 400, alignItems: "flex-start" },
  }[corner];
  return (
    <AbsoluteFill>
      <Clip src={clip.src} trim={clip.trim} zoom={clip.wide?.zoom ?? 1} focusX={clip.wide?.focusX ?? 0.5} focusY={clip.wide?.focusY ?? 0.5} />
      <div style={{ position: "absolute", display: "flex", flexDirection: "column", gap: 20, maxWidth: 900, ...pos }}>
        <Chip from={0} size={corner === "left-column" ? 52 : 60}>{headline}</Chip>
        {callouts.map((c) => (
          <Chip key={c.text} from={c.from} tone={c.tone} size={44}>{c.text}</Chip>
        ))}
      </div>
    </AbsoluteFill>
  );
};
