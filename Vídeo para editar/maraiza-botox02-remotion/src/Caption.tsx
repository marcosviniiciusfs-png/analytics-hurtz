import type {CSSProperties} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';

type Props = {text: string; cueStartFrame: number; cueEndFrame: number};

// Adaptado da gramática do Caption aceito pela video-shotcraft:
// entrada curta de 8 frames com fade e deslocamento vertical discreto.
export const Caption = ({text, cueStartFrame, cueEndFrame}: Props) => {
  const frame = useCurrentFrame();
  const local = frame - cueStartFrame;
  const exit = interpolate(frame, [cueEndFrame - 7, cueEndFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const words = text.split(/(\s+)/);
  const style: CSSProperties = {
    whiteSpace: 'pre-line',
    color: '#fff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 60,
    fontWeight: 700,
    lineHeight: 1.12,
    letterSpacing: -1.1,
    textAlign: 'center',
    textShadow: '0 3px 7px rgba(0,0,0,0.72)',
    transform: `translateY(${-exit * 12}px)`,
    filter: `blur(${exit * 9}px)`,
    opacity: 1 - exit,
  };
  return (
    <div style={style}>
      {words.map((word, index) => {
        if (/^\s+$/.test(word)) return word;
        const delay = Math.min(index * 0.8, 7);
        const progress = interpolate(local, [delay, delay + 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: 'inline-block',
              opacity: progress,
              transform: `translateY(${(1 - progress) * 26}px)`,
              filter: `blur(${(1 - progress) * 10}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
