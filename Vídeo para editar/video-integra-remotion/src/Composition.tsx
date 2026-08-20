import {Audio, Video} from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {CaptionLayer} from "./CaptionLayer";

const BrandPill: React.FC<{
  eyebrow: string;
  title: string;
  accent?: "orange" | "green" | "red";
}> = ({eyebrow, title, accent = "orange"}) => {
  const frame = useCurrentFrame();
  const color =
    accent === "green" ? "#47B65B" : accent === "red" ? "#FF5B4D" : "#F3922B";

  return (
    <Interactive.Div
      name={`${title} - card`}
      style={{
        position: "absolute",
        left: 86,
        right: 86,
        top: 150,
        padding: "32px 38px 36px",
        borderRadius: 32,
        backgroundColor: "rgba(9, 30, 48, 0.88)",
        boxShadow: "0 22px 70px rgba(0,0,0,0.35)",
        opacity: interpolate(frame, [0, 7, 82, 92], [0, 1, 1, 0], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [0, 8], [0.93, 1], {
          easing: Easing.spring({damping: 180}),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        }),
        translate: interpolate(frame, [0, 9], ["0px -34px", "0px 0px"], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div
        style={{
          color,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          color: "white",
          fontSize: 70,
          fontWeight: 900,
          lineHeight: 0.98,
          letterSpacing: -2,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
    </Interactive.Div>
  );
};

const CutAccent: React.FC<{color: string}> = ({color}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      name="Acento de corte"
      style={{
        overflow: "hidden",
        pointerEvents: "none",
        backgroundColor: `rgba(255,255,255,${interpolate(frame, [0, 2, 7], [0, 0.18, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -300,
          bottom: -300,
          width: 420,
          left: -500,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          filter: "blur(24px)",
          opacity: 0.5,
          translate: interpolate(frame, [0, 8], ["0px 0px", "2100px 0px"], {
            easing: Easing.bezier(0.55, 0, 0.45, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          rotate: "-12deg",
        }}
      />
    </AbsoluteFill>
  );
};

const AutomationGraphic: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Impostos no automático"
      style={{
        position: "absolute",
        top: 158,
        right: 86,
        width: 380,
        height: 380,
        borderRadius: 190,
        backgroundColor: "rgba(8,29,46,0.91)",
        boxShadow: "0 22px 70px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: interpolate(frame, [0, 7, 68, 80], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [0, 10], [0.75, 1], {
          easing: Easing.spring({damping: 150}),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        }),
      }}
    >
      <svg width="280" height="280" viewBox="0 0 280 280">
        <circle cx="140" cy="140" r="104" fill="none" stroke="#FFFFFF22" strokeWidth="18" />
        <circle
          cx="140"
          cy="140"
          r="104"
          fill="none"
          stroke="#F3922B"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray="490 170"
          style={{rotate: `${interpolate(frame, [0, 80], [0, 185])}deg`, transformOrigin: "140px 140px"}}
        />
        <text x="140" y="132" textAnchor="middle" fill="white" fontSize="58" fontWeight="900">R$</text>
        <text x="140" y="176" textAnchor="middle" fill="#F3922B" fontSize="18" fontWeight="800" letterSpacing="0.3">AUTOMÁTICO</text>
      </svg>
    </Interactive.Div>
  );
};

const StrategyGraphic: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Sem estratégia não dá certo"
      style={{
        position: "absolute",
        top: 170,
        right: 86,
        width: 570,
        padding: "25px 28px",
        borderRadius: 28,
        backgroundColor: "rgba(9, 30, 48, 0.92)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.30)",
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity: interpolate(frame, [0, 7, 27, 37], [0, 1, 1, 0], {
          easing: [Easing.bezier(0.2, 0, 0, 1), Easing.linear, Easing.bezier(0.3, 0, 1, 1)],
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [0, 8, 27, 37], ["35px 0px", "0px 0px", "0px 0px", "24px 0px"], {
          easing: [Easing.bezier(0.2, 0, 0, 1), Easing.linear, Easing.bezier(0.3, 0, 1, 1)],
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <svg width="118" height="118" viewBox="0 0 118 118" style={{flex: "0 0 auto"}}>
        <path
          d="M24 88 L48 63 L67 73 L92 40"
          fill="none"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="110"
          strokeDashoffset={interpolate(frame, [3, 15], [110, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0, 1)})}
        />
        <circle cx="24" cy="88" r={interpolate(frame, [3, 9], [0, 9], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180})})} fill="#F3922B" />
        <circle cx="48" cy="63" r={interpolate(frame, [7, 13], [0, 9], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180})})} fill="#F3922B" />
        <circle cx="67" cy="73" r={interpolate(frame, [11, 17], [0, 9], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180})})} fill="#F3922B" />
        <path d="M91 22 L91 52" stroke="#F3922B" strokeWidth="7" strokeLinecap="round" />
        <path d="M94 23 L112 32 L94 41 Z" fill="#F3922B" opacity={interpolate(frame, [14, 20], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})} />
      </svg>
      <div>
        <div style={{color: "#FF8A80", fontSize: 23, fontWeight: 850, letterSpacing: 2.5}}>ATENÇÃO</div>
        <div
          style={{
            color: "white",
            fontSize: 43,
            lineHeight: 1.02,
            fontWeight: 950,
            marginTop: 6,
            opacity: interpolate(frame, [7, 14], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
            translate: interpolate(frame, [7, 14], ["16px 0px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0, 1)}),
          }}
        >
          SEM ESTRATÉGIA<br />NÃO DÁ CERTO
        </div>
      </div>
    </Interactive.Div>
  );
};

const LossGraphic: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Dinheiro escapando"
      style={{
        position: "absolute",
        top: 170,
        left: 86,
        width: 600,
        padding: "34px 38px",
        borderRadius: 30,
        backgroundColor: "rgba(61, 17, 19, 0.91)",
        boxShadow: "0 22px 70px rgba(0,0,0,0.36)",
        opacity: interpolate(frame, [0, 7, 115, 125], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [0, 9], ["-60px 0px", "0px 0px"], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div style={{position: "absolute", left: 38, top: 25, color: "#FFAAA2", fontSize: 27, fontWeight: 850, letterSpacing: 3}}>SEM PERCEBER</div>
      <div style={{display: "flex", alignItems: "center", gap: 26, marginTop: 30}}>
        <div style={{fontSize: 104, fontWeight: 950, color: "white", opacity: interpolate(frame, [7, 14], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), scale: interpolate(frame, [7, 14], [0.88, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180}), output: "perceptual-scale"})}}>R$</div>
        <svg width="280" height="125" viewBox="0 0 280 125">
          <path
            d="M8 15 L66 50 L99 30 L145 68 L180 43 L234 95"
            fill="none"
            stroke="#FF5B4D"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="310"
            strokeDashoffset={interpolate(frame, [12, 31], [310, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0, 1)})}
          />
          <path
            d="M226 69 L277 121 L211 108 L234 95 Z"
            fill="#FF5B4D"
            opacity={interpolate(frame, [29, 36], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}
            scale={interpolate(frame, [29, 36], [0.65, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({damping: 180})})}
            style={{transformOrigin: "234px 95px"}}
          />
        </svg>
      </div>
      <div
        style={{
          color: "white",
          fontSize: 43,
          fontWeight: 850,
          opacity: interpolate(frame, [18, 28], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
          translate: interpolate(frame, [18, 28], ["0px 24px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0, 1)}),
        }}
      >PERDENDO DINHEIRO TODO MÊS</div>
    </Interactive.Div>
  );
};

const ScannerGraphic: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Raio-X tributário"
      style={{
        position: "absolute",
        top: 160,
        left: 82,
        right: 82,
        height: 570,
        borderRadius: 36,
        border: "4px solid rgba(71,182,91,0.95)",
        boxShadow: "inset 0 0 55px rgba(71,182,91,0.22), 0 22px 70px rgba(0,0,0,0.24)",
        overflow: "hidden",
        opacity: interpolate(frame, [0, 8, 130, 140], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div style={{position: "absolute", inset: 0, backgroundColor: "rgba(5,35,29,0.26)"}} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 10,
          top: 0,
          backgroundColor: "#72EA83",
          boxShadow: "0 0 42px 18px rgba(71,182,91,0.58)",
          translate: interpolate(frame, [0, 65, 130], ["0px 0px", "0px 545px", "0px 0px"], {
            easing: Easing.inOut(Easing.quad),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
      <div style={{position: "absolute", left: 38, top: 34, color: "white", fontSize: 64, fontWeight: 950, opacity: interpolate(frame, [3, 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), translate: interpolate(frame, [3, 12], ["0px 24px", "0px 0px"], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0, 1)})}}>RAIO-X TRIBUTÁRIO</div>
      <div style={{position: "absolute", left: 42, bottom: 35, display: "flex", gap: 18}}>
        <span style={{backgroundColor: "#47B65B", color: "white", borderRadius: 999, padding: "15px 24px", fontSize: 29, fontWeight: 850, opacity: interpolate(frame, [38, 47], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), clipPath: `inset(0 ${interpolate(frame, [38, 47], [100, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0, 1)})}% 0 0 round 999px)`}}>✓ ECONOMIA LEGAL</span>
        <span style={{backgroundColor: "rgba(9,30,48,0.9)", color: "white", borderRadius: 999, padding: "15px 24px", fontSize: 29, fontWeight: 850, opacity: interpolate(frame, [98, 107], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}), clipPath: `inset(0 ${interpolate(frame, [98, 107], [100, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0, 1)})}% 0 0 round 999px)`}}>✓ DIAGNÓSTICO</span>
      </div>
    </Interactive.Div>
  );
};

const FitGraphic: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Enquadramento adequado"
      style={{
        position: "absolute",
        top: 170,
        left: 88,
        right: 88,
        padding: "34px 40px",
        borderRadius: 32,
        backgroundColor: "rgba(9,30,48,0.9)",
        boxShadow: "0 22px 70px rgba(0,0,0,0.32)",
        opacity: interpolate(frame, [0, 7, 66, 76], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [0, 9], [0.92, 1], {
          easing: Easing.spring({damping: 180}),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        }),
      }}
    >
      <div style={{color: "#8FE29C", fontSize: 30, letterSpacing: 3, fontWeight: 850}}>PLANEJAMENTO SOB MEDIDA</div>
      <div style={{color: "white", fontSize: 65, lineHeight: 1.02, marginTop: 10, fontWeight: 950}}>ENQUADRAMENTO MAIS ADEQUADO</div>
      <div style={{height: 13, marginTop: 26, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden"}}>
        <div style={{height: "100%", width: `${interpolate(frame, [6, 54], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}%`, backgroundColor: "#47B65B", borderRadius: 10}} />
      </div>
    </Interactive.Div>
  );
};

const CtaGraphic: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="CTA diagnóstico tributário"
      style={{
        position: "absolute",
        left: 84,
        right: 84,
        top: 150,
        padding: "42px 44px",
        borderRadius: 38,
        background: "linear-gradient(135deg, rgba(9,30,48,0.96), rgba(18,66,61,0.96))",
        border: "4px solid #F3922B",
        boxShadow: "0 26px 85px rgba(0,0,0,0.42)",
        opacity: interpolate(frame, [0, 7], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
        scale: interpolate(frame, [0, 10], [0.86, 1], {
          easing: Easing.spring({damping: 145}),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        }),
      }}
    >
      <div style={{color: "#F3922B", fontSize: 30, fontWeight: 900, letterSpacing: 3}}>PRÓXIMO PASSO</div>
      <div style={{color: "white", fontSize: 72, lineHeight: 1.02, fontWeight: 950, marginTop: 10}}>SOLICITE SEU<br />DIAGNÓSTICO TRIBUTÁRIO</div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          marginTop: 30,
          padding: "20px 30px",
          borderRadius: 999,
          color: "#0A2530",
          backgroundColor: "#F3922B",
          fontSize: 38,
          fontWeight: 950,
          scale: interpolate(frame, [22, 27, 32], [1, 1.055, 1], {
            easing: Easing.inOut(Easing.quad),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        CLIQUE AQUI <span style={{fontSize: 50}}>→</span>
      </div>
    </Interactive.Div>
  );
};

export const EditedVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: "#071723", fontFamily: "Arial, Helvetica, sans-serif"}}>
      <Video
        name="Vídeo original"
        src={staticFile("source.mp4")}
        durationInFrames={744}
        objectFit="cover"
        style={{
          width: "100%",
          height: "100%",
          scale: interpolate(
            frame,
            [0, 126, 131, 249, 254, 388, 393, 535, 540, 614, 619, durationInFrames - 1],
            [1.015, 1.04, 1.015, 1.04, 1.015, 1.045, 1.015, 1.04, 1.015, 1.035, 1.015, 1.045],
            {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad)},
          ),
        }}
      />

      <AbsoluteFill
        name="Contraste e vinheta"
        style={{
          background: "linear-gradient(180deg, rgba(4,18,29,0.16) 0%, transparent 30%, transparent 66%, rgba(4,18,29,0.30) 100%)",
          pointerEvents: "none",
        }}
      />

      <Sequence name="Gancho" from={4} durationInFrames={126}>
        <BrandPill eyebrow="Atenção, empresário" title="Planejamento tributário" />
      </Sequence>
      <Sequence name="Impostos automáticos" from={137} durationInFrames={81}>
        <AutomationGraphic />
      </Sequence>
      <Sequence name="Sem estratégia" from={218} durationInFrames={39}>
        <StrategyGraphic />
      </Sequence>
      <Sequence name="Perda financeira" from={257} durationInFrames={136}>
        <LossGraphic />
      </Sequence>
      <Sequence name="Raio-X" from={393} durationInFrames={148}>
        <ScannerGraphic />
      </Sequence>
      <Sequence name="Enquadramento" from={541} durationInFrames={79}>
        <FitGraphic />
      </Sequence>
      <Sequence name="Chamada final" from={619} durationInFrames={125}>
        <CtaGraphic />
      </Sequence>

      <Sequence name="Corte 1" from={127} durationInFrames={10}><CutAccent color="#F3922B" /></Sequence>
      <Sequence name="Corte 2" from={250} durationInFrames={10}><CutAccent color="#FFFFFF" /></Sequence>
      <Sequence name="Corte 3" from={389} durationInFrames={10}><CutAccent color="#47B65B" /></Sequence>
      <Sequence name="Corte 4" from={536} durationInFrames={10}><CutAccent color="#F3922B" /></Sequence>
      <Sequence name="Corte 5" from={615} durationInFrames={10}><CutAccent color="#47B65B" /></Sequence>

      <Sequence name="SFX gancho entrada" from={4} durationInFrames={18}><Audio src={staticFile("whoosh.wav")} volume={0.075} /></Sequence>
      <Sequence name="SFX gancho saída" from={119} durationInFrames={18}><Audio src={staticFile("page-turn.wav")} volume={0.045} /></Sequence>
      <Sequence name="SFX automático entrada" from={137} durationInFrames={18}><Audio src={staticFile("tone-rise.wav")} volume={0.14} /></Sequence>
      <Sequence name="SFX automático saída" from={207} durationInFrames={18}><Audio src={staticFile("whip.wav")} volume={0.045} /></Sequence>
      <Sequence name="SFX estratégia entrada" from={218} durationInFrames={18}><Audio src={staticFile("page-turn.wav")} volume={0.065} /></Sequence>
      <Sequence name="SFX estratégia saída" from={247} durationInFrames={18}><Audio src={staticFile("whoosh.wav")} volume={0.05} /></Sequence>
      <Sequence name="SFX perda entrada" from={257} durationInFrames={18}><Audio src={staticFile("whip.wav")} volume={0.065} /></Sequence>
      <Sequence name="SFX seta desenhando" from={269} durationInFrames={22}><Audio src={staticFile("tone-rise.wav")} volume={0.11} /></Sequence>
      <Sequence name="SFX perda saída" from={383} durationInFrames={18}><Audio src={staticFile("whoosh.wav")} volume={0.05} /></Sequence>
      <Sequence name="SFX raio-X varredura" from={393} durationInFrames={28}><Audio src={staticFile("scanner.wav")} volume={0.22} /></Sequence>
      <Sequence name="SFX selo economia" from={431} durationInFrames={28}><Audio src={staticFile("ding.wav")} volume={0.075} /></Sequence>
      <Sequence name="SFX selo diagnóstico" from={491} durationInFrames={28}><Audio src={staticFile("ding.wav")} volume={0.075} /></Sequence>
      <Sequence name="SFX raio-X saída" from={530} durationInFrames={18}><Audio src={staticFile("whoosh.wav")} volume={0.05} /></Sequence>
      <Sequence name="SFX enquadramento entrada" from={541} durationInFrames={18}><Audio src={staticFile("page-turn.wav")} volume={0.06} /></Sequence>
      <Sequence name="SFX enquadramento saída" from={609} durationInFrames={18}><Audio src={staticFile("whip.wav")} volume={0.04} /></Sequence>
      <Sequence name="SFX CTA entrada" from={619} durationInFrames={18}><Audio src={staticFile("whoosh.wav")} volume={0.09} /></Sequence>
      <Sequence name="SFX CTA" from={640} durationInFrames={24}><Audio src={staticFile("mouse-click.wav")} volume={0.13} /></Sequence>

      <CaptionLayer />
    </AbsoluteFill>
  );
};
