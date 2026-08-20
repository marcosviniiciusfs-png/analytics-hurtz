import {Audio} from '@remotion/media';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const premium = Easing.bezier(0.2, 0, 0, 1);
const smooth = Easing.bezier(0.4, 0, 0.2, 1);

type SliceProps = {
  clip: string;
  from: number;
  duration?: number;
  x?: number;
  y?: number;
  scaleFrom?: number;
  origin?: string;
  opacity?: number;
};

const LogoSlice = ({
  clip,
  from,
  duration = 18,
  x = 0,
  y = 42,
  scaleFrom = 0.985,
  origin = '50% 50%',
  opacity = 1,
}: SliceProps) => {
  const frame = useCurrentFrame();
  return (
    <Img
      src={staticFile('logo-integra-profissional.svg')}
      style={{
        position: 'absolute',
        inset: 0,
        width: 1080,
        height: 1080,
        clipPath: clip,
        opacity: interpolate(frame, [from, from + duration], [0, opacity], {
          ...clamp,
          easing: premium,
        }),
        translate: `${interpolate(frame, [from, from + duration], [x, 0], {
          ...clamp,
          easing: premium,
        })}px ${interpolate(frame, [from, from + duration], [y, 0], {
          ...clamp,
          easing: premium,
        })}px`,
        scale: interpolate(frame, [from, from + duration], [scaleFrom, 1], {
          ...clamp,
          easing: premium,
        }),
        transformOrigin: origin,
      }}
    />
  );
};

export const IntegraBrandReveal = () => {
  const frame = useCurrentFrame();
  const finalIn = interpolate(frame, [151, 168], [0, 1], {...clamp, easing: smooth});
  const constructionOut = interpolate(frame, [149, 164], [1, 0], {...clamp, easing: smooth});
  const arrowDraw = interpolate(frame, [34, 66], [89, 71], {...clamp, easing: premium});
  const constructionVisibility = interpolate(
    frame,
    [0, 66, 76, 94, 104, 149, 164],
    [1, 1, 0, 0, 1, 1, 0],
    {...clamp, easing: smooth},
  );
  return (
    <AbsoluteFill style={{backgroundColor: '#F1EFEB', overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          opacity: interpolate(frame, [0, 24, 180, 205], [0, 1, 1, 0], clamp),
          background: 'radial-gradient(circle at 24% 52%, rgba(100,139,58,.08), transparent 28%), radial-gradient(circle at 74% 48%, rgba(14,46,73,.055), transparent 34%)',
        }}
      />

      <AbsoluteFill style={{opacity: constructionOut * constructionVisibility}}>
        <LogoSlice clip="inset(53.5% 82.2% 40.2% 13.8%)" from={10} duration={18} y={76} origin="17% 59%" />
        <LogoSlice clip="inset(50.8% 77.1% 40.2% 18.5%)" from={16} duration={20} y={96} origin="21% 59%" />
        <LogoSlice clip="inset(46.8% 72.2% 40.2% 23.6%)" from={22} duration={22} y={126} origin="26% 59%" />

        <Img
          src={staticFile('seta-integra.svg')}
          style={{
            position: 'absolute', inset: 0, width: 1080, height: 1080,
            clipPath: `inset(39.5% ${arrowDraw}% 47.5% 10.5%)`,
            opacity: interpolate(frame, [32, 42], [0, 1], {...clamp, easing: premium}),
            translate: `${interpolate(frame, [32, 64], [-28, 0], {...clamp, easing: premium})}px 0px`,
          }}
        />

        {[
          ['inset(43.5% 67.5% 46.4% 30.2%)', 101],
          ['inset(43.5% 56.0% 46.4% 34.0%)', 105],
          ['inset(43.5% 47.2% 46.4% 44.0%)', 109],
          ['inset(43.5% 38.8% 46.4% 51.6%)', 113],
          ['inset(43.5% 28.6% 46.4% 59.7%)', 117],
          ['inset(43.5% 18.8% 46.4% 69.3%)', 121],
          ['inset(43.5% 10.2% 46.4% 78.5%)', 125],
        ].map(([clip, from], i) => (
          <LogoSlice key={i} clip={clip as string} from={from as number} duration={17} x={18} y={0} />
        ))}
        <LogoSlice clip="inset(55.0% 9.5% 40.5% 30.0%)" from={132} duration={20} y={24} />
      </AbsoluteFill>

      {[
        [256, 526, 68, '#F37C2B'], [302, 493, 72, '#F37C2B'],
        [354, 455, 76, '#648B3A'], [418, 420, 80, '#F37C2B'],
        [492, 392, 84, '#0E2E49'], [576, 374, 88, '#F37C2B'],
        [670, 365, 92, '#0E2E49'], [772, 365, 96, '#648B3A'],
      ].map(([left, top, start, color], index) => (
        <div key={index} style={{
          position: 'absolute', left, top, width: index % 3 === 0 ? 14 : 10, height: index % 3 === 0 ? 14 : 10,
          backgroundColor: color as string,
          opacity: interpolate(frame, [start as number, (start as number) + 3, (start as number) + 10, (start as number) + 16], [0, 1, 1, 0], clamp),
          scale: interpolate(frame, [start as number, (start as number) + 5], [0.4, 1], {...clamp, easing: premium}),
          boxShadow: `0 0 0 2px ${color}22`,
        }} />
      ))}

      <Img
        src={staticFile('logo-integra-profissional.svg')}
        style={{
          position: 'absolute', inset: 0, width: 1080, height: 1080,
          opacity: finalIn,
          scale: interpolate(frame, [151, 171], [0.985, 1], {...clamp, easing: premium}),
          filter: 'drop-shadow(0 8px 14px rgba(14,46,73,.07))',
        }}
      />
      <Sequence from={10}><Audio src={staticFile('audio/8bit/bar-low.wav')} volume={0.82} /></Sequence>
      <Sequence from={16}><Audio src={staticFile('audio/8bit/bar-mid.wav')} volume={0.76} /></Sequence>
      <Sequence from={22}><Audio src={staticFile('audio/8bit/bar-high.wav')} volume={0.70} /></Sequence>
      <Sequence from={33}><Audio src={staticFile('audio/8bit/arrow-powerup.wav')} volume={0.74} /></Sequence>
      <Sequence from={76}><Audio src={staticFile('audio/8bit/pixel-glitch.wav')} volume={0.62} /></Sequence>
      {[101, 109, 117, 125, 133].map((start) => <Sequence key={start} from={start}><Audio src={staticFile('audio/8bit/letter-tick.wav')} volume={0.42} /></Sequence>)}
      <Sequence from={151}><Audio src={staticFile('audio/8bit/resolve-chord.wav')} volume={0.68} /></Sequence>
      <Sequence from={154}><Audio src={staticFile('audio/8bit/bass-confirm.wav')} volume={0.48} /></Sequence>
    </AbsoluteFill>
  );
};
