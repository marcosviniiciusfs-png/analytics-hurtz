import "./index.css";
import {Composition} from "remotion";
import {EditedVideo} from "./Composition";

export const RemotionRoot: React.FC = () => (
  <Composition id="IntegraEditado02" component={EditedVideo} durationInFrames={952} fps={30} width={1440} height={2022} />
);
