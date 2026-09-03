import { env } from "./config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (value) => Math.round(value * (0.82 + Math.random() * 0.36));

export async function startLivePresence(
  evolution,
  contact,
  state = "composing",
) {
  await evolution
    .setChatPresence(contact, state, env.presenceLeaseMs)
    .catch(() => {});
}

export async function stopLivePresence(evolution, contact) {
  await evolution.setChatPresence(contact, "paused", 0).catch(() => {});
}

export async function pauseBetweenBubbles() {
  const range = Math.max(0, env.bubblePauseMaxMs - env.bubblePauseMinMs);
  await sleep(env.bubblePauseMinMs + Math.random() * range);
}

export function presenceDurationMs(content, format, durationSeconds = 0) {
  if (format === "audio" && durationSeconds > 0)
    return Math.max(env.minPresenceMs, Math.ceil(durationSeconds * 1000));
  const calculated = Math.max(
    1500,
    (String(content).length / env.charsPerSecond) * 1000,
  );
  const ceiling = Math.max(env.minPresenceMs, env.maxPresenceMs);
  return Math.max(env.minPresenceMs, Math.min(ceiling, jitter(calculated)));
}

export async function humanPresence(
  evolution,
  contact,
  content,
  format,
  durationSeconds = 0,
  options = {},
) {
  if (!options.skipInitialDelay)
    await sleep(
      jitter(
        env.initialReadMinMs +
          Math.random() * (env.initialReadMaxMs - env.initialReadMinMs),
      ),
    );
  const state = format === "audio" ? "recording" : "composing";
  const duration = presenceDurationMs(content, format, durationSeconds);
  // A margem mantém a presença ativa até o instante em que o balão é enviado.
  await evolution
    .setChatPresence(contact, state, duration + 1500)
    .catch(() => {});
  await sleep(duration);
  if (options.pauseAfter !== false)
    await evolution.setChatPresence(contact, "paused", 0).catch(() => {});
}
