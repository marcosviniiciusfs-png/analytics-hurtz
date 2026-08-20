import React from "react";
import {AbsoluteFill,Audio,interpolate,OffthreadVideo,Sequence,spring,staticFile,useCurrentFrame,useVideoConfig} from "remotion";
import {CaptionLayer} from "./CaptionLayer";

const navy="#071D2D", orange="#F39A2E", red="#EF4E45", green="#38C976";
const pop=(f:number,fps:number)=>spring({frame:f,fps,config:{damping:14,stiffness:150,mass:.65}});
const enterStyle=(f:number,fps:number)=>({opacity:interpolate(f,[0,7],[0,1],{extrapolateRight:"clamp"}),transform:`translateY(${interpolate(pop(f,fps),[0,1],[28,0])}px) scale(${interpolate(pop(f,fps),[0,1],[.94,1])})`});

const Card:React.FC<{children:React.ReactNode;width?:number}>=({children,width=610})=><div style={{width,padding:"25px 30px",borderRadius:24,background:"rgba(7,29,45,.94)",boxShadow:"0 16px 42px rgba(0,0,0,.32)",color:"white",fontFamily:"Arial,sans-serif"}}>{children}</div>;

const Hook=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();return <AbsoluteFill style={{alignItems:"center",paddingTop:105,pointerEvents:"none"}}><div style={enterStyle(f,fps)}><Card width={1040}><div style={{color:orange,fontSize:28,fontWeight:900,letterSpacing:3}}>ATENÇÃO À FOLHA</div><div style={{fontSize:58,fontWeight:950,lineHeight:1.02,marginTop:7}}>UM ÚNICO ERRO<br/><span style={{color:red}}>PODE GERAR MULTAS</span></div></Card></div></AbsoluteFill>};

const RiskList=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const items=[{t:"ADMISSÃO FORA DO PRAZO",icon:"⏱",at:60},{t:"RESCISÃO INCORRETA",icon:"R$",at:90},{t:"FALHA NO eSOCIAL",icon:"!",at:174}];return <AbsoluteFill style={{alignItems:"flex-start",justifyContent:"center",paddingLeft:60,paddingBottom:220,pointerEvents:"none"}}><div style={{display:"flex",flexDirection:"column",gap:17}}>{items.map(x=>{const local=f-x.at;if(local<0)return null;return <div key={x.t} style={{...enterStyle(local,fps),display:"flex",alignItems:"center",gap:18,padding:"18px 24px",width:575,borderRadius:20,background:"rgba(7,29,45,.92)",boxShadow:"0 12px 32px rgba(0,0,0,.28)",fontFamily:"Arial",color:"white",fontSize:28,fontWeight:900}}><div style={{width:58,height:58,borderRadius:16,display:"grid",placeItems:"center",background:"rgba(239,78,69,.16)",color:red,fontSize:x.icon==="R$"?22:33,fontWeight:950}}>{x.icon}</div>{x.t}</div>})}</div></AbsoluteFill>};

const Consequence=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();return <AbsoluteFill style={{alignItems:"center",paddingTop:105,pointerEvents:"none"}}><div style={enterStyle(f,fps)}><Card width={1010}><div style={{display:"flex",alignItems:"center",gap:25}}><div style={{fontSize:70}}>⚠</div><div><div style={{fontSize:25,color:red,fontWeight:900,letterSpacing:2}}>RISCO TRABALHISTA</div><div style={{fontSize:48,fontWeight:950}}>PREJUÍZOS E PROCESSOS</div></div></div></Card></div></AbsoluteFill>};

const Services=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const labels=["ADMISSÃO","FÉRIAS","RESCISÃO","eSOCIAL"];return <AbsoluteFill style={{alignItems:"center",paddingTop:90,pointerEvents:"none"}}><div style={enterStyle(f,fps)}><Card width={1100}><div style={{fontSize:27,color:orange,fontWeight:900,letterSpacing:2}}>DEPARTAMENTO PESSOAL COMPLETO</div><div style={{fontSize:49,fontWeight:950,marginTop:4}}>NÓS CUIDAMOS DE TUDO</div><div style={{display:"flex",gap:12,marginTop:19}}>{labels.map((x,i)=>{const p=pop(f-8-i*5,fps);return <div key={x} style={{flex:1,opacity:p,transform:`translateY(${(1-p)*16}px)`,padding:"13px 8px",borderRadius:14,background:i===3?"rgba(243,154,46,.2)":"rgba(255,255,255,.09)",color:i===3?orange:"white",textAlign:"center",fontSize:21,fontWeight:900}}>{x}</div>})}</div></Card></div></AbsoluteFill>};

