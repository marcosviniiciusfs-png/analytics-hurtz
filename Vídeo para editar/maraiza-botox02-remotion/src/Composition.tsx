import {AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Caption} from './Caption';
import {captions} from './captions';

const FPS = 30;

export const MaraizaBotox02 = () => {
  const frame = useCurrentFrame();
  const active = captions.find((cue) => frame >= cue.start * FPS && frame < cue.end * FPS);
  const tagOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagY = interpolate(frame, [0, 8], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <OffthreadVideo src={staticFile('maraiza-botox02.mp4')} />
      <div
        style={{
          position: 'absolute',
          top: 565,
          right: 52,
          padding: '14px 21px 13px',
          backgroundColor: '#c5282f',
          color: '#fff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: 0.6,
          lineHeight: 1,
          boxShadow: '0 5px 12px rgba(0,0,0,0.24)',
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
        }}
      >
        PARAUAPEBAS E REGIÃO
      </div>
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          top: 1770,
          height: 190,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {active ? (
          <Caption
            text={active.text}
            cueStartFrame={Math.round(active.start * FPS)}
            cueEndFrame={Math.round(active.end * FPS)}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
