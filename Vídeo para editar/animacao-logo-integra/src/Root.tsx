import {Composition} from 'remotion';
import {IntegraBrandReveal} from './IntegraBrandReveal';

export const RemotionRoot = () => (
  <Composition
    id="IntegraBrandReveal"
    component={IntegraBrandReveal}
    durationInFrames={210}
    fps={30}
    width={1080}
    height={1080}
  />
);