const Compliance=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const p=pop(f,fps);return <AbsoluteFill style={{alignItems:"center",paddingTop:115,pointerEvents:"none"}}><div style={{...enterStyle(f,fps),display:"flex",alignItems:"center",gap:22,padding:"24px 34px",borderRadius:24,background:"rgba(7,29,45,.94)",boxShadow:"0 16px 42px rgba(0,0,0,.3)",fontFamily:"Arial",color:"white"}}><svg width="76" height="76" viewBox="0 0 76 76"><circle cx="38" cy="38" r="32" fill="rgba(56,201,118,.18)"/><path d="M21 39l11 11 24-27" fill="none" stroke={green} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="55" strokeDashoffset={55*(1-p)}/></svg><div><div style={{fontSize:24,color:green,fontWeight:900,letterSpacing:2}}>SEGURANÇA E CONFORMIDADE</div><div style={{fontSize:47,fontWeight:950}}>EMPRESA EM DIA</div></div></div></AbsoluteFill>};

const CTA=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const clickScale=interpolate(f,[0,12,52,58,64,72],[.92,1,1,.86,.94,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});const clickGlow=interpolate(f,[54,59,70],[0,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});return <AbsoluteFill style={{alignItems:"center",justifyContent:"center",paddingTop:860,pointerEvents:"none"}}><div style={{...enterStyle(f,fps),width:1000,padding:"28px 34px",borderRadius:28,background:"rgba(7,29,45,.96)",boxShadow:"0 18px 48px rgba(0,0,0,.38)",fontFamily:"Arial",color:"white",textAlign:"center",outline:"3px solid rgba(243,154,46,.75)"}}><div style={{fontSize:28,color:orange,fontWeight:900,letterSpacing:2}}>FALE COM A NOSSA EQUIPE</div><div style={{fontSize:50,fontWeight:950,marginTop:5}}>DESCUBRA COMO PODEMOS AJUDAR</div><div style={{margin:"20px auto 0",width:350,padding:"15px",borderRadius:999,background:orange,color:navy,fontSize:28,fontWeight:950,scale:clickScale,boxShadow:`0 0 ${36*clickGlow}px rgba(243,154,46,${.75*clickGlow})`}}>CLIQUE AQUI</div></div></AbsoluteFill>};

const Sfx:React.FC<{from:number,file:string;volume:number}>=({from,file,volume})=><Sequence from={from}><Audio src={staticFile(file)} volume={volume}/></Sequence>;

export const EditedVideo:React.FC=()=> <AbsoluteFill style={{background:navy}}>
  <OffthreadVideo src={staticFile("source.mp4")}/>
  <Sequence from={12} durationInFrames={170}><Hook/></Sequence>
  <Sequence from={188} durationInFrames={217}><RiskList/></Sequence>
  <Sequence from={405} durationInFrames={110}><Consequence/></Sequence>
  <Sequence from={510} durationInFrames={217}><Services/></Sequence>
  <Sequence from={727} durationInFrames={90}><Compliance/></Sequence>
  <Sequence from={817} durationInFrames={135}><CTA/></Sequence>
  {/* Volumes 50% maiores que os da versão anterior deste segundo vídeo. */}
  <Sfx from={12} file="whoosh.wav" volume={0.135}/>
  <Sfx from={248} file="page-turn.wav" volume={0.117}/>
  <Sfx from={278} file="whip.wav" volume={0.117}/>
  <Sfx from={362} file="tone-rise.wav" volume={0.198}/>
  <Sfx from={405} file="whoosh.wav" volume={0.09}/>
  <Sfx from={510} file="page-turn.wav" volume={0.108}/>
  <Sfx from={727} file="ding.wav" volume={0.135}/>
  <Sfx from={817} file="whoosh.wav" volume={0.162}/>
  <Sfx from={873} file="mouse-click.wav" volume={0.234}/>
  <CaptionLayer/>
</AbsoluteFill>;
