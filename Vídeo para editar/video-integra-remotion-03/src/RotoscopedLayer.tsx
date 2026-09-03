import type React from "react";
import type {CSSProperties} from "react";
import {Video} from "@remotion/media";
import {staticFile} from "remotion";

export const RotoscopedLayer: React.FC<{src:string;style?:CSSProperties}> = ({src,style}) => (
  <Video src={staticFile(src)} volume={0} objectFit="cover" style={{position:"absolute",inset:0,width:"100%",height:"100%",...style}} />
);
