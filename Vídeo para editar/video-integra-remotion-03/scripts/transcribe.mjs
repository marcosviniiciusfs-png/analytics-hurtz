import fs from "node:fs";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";

const whisperPath = path.resolve(
  process.cwd(),
  "..",
  "video-integra-remotion",
  "whisper.cpp",
);
const whisperCppVersion = "1.5.5";
const model = "small";

await installWhisperCpp({
  to: whisperPath,
  version: whisperCppVersion,
  printOutput: true,
});

await downloadWhisperModel({
  model,
  folder: whisperPath,
  printOutput: true,
});

const whisperCppOutput = await transcribe({
  model,
  whisperPath,
  whisperCppVersion,
  inputPath: path.join(process.cwd(), "public", "audio.wav"),
  tokenLevelTimestamps: true,
  language: "pt",
  splitOnWord: true,
  printOutput: true,
});

const {captions} = toCaptions({whisperCppOutput});
fs.writeFileSync(
  path.join(process.cwd(), "public", "captions.json"),
  JSON.stringify(captions, null, 2),
);
fs.writeFileSync(
  path.join(process.cwd(), "public", "transcription-raw.json"),
  JSON.stringify(whisperCppOutput, null, 2),
);

console.log(`Generated ${captions.length} caption tokens.`);
