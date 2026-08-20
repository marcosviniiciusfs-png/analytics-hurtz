import {Composition} from 'remotion';
import {MaraizaBotox02} from './Composition';

export const RemotionRoot = () => (
  <Composition
    id="MaraizaBotox02"
    component={MaraizaBotox02}
    durationInFrames={1512}
    fps={30}
    width={1440}
    height={2560}
  />
);
