import fs from "node:fs";
import path from "node:path";
import {toCaptions, transcribe} from "@remotion/install-whisper-cpp";

const projectRoot = process.cwd();
const whisperPath = path.resolve(projectRoot, "..", "video-integra-remotion", "whisper.cpp");
const whisperCppVersion = "1.5.5";

const whisperCppOutput = await transcribe({
  model: "small",
  whisperPath,
  whisperCppVersion,
  inputPath: path.join(projectRoot, "public", "audio.wav"),
  tokenLevelTimestamps: true,
  language: "pt",
  splitOnWord: true,
  printOutput: true,
});

const {captions} = toCaptions({whisperCppOutput});
fs.writeFileSync(path.join(projectRoot, "public", "captions.json"), JSON.stringify(captions, null, 2));
fs.writeFileSync(path.join(projectRoot, "public", "transcription-raw.json"), JSON.stringify(whisperCppOutput, null, 2));
console.log(`Generated ${captions.length} caption tokens.`);
