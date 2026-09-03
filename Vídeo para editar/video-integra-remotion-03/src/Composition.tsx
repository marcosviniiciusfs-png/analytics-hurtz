import React from "react";
import {BadgeCheck,Brain,BriefcaseBusiness,ChartNoAxesCombined,Hospital,HouseHeart,SmilePlus,Stethoscope,TrendingDown} from "lucide-react";
import {AbsoluteFill,Audio,Easing,interpolate,OffthreadVideo,Sequence,spring,staticFile,useCurrentFrame,useVideoConfig} from "remotion";
import {CaptionLayer} from "./CaptionLayer";
import {RotoscopedLayer} from "./RotoscopedLayer";

const ink="#061A27",mint="#087A68",blue="#174F91",coral="#A92F3A",white="#FFFFFF";
const clamp={extrapolateLeft:"clamp",extrapolateRight:"clamp"} as const;
const smooth=(f:number,a:number,b:number)=>interpolate(f,[a,b],[0,1],{...clamp,easing:Easing.bezier(.16,1,.3,1)});
const pop=(f:number,fps:number,delay=0)=>spring({frame:f-delay,fps,config:{damping:15,stiffness:160,mass:.65}});
const neonText=(color:string)=>`0 0 7px ${color}CC,0 0 18px ${color}88,0 3px 0 rgba(255,255,255,.7)`;

const Source:React.FC=()=>{const f=useCurrentFrame();return <OffthreadVideo src={staticFile("source.mp4")} style={{width:"100%",height:"100%",objectFit:"cover",scale:interpolate(f,[0,105,119,250,251,380,540,755],[1,1.035,1.015,1.015,1.04,1.055,1.035,1.05],clamp)}}/>};

const CityTag:React.FC=()=>{const f=useCurrentFrame();const p=smooth(f,2,12),rotoHide=smooth(f,112,120)*(1-smooth(f,249,257));return <div style={{position:"absolute",right:42,top:590,zIndex:50,opacity:p*(1-rotoHide),translate:`0 ${interpolate(p,[0,1],[-24,0])}px`,background:coral,color:white,padding:"12px 22px 11px",fontFamily:"Arial,sans-serif",fontWeight:950,fontSize:28,letterSpacing:1.5,boxShadow:`0 0 9px ${coral}CC,0 0 22px ${coral}77,0 8px 22px rgba(0,0,0,.22)`}}>PARAUAPEBAS</div>};

const ProfessionHook:React.FC=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const items=[
  {text:"MÉDICO",color:blue,at:12,out:40,Icon:Stethoscope},
  {text:"DENTISTA",color:mint,at:42,out:70,Icon:SmilePlus},
  {text:"PSICÓLOGO",color:coral,at:72,out:106,Icon:Brain},
];return <AbsoluteFill style={{fontFamily:"Arial,sans-serif",pointerEvents:"none"}}>{items.map(({text,color,at,out,Icon})=>{const iconP=pop(f,fps,at),textP=pop(f,fps,at+6),leave=smooth(f,out,out+8);return <div key={text} style={{position:"absolute",left:58,top:205,display:"flex",alignItems:"center",gap:20,opacity:1-leave,color:ink,textShadow:"0 3px 0 rgba(255,255,255,.95),0 14px 34px rgba(0,0,0,.16)",fontSize:74,fontWeight:950,letterSpacing:2}}><span style={{display:"grid",placeItems:"center",width:82,height:82,borderRadius:"50%",color:white,background:color,boxShadow:`0 10px 30px ${color}55`,opacity:iconP,scale:.65+.35*iconP,translate:`0 ${-4*Math.sin(Math.max(0,f-at)*.16)}px`,rotate:`${3*Math.sin(Math.max(0,f-at)*.11)}deg`}}><Icon size={48} strokeWidth={2.6}/></span><span style={{opacity:textP,translate:`0 ${interpolate(textP,[0,1],[34,0])}px`}}>{text}?</span></div>})}</AbsoluteFill>};

