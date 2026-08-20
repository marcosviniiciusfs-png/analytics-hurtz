import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function loadEnvFile() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const split = line.indexOf("=");
    if (split < 1) continue;
    const key = line.slice(0, split).trim();
    const value = line
      .slice(split + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const number = (name, fallback) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: number("PORT", 3338),
  evolutionUrl: (process.env.EVOLUTION_API_URL || "").replace(/\/+$/, ""),
  evolutionKey: process.env.EVOLUTION_API_KEY || "",
  evolutionInstance: process.env.EVOLUTION_INSTANCE || "",
  webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET || "",
  publicWebhookUrl: process.env.PUBLIC_WEBHOOK_URL || "",
  ollamaUrl: (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(
    /\/+$/,
    "",
  ),
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.2:3b",
  geminiKey: process.env.GEMINI_API_KEY || "",
  ttsModel: process.env.TTS_MODEL || "gemini-3.1-flash-tts-preview",
  ttsVoice: process.env.TTS_VOICE_NAME || "Kore",
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  debounceMs: number("DEBOUNCE_MS", 1500),
  initialReadMinMs: number("INITIAL_READ_MIN_MS", 0),
  initialReadMaxMs: number("INITIAL_READ_MAX_MS", 0),
  charsPerSecond: number("TEXT_CHARS_PER_SECOND", 55),
  minPresenceMs: number("MIN_PRESENCE_MS", 1800),
  maxPresenceMs: number("MAX_PRESENCE_MS", 60000),
  presenceLeaseMs: number("PRESENCE_LEASE_MS", 60000),
  bubblePauseMinMs: number("BUBBLE_PAUSE_MIN_MS", 550),
  bubblePauseMaxMs: number("BUBBLE_PAUSE_MAX_MS", 1200),
  ollamaTimeoutMs: number("OLLAMA_TIMEOUT_MS", 20000),
  maxAudioSeconds: number("MAX_AUDIO_SECONDS", 60),
  adminToken: process.env.HURTZ_ADMIN_TOKEN || "",
  cloudflareSyncUrl: (process.env.CLOUDFLARE_SYNC_URL || "").replace(
    /\/+$/,
    "",
  ),
  cloudflareSyncToken: process.env.CLOUDFLARE_SYNC_TOKEN || "",
  disableCloudSync: process.env.HURTZ_DISABLE_CLOUD_SYNC === "1",
  databasePath:
    process.env.HURTZ_DB_PATH ||
    path.join(rootDir, "data", "hurtz-whatsapp.sqlite"),
};

export const assistantPath = path.join(rootDir, "config", "assistant.json");

export function loadAssistant() {
  return JSON.parse(fs.readFileSync(assistantPath, "utf8"));
}

export function saveAssistant(value) {
  const current = loadAssistant();
  const slangIntensity = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(Number(value.slangIntensity))
        ? Math.round(Number(value.slangIntensity))
        : Number(current.slangIntensity || 0),
    ),
  );
  const safe = {
    ...current,
    ...value,
    humanTransferKeywords: Array.isArray(value.humanTransferKeywords)
      ? value.humanTransferKeywords.map(String).filter(Boolean)
      : current.humanTransferKeywords,
    triggerKeywords: Array.isArray(value.triggerKeywords)
      ? value.triggerKeywords
          .map(String)
          .map((x) => x.trim())
          .filter(Boolean)
      : current.triggerKeywords || [],
    triggerMatchMode: value.triggerMatchMode === "exact" ? "exact" : "contains",
    slangIntensity,
  };
  fs.writeFileSync(assistantPath, JSON.stringify(safe, null, 2) + "\n", "utf8");
  return safe;
}
