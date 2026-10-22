import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Chip, Clip, Headline, Sky, useLayout } from "../ui";

// 01 · Hook: one real number, counted up. 19,716 = bills and resolutions in the
// 119th Congress on Congress.gov (pagination count, Oct 22 2026).
export const BILL_COUNT = 19716;

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const count = interpolate(frame, [6, 54], [0, BILL_COUNT], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0.7, 0.2, 1),
  });
  return (
    <AbsoluteFill>
      <Sky />
      <Clip src="capture/hero.mp4" trim={0} blur={14} dim={0.4} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: L.side, gap: 10 }}>
        <Headline from={2} size={L.portrait ? 210 : 240} style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(count).toLocaleString("en-US")}
        </Headline>
        <Headline from={18} size={L.portrait ? 78 : 88}>bills and resolutions</Headline>
        <Chip from={50} tone="coin" size={L.portrait ? 52 : 54} style={{ marginTop: 30 }}>
          so far, this Congress
        </Chip>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
