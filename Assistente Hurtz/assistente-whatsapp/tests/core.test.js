import test from "node:test";
import assert from "node:assert/strict";
import {
  decideFormat,
  matchesTrigger,
  shouldTransfer,
  splitBubbles,
  normalizeOutgoingText,
} from "../src/format.js";
import { parseEvolutionWebhook } from "../src/webhook-parser.js";
import { MessageDebouncer } from "../src/debounce.js";
import { EvolutionClient } from "../src/evolution.js";
import { humanPresence, presenceDurationMs } from "../src/presence.js";
import { env } from "../src/config.js";
import { oggOpusDurationSeconds } from "../src/audio.js";
import { answerWithOllama, systemPrompt } from "../src/brain.js";

const assistant = {
  responseMode: "auto",
  audioReplyToAudio: true,
  humanTransferKeywords: ["atendente", "cancelar"],
};
test("decide formato e transferência", () => {
  assert.equal(decideFormat("Sim, temos.", "text", assistant), "text");
  assert.equal(
    decideFormat(
      "Vou explicar como funciona. Primeiro fazemos o cadastro. Depois validamos os dados. Por fim confirmamos.",
      "text",
      assistant,
    ),
    "audio",
  );
  assert.equal(decideFormat("Claro.", "audio", assistant), "audio");
  assert.equal(shouldTransfer("Quero falar com um atendente", assistant), true);
});
test("quebra balões sem perder texto", () => {
  const parts = splitBubbles(
    "Primeira frase. Segunda frase que é maior. Terceira frase.",
    25,
  );
  assert.ok(parts.length >= 2);
  assert.equal(
    parts.join(" "),
    "Primeira frase. Segunda frase que é maior. Terceira frase.",
  );
});

test("limita balões a 200 caracteres e remove todos os traçados", () => {
  const source =
    "Boa! Vou explicar o follow-up — sem complicação. " +
    "Este é um texto longo com várias informações importantes para o lead entender o processo com naturalidade e clareza. ".repeat(
      5,
    );
  const normalized = normalizeOutgoingText(source);
  const parts = splitBubbles(source, 500);
  assert.equal(/[-‐‑‒–—―]/.test(normalized), false);
  assert.ok(parts.length > 1);
  assert.equal(
    parts.every((part) => part.length <= 200),
    true,
  );
  assert.equal(
    parts.some((part) => /[-‐‑‒–—―]/.test(part)),
    false,
  );
});
test("interpreta webhook Evolution", () => {
  const got = parseEvolutionWebhook({
    event: "messages.upsert",
    data: {
      key: {
        remoteJid: "5511999999999@s.whatsapp.net",
        fromMe: false,
        id: "ABC",
      },
      pushName: "Ana",
      message: { conversation: "Oi" },
    },
  });
  assert.equal(got.contact, "5511999999999");
  assert.equal(got.text, "Oi");
  assert.equal(got.externalId, "ABC");
  assert.equal(got.isGroup, false);
});
test("gatilho ignora acentos e respeita correspondência", () => {
  assert.equal(
    matchesTrigger("Quero começar agora", {
      triggerKeywords: ["comecar"],
      triggerMatchMode: "contains",
    }),
    true,
  );
  assert.equal(
    matchesTrigger("Quero começar agora", {
      triggerKeywords: ["começar"],
      triggerMatchMode: "exact",
    }),
    false,
  );
  assert.equal(
    matchesTrigger(" COMEÇAR ", {
      triggerKeywords: ["comecar"],
      triggerMatchMode: "exact",
    }),
    true,
  );
});
test("debounce agrupa mensagens", async () => {
  let received;
  const d = new MessageDebouncer(20, async (c, items) => {
    received = { c, items };
  });
  d.push("1", { text: "oi" });
  d.push("1", { text: "tudo bem" });
  await new Promise((r) => setTimeout(r, 45));
  assert.equal(received.c, "1");
  assert.equal(received.items.length, 2);
});

