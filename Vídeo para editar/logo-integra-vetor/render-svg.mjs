import sharp from "sharp";

const [, , input, output, widthArg, heightArg] = process.argv;

if (!input || !output) {
  throw new Error("Uso: node render-svg.mjs entrada.svg saida.png");
}

const width = Number(widthArg || 1080);
const height = Number(heightArg || width);

await sharp(input, {density: 96})
  .resize(width, height, {fit: "fill"})
  .png()
  .toFile(output);
