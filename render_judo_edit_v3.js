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
const output = path.join(outDir, 'judo_edit_epico_v3_sem_audio_original.mp4');
const w = 1080;
const h = 1920;
const transition = 0.14;

const clips = [
  { s: 12.0, e: 13.1, speed: 1.0, tone: 'context' },
  { s: 18.8, e: 22.2, speed: 1.38, tone: 'tension' },
  { s: 23.0, e: 25.1, speed: 1.08, tone: 'build' },
  { s: 25.1, e: 27.7, speed: 0.78, tone: 'impact1' },
  { s: 27.7, e: 29.0, speed: 1.35, tone: 'recover' },
  { s: 49.0, e: 53.8, speed: 1.7, tone: 'ground' },
  { s: 57.0, e: 59.2, speed: 1.18, tone: 'build' },
  { s: 59.2, e: 63.0, speed: 1.0, tone: 'impact2' },
  { s: 63.0, e: 66.0, speed: 1.9, tone: 'recover' },
  { s: 74.0, e: 75.5, speed: 1.9, tone: 'close' },
];

function videoFilter(i, clip) {
  const impact = clip.tone === 'impact1' || clip.tone === 'impact2';
  const base = [
    `[0:v]trim=start=${clip.s}:end=${clip.e},setpts=(PTS-STARTPTS)/${clip.speed}`,
    `fps=30,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    'setsar=1',
    impact
      ? 'eq=contrast=1.22:saturation=1.18:brightness=0.02'
      : 'eq=contrast=1.1:saturation=1.08:brightness=0.005',
    impact ? 'unsharp=7:7:0.72:3:3:0.28' : 'unsharp=5:5:0.45:3:3:0.16',
  ].join(',');

  if (!impact) return `${base}[v${i}]`;

  // Clean golden-white pulse instead of the old purple wash.
  return [
    `${base},split=2[v${i}b][v${i}g0]`,
    `[v${i}g0]boxblur=16:2,colorbalance=rs=0.08:gs=0.04:bs=-0.05,eq=brightness=0.07:saturation=1.35[v${i}g]`,
    `[v${i}b][v${i}g]blend=all_mode=screen:all_opacity=0.18,scale=1124:1998,crop=${w}:${h}[v${i}]`,
  ].join(';');
}

const videoParts = clips.map((clip, i) => videoFilter(i, clip));
const durations = clips.map((clip) => (clip.e - clip.s) / clip.speed);
const offsets = [];
let chainDuration = durations[0];
for (let i = 1; i < durations.length; i += 1) {
  offsets.push(Number((chainDuration - transition).toFixed(3)));
  chainDuration = chainDuration + durations[i] - transition;
}
const finalDuration = Number(chainDuration.toFixed(2));

const transitions = ['fadeblack', 'fade', 'zoomin', 'fade', 'fade', 'fade', 'zoomin', 'fade', 'fadeblack'];
const xfadeParts = [];
for (let i = 1; i < clips.length; i += 1) {
  const left = i === 1 ? 'v0' : `vx${i - 1}`;
  const right = `v${i}`;
  const out = i === clips.length - 1 ? 'vxfinal' : `vx${i}`;
  xfadeParts.push(`[${left}][${right}]xfade=transition=${transitions[i - 1]}:duration=${transition}:offset=${offsets[i - 1]}[${out}]`);
}

function delayedSine(name, freq, dur, delayMs, volume, fadeOut = 0.22) {
  return `sine=frequency=${freq}:duration=${dur}:sample_rate=48000,volume=${volume},afade=t=out:st=${Math.max(0.01, dur - fadeOut).toFixed(2)}:d=${fadeOut},adelay=${delayMs}|${delayMs}[${name}]`;
}

function noiseHit(name, dur, delayMs, volume, hp = 350, lp = 2600) {
  return `anoisesrc=color=white:duration=${dur}:sample_rate=48000,highpass=f=${hp},lowpass=f=${lp},volume=${volume},afade=t=out:st=0.02:d=${Math.max(0.03, dur - 0.02).toFixed(2)},adelay=${delayMs}|${delayMs}[${name}]`;
}

const impact1Ms = 5850;
const impact2Ms = 14500;
const beatTimes = [
  0, 720, 1440, 2160, 2880, 3600, 4320, 5040,
  5760, 6480, 7200, 7920, 8640, 9360, 10080, 10800,
  11520, 12240, 12960, 13680, 14400, 15120, 15840, 16560, 17280, 18000, 18720,
];

const beatParts = beatTimes.flatMap((t, i) => {
  const accent = i % 4 === 0 || Math.abs(t - impact1Ms) < 400 || Math.abs(t - impact2Ms) < 400;
  return [
    delayedSine(`kick${i}`, accent ? 52 : 68, accent ? 0.26 : 0.18, t, accent ? 0.75 : 0.38, accent ? 0.23 : 0.14),
    noiseHit(`tick${i}`, 0.055, t + 22, accent ? 0.13 : 0.08, 1800, 5200),
  ];
});

const audioParts = [
  `sine=frequency=43:duration=${finalDuration}:sample_rate=48000,volume=0.12[drone1]`,
  `sine=frequency=65:duration=${finalDuration}:sample_rate=48000,volume=0.08[drone2]`,
  `sine=frequency=98:duration=${finalDuration}:sample_rate=48000,volume=0.035[drone3]`,
  `anoisesrc=color=brown:duration=${finalDuration}:sample_rate=48000,lowpass=f=120,volume=0.11[rumble]`,
  `anoisesrc=color=pink:duration=2.5:sample_rate=48000,highpass=f=450,lowpass=f=3600,volume=0.045,afade=t=in:st=0:d=2.3,adelay=${impact1Ms - 2500}|${impact1Ms - 2500}[riser1]`,
  `anoisesrc=color=pink:duration=2.8:sample_rate=48000,highpass=f=500,lowpass=f=4200,volume=0.05,afade=t=in:st=0:d=2.55,adelay=${impact2Ms - 2800}|${impact2Ms - 2800}[riser2]`,
  delayedSine('boom1', 38, 0.82, impact1Ms, 1.65, 0.76),
  delayedSine('boom2', 34, 0.9, impact2Ms, 1.75, 0.82),
  delayedSine('sub1', 24, 1.15, impact1Ms + 80, 0.9, 1.0),
  delayedSine('sub2', 22, 1.25, impact2Ms + 80, 0.95, 1.1),
  noiseHit('crash1', 0.34, impact1Ms + 40, 0.42, 220, 4200),
  noiseHit('crash2', 0.38, impact2Ms + 40, 0.46, 220, 4300),
  delayedSine('brass1', 118, 0.42, impact1Ms - 280, 0.32, 0.34),
  delayedSine('brass2', 112, 0.46, impact2Ms - 300, 0.34, 0.38),
  ...beatParts,
];

const audioLabels = [
  'drone1', 'drone2', 'drone3', 'rumble', 'riser1', 'riser2',
  'boom1', 'boom2', 'sub1', 'sub2', 'crash1', 'crash2', 'brass1', 'brass2',
  ...beatTimes.flatMap((_, i) => [`kick${i}`, `tick${i}`]),
].map((label) => `[${label}]`).join('');

const filter = [
  ...videoParts,
  ...xfadeParts,
  `[vxfinal]fade=t=in:st=0:d=0.08,fade=t=out:st=${Math.max(0, finalDuration - 0.35).toFixed(2)}:d=0.35,format=yuv420p[vout]`,
  ...audioParts,
  `${audioLabels}amix=inputs=${14 + beatTimes.length * 2}:duration=longest:normalize=0,atrim=0:${finalDuration},afade=t=in:st=0:d=0.15,afade=t=out:st=${Math.max(0, finalDuration - 0.45).toFixed(2)}:d=0.45,alimiter=limit=0.93,pan=stereo|c0=c0|c1=c0[aout]`,
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
  '-b:a', '256k',
  '-movflags', '+faststart',
  output,
];

console.log(`Input: ${input}`);
console.log(`Output: ${output}`);
console.log(`Expected duration: ${finalDuration}s`);
const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
