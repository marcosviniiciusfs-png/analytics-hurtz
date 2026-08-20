import "./index.css";
import {Composition} from "remotion";
import {EditedVideo03} from "./Composition";

export const RemotionRoot: React.FC = () => (
  <Composition id="IntegraEditado03" component={EditedVideo03} durationInFrames={755} fps={30} width={1440} height={2560} />
);
