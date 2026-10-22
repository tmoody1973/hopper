import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Hopper's palette and type, the same tokens as the game's styles.css.
export const C = {
  ink: "#2b2540",
  inkSoft: "#4a4362",
  paper: "#fffaf3",
  skyTop: "#8fc3ec",
  skyBot: "#ffe0b8",
  grassDeep: "#3f7d3c",
  coin: "#f2bd4f",
  good: "#276b31",
  bad: "#a12f2f",
  lip: "#6f6a93",
};

export const FONT = {
  display: '"Baloo 2", "Trebuchet MS", system-ui, sans-serif',
  body: 'Nunito, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

await Promise.all([
  loadFont({ family: "Baloo 2", url: staticFile("fonts/Baloo2-latin.woff2"), weight: "600 800" }),
  loadFont({ family: "Nunito", url: staticFile("fonts/Nunito-latin.woff2"), weight: "500 800" }),
  loadFont({ family: "JetBrains Mono", url: staticFile("fonts/JetBrainsMono-latin.woff2"), weight: "500 700" }),
]);
