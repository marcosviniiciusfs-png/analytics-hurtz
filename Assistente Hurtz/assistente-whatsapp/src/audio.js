import { GoogleGenAI } from "@google/genai";
import { spawn } from "node:child_process";
import { env } from "./config.js";

function client() {
  if (!env.geminiKey) throw new Error("GEMINI_API_KEY não configurada");
  return new GoogleGenAI({ apiKey: env.geminiKey });
}

export async function transcribeAudio(base64, mimeType = "audio/ogg") {
  const response = await client().models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcreva fielmente este áudio em português do Brasil. Retorne somente a transcrição.",
          },
          {
            inlineData: {
              mimeType,
              data: base64.replace(/^data:[^;]+;base64,/, ""),
            },
          },
        ],
      },
    ],
    config: { temperature: 0 },
  });
  return String(response.text || "").trim();
}

export async function synthesizeSpeech(text) {
  const response = await client().models.generateContent({
    model: env.ttsModel,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Fale em português do Brasil, com tom calmo, prestativo e natural de uma conversa por WhatsApp. Evite voz de locutor e leia somente esta mensagem:\n\n${text}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: env.ttsVoice } },
      },
    },
  });
  const parts = response.candidates?.[0]?.content?.parts || [];
  const audio = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!audio) throw new Error("Google AI Studio não retornou áudio");
  return { base64: audio.data, mimeType: audio.mimeType || "audio/wav" };
}

function ffmpeg(args, input) {
  return new Promise((resolve, reject) => {
    const process = spawn(env.ffmpegPath, args, { windowsHide: true });
    const output = [];
    let error = "";
    process.stdout.on("data", (chunk) => output.push(chunk));
    process.stderr.on("data", (chunk) => {
      error += chunk;
    });
    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(output));
      else
        reject(
          new Error(`Falha ao converter áudio (${code}): ${error.slice(-500)}`),
        );
    });
    process.stdin.end(input);
  });
}

export function oggOpusDurationSeconds(buffer) {
  const signature = Buffer.from("OggS");
  const opusHead = buffer.indexOf("OpusHead");
  const preSkip =
    opusHead >= 0 && opusHead + 12 <= buffer.length
      ? buffer.readUInt16LE(opusHead + 10)
      : 0;
  let offset = 0;
  let finalGranule = 0n;
  while ((offset = buffer.indexOf(signature, offset)) >= 0) {
    if (offset + 14 > buffer.length) break;
    const granule = buffer.readBigUInt64LE(offset + 6);
    if (granule !== 0xffffffffffffffffn && granule > finalGranule)
      finalGranule = granule;
    offset += 4;
  }
  if (!finalGranule) return 0;
  return Math.max(0, (Number(finalGranule) - preSkip) / 48000);
}

export async function toWhatsAppVoice(audio) {
  const source = Buffer.from(audio.base64, "base64");
  const mime = String(audio.mimeType || "").toLowerCase();
  const inputArgs =
    mime.includes("l16") || mime.includes("pcm")
      ? ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0"]
      : ["-i", "pipe:0"];
  const converted = await ffmpeg(
    [
      "-hide_banner",
      "-loglevel",
      "error",
      ...inputArgs,
      "-vn",
      "-c:a",
      "libopus",
      "-b:a",
      "32k",
      "-vbr",
      "on",
      "-application",
      "voip",
      "-f",
      "ogg",
      "pipe:1",
    ],
    source,
  );
  return {
    base64: converted.toString("base64"),
    mimeType: "audio/ogg; codecs=opus",
    durationSeconds: oggOpusDurationSeconds(converted),
  };
}