test("configura webhook no contrato exigido pela Evolution atual", async () => {
  let request;
  const client = new EvolutionClient(async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({ webhook: { enabled: true } }), {
      status: 200,
    });
  }, "hurtz-teste-contrato");
  await client.configureWebhook();
  assert.equal(request.webhook.enabled, true);
  assert.equal(request.webhook.webhookBase64, true);
  assert.ok(request.webhook.events.includes("MESSAGES_UPSERT"));
});

test("presença é enviada uma única vez com duração contínua", async () => {
  const original = {
    initialReadMinMs: env.initialReadMinMs,
    initialReadMaxMs: env.initialReadMaxMs,
    minPresenceMs: env.minPresenceMs,
    maxPresenceMs: env.maxPresenceMs,
  };
  Object.assign(env, {
    initialReadMinMs: 0,
    initialReadMaxMs: 0,
    minPresenceMs: 700,
    maxPresenceMs: 750,
  });
  const states = [];
  try {
    assert.ok(presenceDurationMs("Oi", "text") >= 700);
    await humanPresence(
      {
        setChatPresence: async (_contact, state, duration) =>
          states.push({ state, duration }),
      },
      "550000000000",
      "Oi",
      "text",
    );
    assert.equal(states.length, 2);
    assert.equal(states[0].state, "composing");
    assert.ok(states[0].duration >= 700);
    assert.deepEqual(states[1], { state: "paused", duration: 0 });
  } finally {
    Object.assign(env, original);
  }
});

test("Evolution recebe presença com duração positiva", async () => {
  let request;
  const client = new EvolutionClient(async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response("{}", { status: 200 });
  }, "hurtz-presenca-isolada");
  await client.setChatPresence("550000000000", "composing", 47000);
  assert.equal(request.presence, "composing");
  assert.equal(request.delay, 47000);
});

test("presença de áudio acompanha a duração real sem corte máximo", () => {
  assert.equal(presenceDurationMs("áudio longo", "audio", 47.2), 47200);
});

test("mede duração pelo granule final do Ogg Opus", () => {
  const ogg = Buffer.alloc(32);
  ogg.write("OggS", 0, "ascii");
  ogg.writeBigUInt64LE(96000n, 6);
  assert.equal(oggOpusDurationSeconds(ogg), 2);
});

test("prompt aplica intensidade contextual de gírias", () => {
  const base = {
    assistantName: "Hurtz",
    businessName: "Hurtz",
    persona: "Natural",
  };
  const formal = systemPrompt({ ...base, slangIntensity: 0 }, []);
  const natural = systemPrompt({ ...base, slangIntensity: 50 }, []);
  const informal = systemPrompt({ ...base, slangIntensity: 90 }, []);
  assert.match(formal, /Não use gírias/);
  assert.match(natural, /frequência moderada/);
  assert.match(informal, /frequência alta/);
  assert.match(informal, /sem repetir bordões/);
});

test("prompt inclui resumo, perfil e próximo passo consolidados", () => {
  const prompt = systemPrompt(
    {
      assistantName: "Hurtz",
      businessName: "Hurtz",
      persona: "Natural",
      slangIntensity: 20,
    },
    [],
    { rules: [], memories: [] },
    {
      summary: "Lead quer uma demonstração.",
      profile: { name: "Marina", company: "Acme" },
      nextSteps: ["Agendar demonstração"],
    },
  );
  assert.match(prompt, /Lead quer uma demonstração/);
  assert.match(prompt, /Marina/);
  assert.match(prompt, /Agendar demonstração/);
});

test("Ollama é cancelado ao ultrapassar o timeout", async () => {
  const waitingFetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () =>
        reject(options.signal.reason),
      );
    });
  await assert.rejects(
    answerWithOllama(
      "Oi",
      [],
      {
        assistantName: "Hurtz",
        businessName: "Hurtz",
        persona: "Natural",
        slangIntensity: 20,
        unknownAnswer: "Não sei",
      },
      undefined,
      { fetchImpl: waitingFetch, timeoutMs: 15 },
    ),
    (error) => error.name === "TimeoutError",
  );
});
