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
  if (!videoFile) throw new Error('Arquivo mp4 nao encontrado');
  return {
    input: path.join(cwd, videoDir.name, videoFile.name),
    outDir: path.join(cwd, videoDir.name),
  };
}

const { input, outDir } = findVideoPath();
const output = path.join(outDir, 'judo_edit_epico_local.mp4');

const w = 1080;
const h = 1920;
const transition = 0.25;

const clips = [
  { s: 12.0, e: 13.5, speed: 1.0, name: 'context' },
  { s: 19.0, e: 22.2, speed: 1.28, name: 'tension' },
  { s: 23.0, e: 29.0, speed: 1.09, name: 'throw1', glow: true },
  { s: 49.0, e: 53.5, speed: 1.29, name: 'ground' },
  { s: 57.0, e: 66.0, speed: 1.55, name: 'throw2', glow: true },
  { s: 74.0, e: 76.0, speed: 1.67, name: 'close' },
];

function videoFilter(i, clip) {
  const base = [
    `[0:v]trim=start=${clip.s}:end=${clip.e},setpts=(PTS-STARTPTS)/${clip.speed}`,
    `fps=30,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    'setsar=1',
    'eq=contrast=1.16:saturation=1.25:brightness=0.015',
    'unsharp=5:5:0.65:3:3:0.25',
  ].join(',');

  if (!clip.glow) return `${base}[v${i}]`;

  return [
    `${base},split=2[v${i}b][v${i}g0]`,
    `[v${i}g0]boxblur=18:2,eq=brightness=0.08:saturation=1.9[v${i}g]`,
    `[v${i}b][v${i}g]blend=all_mode=screen:all_opacity=0.23,scale=1128:2006,crop=${w}:${h}[v${i}]`,
  ].join(';');
}

function audioFilter(i, clip) {
  return [
    `[0:a]atrim=start=${clip.s}:end=${clip.e},asetpts=PTS-STARTPTS`,
    `atempo=${clip.speed}`,
    `volume=${clip.glow ? 1.08 : 0.92}`,
    `a${i}`,
  ].join('[').replace(`[a${i}`, `[a${i}`);
}

const videoParts = clips.map((clip, i) => videoFilter(i, clip));
const audioParts = clips.map((clip, i) =>
  `[0:a]atrim=start=${clip.s}:end=${clip.e},asetpts=PTS-STARTPTS,atempo=${clip.speed},volume=${clip.glow ? 1.08 : 0.9}[a${i}]`
);

const d = clips.map((clip) => (clip.e - clip.s) / clip.speed);
const offsets = [];
let chainDuration = d[0];
for (let i = 1; i < d.length; i += 1) {
  offsets.push(Number((chainDuration - transition).toFixed(3)));
  chainDuration = chainDuration + d[i] - transition;
}

const xfadeParts = [
  `[v0][v1]xfade=transition=fadeblack:duration=${transition}:offset=${offsets[0]}[vx1]`,
  `[vx1][v2]xfade=transition=zoomin:duration=${transition}:offset=${offsets[1]}[vx2]`,
  `[vx2][v3]xfade=transition=fade:duration=${transition}:offset=${offsets[2]}[vx3]`,
  `[vx3][v4]xfade=transition=zoomin:duration=${transition}:offset=${offsets[3]}[vx4]`,
  `[vx4][v5]xfade=transition=fadeblack:duration=${transition}:offset=${offsets[4]},format=yuv420p[vout]`,
];

const audioConcat = `${clips.map((_, i) => `[a${i}]`).join('')}concat=n=${clips.length}:v=0:a=1,volume=0.85[abase]`;
const finalDuration = Number(chainDuration.toFixed(2));
const impact1Ms = 4550;
const impact2Ms = 13250;

const audioBed = [
  `anoisesrc=color=brown:duration=${finalDuration}:sample_rate=48000,lowpass=f=105,volume=0.13[rumble]`,
  `sine=frequency=54:duration=0.38:sample_rate=48000,volume=1.25,afade=t=out:st=0.05:d=0.33,adelay=${impact1Ms}|${impact1Ms}[hit1]`,
  `sine=frequency=48:duration=0.46:sample_rate=48000,volume=1.35,afade=t=out:st=0.06:d=0.4,adelay=${impact2Ms}|${impact2Ms}[hit2]`,
  `sine=frequency=92:duration=0.18:sample_rate=48000,volume=0.45,adelay=${impact1Ms + 90}|${impact1Ms + 90}[snap1]`,
  `sine=frequency=88:duration=0.18:sample_rate=48000,volume=0.5,adelay=${impact2Ms + 90}|${impact2Ms + 90}[snap2]`,
  `[abase][rumble][hit1][hit2][snap1][snap2]amix=inputs=6:duration=first:normalize=0,alimiter=limit=0.95[aout]`,
];

const filter = [
  ...videoParts,
  ...audioParts,
  ...xfadeParts,
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
  '-crf', '18',
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
