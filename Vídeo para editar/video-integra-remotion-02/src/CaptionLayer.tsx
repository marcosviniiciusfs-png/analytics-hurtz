import {createTikTokStyleCaptions, type Caption, type TikTokPage} from "@remotion/captions";
import {useCallback, useEffect, useMemo, useState} from "react";
import {AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from "remotion";

const PAGE_MS = 1050;

const CaptionPage: React.FC<{page: TikTokPage}> = ({page}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = page.startMs + frame / fps * 1000;
  return <AbsoluteFill style={{justifyContent:"flex-end",alignItems:"center",paddingBottom:105}}>
    <div style={{maxWidth:1260,padding:"17px 27px 20px",borderRadius:23,background:"rgba(5,19,30,.86)",boxShadow:"0 12px 38px rgba(0,0,0,.36)",color:"white",fontFamily:"Arial, sans-serif",fontSize:50,lineHeight:1.08,fontWeight:900,textAlign:"center",textTransform:"uppercase",opacity:interpolate(frame,[0,4],[0,1],{extrapolateRight:"clamp"}),transform:`translateY(${interpolate(frame,[0,5],[18,0],{easing:Easing.bezier(.16,1,.3,1),extrapolateRight:"clamp"})}px)`}}>
      {page.tokens.map((t)=><span key={`${t.fromMs}-${t.text}`} style={{color:t.fromMs<=time&&t.toMs>time?"#F6A33A":"white"}}>{t.text}</span>)}
    </div>
  </AbsoluteFill>;
};

export const CaptionLayer: React.FC = () => {
  const [captions,setCaptions]=useState<Caption[]|null>(null);
  const {delayRender,continueRender,cancelRender}=useDelayRender();
  const [handle]=useState(()=>delayRender("Carregando legendas"));
  const load=useCallback(async()=>{try{const r=await fetch(staticFile("captions.json"));setCaptions(await r.json());continueRender(handle);}catch(e){cancelRender(e);}},[cancelRender,continueRender,handle]);
  useEffect(()=>{load();},[load]);
  const pages=useMemo(()=>captions?createTikTokStyleCaptions({captions,combineTokensWithinMilliseconds:PAGE_MS}).pages:[],[captions]);
  const {fps}=useVideoConfig();
  if(!captions)return null;
  return <AbsoluteFill>{pages.map((p,i)=>{const next=pages[i+1];const start=Math.floor(p.startMs/1000*fps);const last=p.tokens[p.tokens.length-1];const end=Math.ceil((next?next.startMs:(last?.toMs??p.startMs+PAGE_MS))/1000*fps);return end>start?<Sequence key={`${p.startMs}-${i}`} from={start} durationInFrames={end-start}><CaptionPage page={p}/></Sequence>:null;})}</AbsoluteFill>;
};
