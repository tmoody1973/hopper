// Scene timings for the 30 s launch video, and the windows into each recorded
// gameplay clip. Clip windows come from the recorder's event logs, so
// re-recording the game re-syncs the cut and the sound automatically.
import play from "../../public/capture/play.events.json";
import dome from "../../public/capture/dome.events.json";
import docket from "../../public/capture/docket.events.json";

type CaptureEvent = { frame: number; type: string; title?: string; n?: number; cardX?: number; cardY?: number };

function at(list: CaptureEvent[], type: string, title?: string): number {
  const found = list.find((e) => e.type === type && (title === undefined || e.title === title));
  if (!found) throw new Error(`Recording has no "${type}" event${title ? ` for "${title}"` : ""}. Re-run scripts/record.mjs.`);
  return found.frame;
}

export const FPS = 30;
export const TOTAL = 900;

// [start, end) in video frames. Every cut lands on the 120 BPM music grid (15 frames).
export const SCENES = {
  hook: [0, 90],
  problem: [90, 180],
  intro: [180, 285],
  read: [285, 465],
  mistake: [465, 585],
  dome: [585, 705],
  docket: [705, 840],
  cta: [840, 900],
} as const;
export type SceneName = keyof typeof SCENES;
export const len = (s: SceneName) => SCENES[s][1] - SCENES[s][0];

// Frames below are relative to the start of each scene.
const GEO = "GEO Act";
const readStart = at(play, "launch", GEO) - 12;
const geoGrab = (play as CaptureEvent[]).find((e) => e.type === "grab" && e.title === GEO);
export const READ = {
  trim: readStart,
  launch: 12,
  grab: at(play, "grab", GEO) - readStart,
  drop: at(play, "correct", GEO) - readStart,
  card: { x: geoGrab?.cardX ?? 0.33, y: geoGrab?.cardY ?? 0.2 }, // where the title card is on screen
};

const FAIRTAX = "FairTax Act of 2025";
const mistakeStart = at(play, "wrong", FAIRTAX) - 75;
export const MISTAKE = {
  trim: mistakeStart,
  grab: at(play, "grab", FAIRTAX) - mistakeStart,
  drop: 75,
};

export const DOME = {
  trim: 0,
  rings: (dome as CaptureEvent[]).filter((e) => e.type === "ring").map((e) => e.frame),
  win: at(dome, "win"),
};

export const DOCKET = {
  trim: 0,
  journey: at(docket, "journey"),
};
