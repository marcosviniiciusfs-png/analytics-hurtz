import {createTikTokStyleCaptions, type Caption, type TikTokPage} from "@remotion/captions";
import {useCallback, useEffect, useMemo, useState} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";

const SWITCH_CAPTIONS_EVERY_MS = 1050;

const CaptionPage: React.FC<{page: TikTokPage}> = ({page}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const absoluteTimeMs = page.startMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", paddingBottom: 205}}>
      <div
        style={{
          maxWidth: 1220,
          padding: "19px 28px 22px",
          borderRadius: 24,
          backgroundColor: "rgba(5, 19, 30, 0.84)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.34)",
          border: "2px solid rgba(255,255,255,0.15)",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 57,
          lineHeight: 1.1,
          fontWeight: 900,
          textAlign: "center",
          textTransform: "uppercase",
          whiteSpace: "pre-wrap",
          opacity: interpolate(frame, [0, 4], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [0, 5], ["0px 20px", "0px 0px"], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {page.tokens.map((token) => {
          const isActive = token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;
          return (
            <span
              key={`${token.fromMs}-${token.text}`}
              style={{
                color: isActive ? "#F6A33A" : "white",
                textShadow: isActive ? "0 0 20px rgba(246,163,58,0.38)" : "none",
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const CaptionLayer: React.FC = () => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender("Carregando legendas"));

  const fetchCaptions = useCallback(async () => {
    try {
      const response = await fetch(staticFile("captions.json"));
      const data = (await response.json()) as Caption[];
      setCaptions(data);
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [cancelRender, continueRender, handle]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  const pages = useMemo(() => {
    if (!captions) return [];
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
    }).pages;
  }, [captions]);

  const {fps} = useVideoConfig();
  if (!captions) return null;

  return (
    <AbsoluteFill name="Legendas dinâmicas">
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        const lastToken = page.tokens[page.tokens.length - 1];
        const endFrame = Math.ceil(
          nextPage
            ? (nextPage.startMs / 1000) * fps
            : ((lastToken?.toMs ?? page.startMs + SWITCH_CAPTIONS_EVERY_MS) / 1000) * fps,
        );
        const durationInFrames = endFrame - startFrame;
        if (durationInFrames <= 0) return null;
        return (
          <Sequence key={`${page.startMs}-${index}`} from={startFrame} durationInFrames={durationInFrames}>
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
