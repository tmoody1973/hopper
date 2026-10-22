import { Composition } from "remotion";
import { Launch } from "./hopper/Launch";
import { FPS, TOTAL } from "./hopper/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Launch16x9" component={Launch} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
      <Composition id="Launch9x16" component={Launch} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
    </>
  );
};
