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
const output = path.join(outDir, 'judo_edit_epico_v2.mp4');
const w = 1080;
const h = 1920;
const transition = 0.18;

const clips = [
  { s: 12.0, e: 13.2, speed: 1.0, tone: 'context' },
  { s: 19.2, e: 22.4, speed: 1.4, tone: 'tension' },
  { s: 23.0, e: 25.1, speed: 1.1, tone: 'build' },
  { s: 25.1, e: 27.4, speed: 0.75, tone: 'impact' },
  { s: 27.4, e: 29.0, speed: 1.2, tone: 'impact' },
  { s: 50.0, e: 53.8, speed: 1.3, tone: 'ground' },
  { s: 57.0, e: 59.0, speed: 1.2, tone: 'build' },
  { s: 59.0, e: 62.8, speed: 0.9, tone: 'impact' },
  { s: 62.8, e: 66.0, speed: 1.8, tone: 'impact' },
  { s: 74.0, e: 76.0, speed: 1.7, tone: 'close' },
];

function videoFilter(i, clip) {
  const strong = clip.tone === 'impact';
  const base = [
    `[0:v]trim=start=${clip.s}:end=${clip.e},setpts=(PTS-STARTPTS)/${clip.speed}`,
    `fps=30,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    'setsar=1',
    strong
      ? 'eq=contrast=1.25:saturation=1.38:brightness=0.025'
      : 'eq=contrast=1.14:saturation=1.2:brightness=0.012',
    strong ? 'unsharp=7:7:0.78:3:3:0.3' : 'unsharp=5:5:0.58:3:3:0.22',
  ].join(',');

  if (!strong) return `${base}[v${i}]`;
  return [
    `${base},split=2[v${i}b][v${i}g0]`,
    `[v${i}g0]boxblur=22:2,eq=brightness=0.1:saturation=2.1[v${i}g]`,
    `[v${i}b][v${i}g]blend=all_mode=screen:all_opacity=0.25,scale=1132:2014,crop=${w}:${h}[v${i}]`,
  ].join(';');
}

function atempoChain(speed) {
  if (speed <= 2) return `atempo=${speed}`;
  const parts = [];
  let remaining = speed;
  while (remaining > 2) {
    parts.push('atempo=2');
    remaining /= 2;
  }
  parts.push(`atempo=${remaining}`);
  return parts.join(',');
}

const videoParts = clips.map((clip, i) => videoFilter(i, clip));
const audioParts = clips.map((clip, i) =>
  `[0:a]atrim=start=${clip.s}:end=${clip.e},asetpts=PTS-STARTPTS,${atempoChain(clip.speed)},volume=${clip.tone === 'impact' ? 1.05 : 0.84}[a${i}]`
);

const durations = clips.map((clip) => (clip.e - clip.s) / clip.speed);
const offsets = [];
let chainDuration = durations[0];
for (let i = 1; i < durations.length; i += 1) {
  offsets.push(Number((chainDuration - transition).toFixed(3)));
  chainDuration = chainDuration + durations[i] - transition;
}
const finalDuration = Number(chainDuration.toFixed(2));

const transitions = ['fadeblack', 'fade', 'zoomin', 'fade', 'fade', 'fade', 'zoomin', 'fade', 'fadeblack'];
let xfadeParts = [];
for (let i = 1; i < clips.length; i += 1) {
  const left = i === 1 ? 'v0' : `vx${i - 1}`;
  const right = `v${i}`;
  const out = i === clips.length - 1 ? 'vxfinal' : `vx${i}`;
  xfadeParts.push(`[${left}][${right}]xfade=transition=${transitions[i - 1]}:duration=${transition}:offset=${offsets[i - 1]}[${out}]`);
}

const impact1Ms = 6100;
const impact2Ms = 14450;
const audioConcat = `${clips.map((_, i) => `[a${i}]`).join('')}concat=n=${clips.length}:v=0:a=1,volume=0.82[abase]`;
const audioBed = [
  `anoisesrc=color=brown:duration=${finalDuration}:sample_rate=48000,lowpass=f=96,volume=0.15[rumble]`,
  `sine=frequency=49:duration=0.5:sample_rate=48000,volume=1.45,afade=t=out:st=0.04:d=0.46,adelay=${impact1Ms}|${impact1Ms}[hit1]`,
  `sine=frequency=43:duration=0.55:sample_rate=48000,volume=1.5,afade=t=out:st=0.05:d=0.5,adelay=${impact2Ms}|${impact2Ms}[hit2]`,
  `sine=frequency=130:duration=0.16:sample_rate=48000,volume=0.46,adelay=${impact1Ms + 80}|${impact1Ms + 80}[snap1]`,
  `sine=frequency=120:duration=0.16:sample_rate=48000,volume=0.5,adelay=${impact2Ms + 80}|${impact2Ms + 80}[snap2]`,
  `[abase][rumble][hit1][hit2][snap1][snap2]amix=inputs=6:duration=first:normalize=0,alimiter=limit=0.95[aout]`,
];

const filter = [
  ...videoParts,
  ...audioParts,
  ...xfadeParts,
  `[vxfinal]fade=t=in:st=0:d=0.08,fade=t=out:st=${Math.max(0, finalDuration - 0.35).toFixed(2)}:d=0.35,format=yuv420p[vout]`,
  audioConcat,
  ...audioBed,
].join(';');

const args = [
  '-y',
  '-hide_banner',
  '-i', input,
  '-filter_complex', filter,
  '-map', '[vout]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '17',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-movflags', '+faststart',
  output,
];

console.log(`Input: ${input}`);
console.log(`Output: ${output}`);
console.log(`Expected duration: ${finalDuration}s`);

const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
