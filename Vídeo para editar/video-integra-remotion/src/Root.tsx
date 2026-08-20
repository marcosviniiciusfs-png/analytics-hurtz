import "./index.css";
import {Composition} from "remotion";
import {EditedVideo} from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="IntegraEditado"
      component={EditedVideo}
      durationInFrames={744}
      fps={30}
      width={1440}
      height={2560}
    />
  );
};
