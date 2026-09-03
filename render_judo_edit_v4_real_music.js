const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('C:/tmp/cbo-ffmpeg/node_modules/ffmpeg-static');

function findVideoPath() {
  const cwd = process.cwd();
  const videoDir = fs.readdirSync(cwd, { withFileTypes: true })
    .find((d) => d.isDirectory() && d.name.toLowerCase().includes('deo') && d.name.toLowerCase().includes('editar'));
  if (!videoDir) throw new Error('Pasta do video nao encontrada');
  const videoFile = fs.readdirSync(path.join(cwd, videoDir.name), { withFileTypes: true })
    .find((f) => f.isFile() && f.name.toLowerCase().endsWith('.mp4') && !f.name.toLowerCase().startsWith('judo_edit_'));
  if (!videoFile) throw new Error('Arquivo mp4 original nao encontrado');
  return {
    input: path.join(cwd, videoDir.name, videoFile.name),
    outDir: path.join(cwd, videoDir.name),
  };
}

const { input, outDir } = findVideoPath();
const music = 'C:/tmp/cbo-ffmpeg/epic_track.mp3';
const output = path.join(outDir, 'judo_edit_epico_v4_musica_real.mp4');
const w = 1440;
const h = 2560;
const transition = 0.12;

const clips = [
  { s: 12.0, e: 13.1, speed: 1.0 },
  { s: 18.8, e: 22.2, speed: 1.38 },
  { s: 23.0, e: 25.1, speed: 1.08 },
  { s: 25.1, e: 27.7, speed: 0.78 },
  { s: 27.7, e: 29.0, speed: 1.35 },
  { s: 49.0, e: 53.8, speed: 1.7 },
  { s: 57.0, e: 59.2, speed: 1.18 },
  { s: 59.2, e: 63.0, speed: 1.0 },
  { s: 63.0, e: 66.0, speed: 1.9 },
  { s: 74.0, e: 75.5, speed: 1.9 },
];

const videoParts = clips.map((clip, i) => [
  `[0:v]trim=start=${clip.s}:end=${clip.e},setpts=(PTS-STARTPTS)/${clip.speed}`,
  'fps=30',
  `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
  'setsar=1',
  'eq=contrast=1.08:saturation=1.08:brightness=0.004',
  'unsharp=5:5:0.32:3:3:0.12',
].join(',') + `[v${i}]`);

const durations = clips.map((clip) => (clip.e - clip.s) / clip.speed);
const offsets = [];
let chainDuration = durations[0];
for (let i = 1; i < durations.length; i += 1) {
  offsets.push(Number((chainDuration - transition).toFixed(3)));
  chainDuration = chainDuration + durations[i] - transition;
}
const finalDuration = Number(chainDuration.toFixed(2));

const transitions = ['fadeblack', 'fade', 'fade', 'fade', 'fade', 'fade', 'fade', 'fade', 'fadeblack'];
const xfadeParts = [];
for (let i = 1; i < clips.length; i += 1) {
  const left = i === 1 ? 'v0' : `vx${i - 1}`;
  const right = `v${i}`;
  const out = i === clips.length - 1 ? 'vxfinal' : `vx${i}`;
  xfadeParts.push(`[${left}][${right}]xfade=transition=${transitions[i - 1]}:duration=${transition}:offset=${offsets[i - 1]}[${out}]`);
}

// Use the real music only. No original gym audio, no synthetic beat bed.
const musicStart = 0;
const audioFilter = [
  `[1:a]atrim=start=${musicStart}:duration=${finalDuration},asetpts=PTS-STARTPTS`,
  'volume=1.0',
  'afade=t=in:st=0:d=0.12',
  `afade=t=out:st=${Math.max(0, finalDuration - 0.45).toFixed(2)}:d=0.45`,
  'alimiter=limit=0.95',
].join(',') + '[aout]';

const filter = [
  ...videoParts,
  ...xfadeParts,
  `[vxfinal]fade=t=in:st=0:d=0.06,fade=t=out:st=${Math.max(0, finalDuration - 0.28).toFixed(2)}:d=0.28,format=yuv420p[vout]`,
  audioFilter,
].join(';');

const args = [
  '-y',
  '-hide_banner',
  '-i', input,
  '-i', music,
  '-filter_complex', filter,
  '-map', '[vout]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '17',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '256k',
  '-movflags', '+faststart',
  output,
];

console.log(`Input: ${input}`);
console.log(`Music: ${music}`);
console.log(`Output: ${output}`);
console.log(`Expected duration: ${finalDuration}s`);
const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
