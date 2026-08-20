import { env } from "./config.js";
import { MessageDebouncer } from "./debounce.js";
import { EvolutionClient } from "./evolution.js";
import { flushSyncQueue } from "./cloudflare.js";
import { Orchestrator } from "./orchestrator.js";
import { createServer } from "./server.js";
import { logEvent } from "./memory.js";

const evolution = new EvolutionClient();
const orchestrator = new Orchestrator(evolution);
const processing = new Map();
const controllers = new Map();
function processSerially(contact, items) {
  controllers.get(contact)?.abort("newer-message");
  const controller = new AbortController();
  controllers.set(contact, controller);
  const previous = processing.get(contact) || Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(() =>
      orchestrator.process(items[0].contact, items, {
        signal: controller.signal,
      }),
    );
  processing.set(contact, current);
  return current.finally(() => {
    if (processing.get(contact) === current) processing.delete(contact);
    if (controllers.get(contact) === controller) controllers.delete(contact);
  });
}
const debouncer = new MessageDebouncer(
  env.debounceMs,
  async (_conversationKey, items) => {
    try {
      await processSerially(_conversationKey, items);
    } catch (error) {
      logEvent("processing_failed", {
        instance: items[0]?.instance || "",
        contact: items[0]?.contact || "",
        message: error.message,
      });
    }
  },
);
const server = createServer({ evolution, debouncer });

const syncTimer = setInterval(() => flushSyncQueue().catch(() => {}), 30000);
syncTimer.unref();
flushSyncQueue().catch(() => {});

server.listen(env.port, "127.0.0.1", () => {
  console.log(`Hurtz WhatsApp em http://127.0.0.1:${env.port}`);
  console.log(
    evolution.configured()
      ? "Evolution API configurada."
      : "Configure a Evolution API no arquivo .env.",
  );
});
