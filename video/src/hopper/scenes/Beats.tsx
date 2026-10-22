import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { DOCKET, DOME, MISTAKE, READ } from "../timeline";
import { Gameplay } from "./Gameplay";

// 04 · Read and sort: an opaque title ("GEO Act") explained by its plain line.
// The camera punches in on the title card while it's read, then pulls back for the drag.
export const ReadSort: React.FC = () => {
  const frame = useCurrentFrame();
  const g = READ.grab;
  const punch = interpolate(frame, [g - 62, g - 42, g - 8, g + 12], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  });
  const focusX = 0.5 + (READ.card.x - 0.5) * punch; // landscape nudges the card left of the corner chips
  const focusY = 0.5 + (READ.card.y - 0.5) * punch;
  return (
    <Gameplay
      clip={{ src: "capture/play.mp4", trim: READ.trim, zoom: 1 + 1.1 * punch, focusX, focusY, wide: { zoom: 1 + 0.9 * punch, focusX: focusX + 0.07 * punch, focusY } }}
      headline="Read what each bill does."
      corner="top-right"
      callouts={[
        { from: 8, text: "Real bills from Congress.gov", tone: "coin" },
        { from: g - 34, text: "One plain line under every title" },
        { from: READ.drop + 2, text: "✓ Energy · the dome grows a ring", tone: "good" },
      ]}
    />
  );
};

// 05 · Mistakes teach: the wrong bin flashes, the right one glows gold.
export const Mistake: React.FC = () => (
  <Gameplay
    clip={{ src: "capture/play.mp4", trim: MISTAKE.trim, bandScale: 1 }}
    headline="Wrong bin? Learn the right one."
    corner="top-left"
    callouts={[
      { from: MISTAKE.drop + 2, text: "✗ Not Health · it's Taxation", tone: "bad" },
      { from: MISTAKE.drop + 20, text: "the right bin glows gold", tone: "coin" },
    ]}
  />
);

// 06 · The goal: 25 right answers build the Capitol dome, ring by ring.
export const Dome: React.FC = () => {
  const frame = useCurrentFrame();
  const rings = frame >= DOME.win ? 25 : DOME.rings.filter((f) => f <= frame).length;
  return (
    <Gameplay
      clip={{ src: "capture/dome.mp4", trim: DOME.trim, zoom: 1.35 }}
      headline="25 right answers finish the dome."
      corner="bottom-left"
      callouts={[
        { from: 6, text: `${rings} / 25 rings`, tone: rings === 25 ? "good" : "paper" },
        { from: DOME.win + 6, text: "Freedom goes on top", tone: "coin" },
      ]}
    />
  );
};

// 07 · The education payoff: the Docket explains every bill you played.
export const Docket: React.FC = () => (
  <Gameplay
    clip={{ src: "capture/docket.mp4", trim: DOCKET.trim, bandScale: 1.5, zoom: 1.52, focusY: 0.42, wide: { zoom: 1.25, focusX: 0.46, focusY: 0.45 } }}
    headline="Then see what every bill you played would do."
    headlinePortrait="Then learn every bill you played."
    corner="left-column"
    callouts={[
      { from: 14, text: "Where it is in Congress" },
      { from: DOCKET.journey + 4, text: "Most bills never make it out of committee.", tone: "coin" },
    ]}
    calloutsPortrait={[{ from: DOCKET.journey + 4, text: "Most bills never make it out of committee.", tone: "coin" }]}
  />
);
