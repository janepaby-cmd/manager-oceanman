import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { MainVideoEN } from "./MainVideoEN";

export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={750}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="main-en"
      component={MainVideoEN}
      durationInFrames={750}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
