import "./index.css";
import {Composition} from "remotion";
import {IntegraVideo01Edit} from "./Composition";

export const RemotionRoot:React.FC=()=> <Composition id="IntegraVideo01Edit" component={IntegraVideo01Edit} durationInFrames={1000} fps={30} width={1440} height={1440}/>;
