const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('C:/tmp/cbo-ffmpeg/node_modules/ffmpeg-static');

const cwd = process.cwd();
const videoDir = fs.readdirSync(cwd, { withFileTypes: true })
  .find((d) => d.isDirectory() && d.name.toLowerCase().includes('deo') && d.name.toLowerCase().includes('editar'));
if (!videoDir) throw new Error('Pasta do video nao encontrada');

const dir = path.join(cwd, videoDir.name);
const input = path.join(dir, 'judo_edit_epico_v2.mp4');
const output = path.join(dir, 'judo_edit_epico_v2_upscaled.mp4');
if (!fs.existsSync(input)) throw new Error('Edit V2 nao encontrado');

const args = [
  '-y',
  '-hide_banner',
  '-i', input,
  '-vf', 'scale=1440:2560:flags=lanczos,unsharp=5:5:0.42:3:3:0.16,eq=contrast=1.035:saturation=1.06',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '17',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'copy',
  '-movflags', '+faststart',
  output,
];

console.log(`Input: ${input}`);
console.log(`Output: ${output}`);
const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
