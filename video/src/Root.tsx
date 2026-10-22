import { Composition, Still } from "remotion";
import { ThumbChallenge, ThumbQuiz, ThumbStat } from "./hopper/Thumbs";
import { Launch } from "./hopper/Launch";
import { FPS, TOTAL } from "./hopper/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Launch16x9" component={Launch} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
      <Composition id="Launch9x16" component={Launch} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
      {[["Quiz", ThumbQuiz], ["Stat", ThumbStat], ["Challenge", ThumbChallenge]].flatMap(([name, C]) => [
        <Still key={`${name}yt`} id={`Thumb${name}YouTube`} component={C as React.FC} width={1280} height={720} />,
        <Still key={`${name}ig`} id={`Thumb${name}Reel`} component={C as React.FC} width={1080} height={1920} />,
      ])}
    </>
  );
};