const RotoHealth:React.FC=()=>{const f=useCurrentFrame();const patient=smooth(f,4,22),patientOut=smooth(f,52,64),business=smooth(f,74,92),businessOut=smooth(f,116,126);return <AbsoluteFill style={{fontFamily:"Arial,sans-serif",pointerEvents:"none",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 48%,rgba(32,213,166,.04),rgba(6,26,39,.13))",opacity:smooth(f,0,10)*(1-smooth(f,119,128))}}/>
  <div style={{position:"absolute",left:26,top:270,width:1370,opacity:patient*(1-patientOut),translate:`0 ${interpolate(patient,[0,1],[520,0])}px`,color:white,textShadow:"0 12px 38px rgba(0,0,0,.42)",fontWeight:950,lineHeight:.76}}><div style={{fontSize:318,color:mint,letterSpacing:-16,textShadow:neonText(mint)}}>SAÚDE</div><div style={{fontSize:142,letterSpacing:-2}}>DO PACIENTE</div></div>
  <div style={{position:"absolute",right:20,top:290,width:1370,opacity:business*(1-businessOut),translate:`0 ${interpolate(business,[0,1],[540,0])}px`,color:white,textShadow:"0 12px 38px rgba(0,0,0,.44)",fontWeight:950,lineHeight:.76,textAlign:"right"}}><div style={{fontSize:300,color:blue,letterSpacing:-14,textShadow:neonText(blue)}}>SAÚDE</div><div style={{fontSize:148,letterSpacing:-4}}>DO NEGÓCIO</div></div>
  <RotoscopedLayer src="rotoscopia-saude/foreground-alpha.webm"/>
 </AbsoluteFill>};

const Expertise:React.FC=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const iconP=pop(f,fps),textP=pop(f,fps,7),out=smooth(f,105,118);return <AbsoluteFill style={{fontFamily:"Arial,sans-serif",pointerEvents:"none"}}><div style={{position:"absolute",left:70,top:220,display:"flex",gap:26,alignItems:"flex-start",opacity:1-out}}><div style={{opacity:iconP,scale:.65+.35*iconP,translate:`0 ${-5*Math.sin(f*.13)}px`,rotate:`${2.5*Math.sin(f*.09)}deg`,filter:`drop-shadow(0 0 8px ${mint}) drop-shadow(0 0 18px ${mint}99)`}}><BriefcaseBusiness size={104} color={mint} strokeWidth={2.3}/></div><div style={{opacity:textP,translate:`0 ${interpolate(textP,[0,1],[38,0])}px`}}><div style={{fontSize:31,fontWeight:900,letterSpacing:6,color:mint,textShadow:neonText(mint)}}>NOSSA EQUIPE OFERECE</div><div style={{fontSize:76,fontWeight:950,lineHeight:.94,color:ink,textShadow:"0 3px 0 white"}}>ASSESSORIA<br/><span style={{color:blue,textShadow:neonText(blue)}}>ESPECIALIZADA</span></div></div></div></AbsoluteFill>};

type BenefitKind="tax"|"management"|"calm";
const BenefitIcon:React.FC<{kind:BenefitKind;p:number;frame:number}>=({kind,p,frame})=>{const Icon=kind==="tax"?TrendingDown:kind==="management"?ChartNoAxesCombined:BadgeCheck;const color=kind==="tax"?coral:kind==="management"?blue:mint;return <div style={{width:190,height:190,display:"grid",placeItems:"center",scale:.72+.28*p,rotate:`${interpolate(p,[0,1],[-8,0])+2.4*Math.sin(frame*.1)}deg`,translate:`0 ${-5*Math.sin(frame*.14)}px`,filter:`drop-shadow(0 0 8px ${color}) drop-shadow(0 0 20px ${color}99)`}}><Icon size={172} strokeWidth={2.35} color={color}/></div>};
const Benefit:React.FC<{kind:BenefitKind;title:string;subtitle:string}>=({kind,title,subtitle})=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const iconP=pop(f,fps),textP=pop(f,fps,7),out=smooth(f,47,57),color=kind==="tax"?coral:kind==="management"?blue:mint;return <AbsoluteFill style={{fontFamily:"Arial,sans-serif",pointerEvents:"none",justifyContent:"flex-start",paddingLeft:70,paddingTop:245}}><div style={{display:"flex",alignItems:"center",gap:28,opacity:1-out}}><div style={{opacity:iconP}}><BenefitIcon kind={kind} p={iconP} frame={f}/></div><div style={{maxWidth:760,opacity:textP,translate:`0 ${interpolate(textP,[0,1],[38,0])}px`}}><div style={{fontSize:35,fontWeight:900,letterSpacing:4,color,textShadow:neonText(color)}}>{subtitle}</div><div style={{fontSize:74,fontWeight:950,lineHeight:.92,color:ink,textShadow:"0 3px 0 white"}}>{title}</div></div></div></AbsoluteFill>};

const CTA:React.FC=()=>{const f=useCurrentFrame(),{fps}=useVideoConfig();const intro=pop(f,fps),phase1Out=smooth(f,70,80),phase2Icon=smooth(f,83,94),phase2Text=smooth(f,90,101),phase2Out=smooth(f,128,138),phase3Icon=smooth(f,141,151),phase3Text=smooth(f,148,158),press=interpolate(f,[48,56,61,69],[1,1,.86,1],clamp);return <AbsoluteFill style={{fontFamily:"Arial,sans-serif",pointerEvents:"none"}}>
  <div style={{position:"absolute",left:62,top:205,opacity:intro*(1-phase1Out),translate:`0 ${interpolate(intro,[0,1],[-40,0])}px`}}><div style={{fontSize:34,fontWeight:900,letterSpacing:5,color:mint}}>PRÓXIMO PASSO</div><div style={{fontSize:78,fontWeight:950,lineHeight:.94,color:ink,textShadow:"0 3px 0 white"}}>FALE COM<br/>A NOSSA EQUIPE</div><div style={{marginTop:24,width:390,padding:"18px 22px",borderRadius:999,background:mint,color:ink,textAlign:"center",fontSize:29,fontWeight:950,scale:press,boxShadow:"0 14px 35px rgba(32,213,166,.38)"}}>ENTRAR EM CONTATO</div></div>
  <div style={{position:"absolute",left:58,top:225,width:1260,display:"flex",alignItems:"flex-start",justifyContent:"space-between",opacity:1-phase2Out}}><div style={{opacity:phase2Text,translate:`0 ${interpolate(phase2Text,[0,1],[42,0])}px`}}><div style={{fontSize:31,fontWeight:900,letterSpacing:5,color:blue}}>PARA SUA</div><div style={{fontSize:82,fontWeight:950,lineHeight:.92,color:ink,textShadow:"0 3px 0 white"}}>CLÍNICA OU<br/>CONSULTÓRIO</div></div><div style={{display:"flex",gap:24,marginTop:35,color:mint,opacity:phase2Icon,scale:.72+.28*phase2Icon,translate:`0 ${-5*Math.sin(f*.13)}px`,filter:"drop-shadow(0 12px 22px rgba(8,122,104,.3))"}}><Hospital size={145} strokeWidth={2.1}/><HouseHeart size={145} strokeWidth={2.1}/></div></div>
  <div style={{position:"absolute",left:55,top:245,width:1330,display:"flex",gap:32,alignItems:"flex-start"}}><div style={{opacity:phase3Icon,scale:.7+.3*phase3Icon,translate:`0 ${-5*Math.sin(f*.14)}px`}}><BadgeCheck size={138} color={mint} strokeWidth={2.3}/></div><div style={{opacity:phase3Text,translate:`0 ${interpolate(phase3Text,[0,1],[46,0])}px`}}><div style={{fontSize:38,fontWeight:900,letterSpacing:6,color:mint}}>CRESCER COM</div><div style={{fontSize:101,fontWeight:950,lineHeight:.84,color:ink,textShadow:"0 3px 0 white"}}>MAIS<br/><span style={{color:blue}}>SEGURANÇA</span></div></div></div>
 </AbsoluteFill>};

const Sfx:React.FC<{from:number;file:string;volume:number}>=({from,file,volume})=><Sequence from={from}><Audio src={staticFile(file)} volume={volume}/></Sequence>;

export const EditedVideo03:React.FC=()=> <AbsoluteFill style={{background:ink}}>
  <Source/>
  <Sequence durationInFrames={120}><ProfessionHook/></Sequence>
  <Sequence from={120} durationInFrames={129}><RotoHealth/></Sequence>
  <Sequence from={255} durationInFrames={125}><Expertise/></Sequence>
  <Sequence from={380} durationInFrames={58}><Benefit kind="tax" subtitle="CARGA TRIBUTÁRIA" title="MENOS IMPOSTOS"/></Sequence>
  <Sequence from={438} durationInFrames={58}><Benefit kind="management" subtitle="GESTÃO EFICIENTE" title="MAIS CONTROLE"/></Sequence>
  <Sequence from={496} durationInFrames={58}><Benefit kind="calm" subtitle="NO DIA A DIA" title="TRANQUILIDADE"/></Sequence>
  <Sequence from={549} durationInFrames={206}><CTA/></Sequence>
  <Sfx from={12} file="page-turn.wav" volume={.11}/><Sfx from={42} file="page-turn.wav" volume={.11}/><Sfx from={72} file="page-turn.wav" volume={.11}/>
  <Sfx from={127} file="whoosh.wav" volume={.15}/><Sfx from={195} file="whip.wav" volume={.12}/><Sfx from={211} file="tone-rise.wav" volume={.14}/>
  <Sfx from={255} file="page-turn.wav" volume={.11}/><Sfx from={262} file="whoosh.wav" volume={.07}/><Sfx from={380} file="whip.wav" volume={.13}/><Sfx from={387} file="tone-rise.wav" volume={.07}/><Sfx from={438} file="tone-rise.wav" volume={.14}/><Sfx from={445} file="whoosh.wav" volume={.07}/><Sfx from={496} file="ding.wav" volume={.14}/><Sfx from={503} file="tone-rise.wav" volume={.07}/>
  <Sfx from={549} file="whoosh.wav" volume={.14}/><Sfx from={609} file="mouse-click.wav" volume={.20}/><Sfx from={632} file="page-turn.wav" volume={.10}/><Sfx from={639} file="whoosh.wav" volume={.07}/><Sfx from={690} file="whoosh.wav" volume={.15}/><Sfx from={697} file="tone-rise.wav" volume={.07}/>
  <CaptionLayer/>
  <CityTag/>
 </AbsoluteFill>;
