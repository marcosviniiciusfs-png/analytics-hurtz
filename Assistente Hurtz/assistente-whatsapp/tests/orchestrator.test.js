import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assistantPath } from "../src/config.js";
import { Orchestrator } from "../src/orchestrator.js";
import {
  addMessage,
  getContactStatus,
  setContactActivated,
  setContactStatus,
} from "../src/memory.js";

const original = fs.readFileSync(assistantPath, "utf8");
const base = JSON.parse(original);
const enable = (overrides) =>
  fs.writeFileSync(
    assistantPath,
    JSON.stringify(
      { ...base, enabled: true, responseMode: "text", ...overrides },
      null,
      2,
    ),
  );
const restore = () => fs.writeFileSync(assistantPath, original);
const noWait = async () => {};

test.afterEach(restore);

test("fluxo completo de texto usa somente cliente Evolution simulado", async () => {
  enable();
  const calls = [];
  const fakeEvolution = {
    forInstance() {
      return this;
    },
    sendText: async (number, text) =>
      calls.push({ type: "text", number, text }),
    sendAudio: async () => {
      throw new Error("não deveria enviar áudio");
    },
    setChatPresence: async () => {},
  };
  const orchestrator = new Orchestrator(fakeEvolution, {
    answer: async () => "Claro! O atendimento funciona de segunda a sexta.",
    presence: noWait,
  });
  const contact = "550000000001";
  setContactStatus(contact, "bot");
  await orchestrator.process(contact, [
    {
      instance: "hurtz-teste-isolado",
      format: "text",
      text: "Qual é o horário?",
    },
  ]);
  assert.deepEqual(calls, [
    {
      type: "text",
      number: contact,
      text: "Claro! O atendimento funciona de segunda a sexta.",
    },
  ]);
});

test("mensagem atual não é duplicada dentro do histórico enviado à IA", async () => {
  enable();
  const contact = "550000000009";
  const memoryContact = `hurtz-contexto:${contact}`;
  setContactStatus(memoryContact, "bot");
  addMessage(memoryContact, "user", "Mensagem anterior");
  addMessage(memoryContact, "assistant", "Resposta anterior");
  let receivedHistory = [];
  const orchestrator = new Orchestrator(
    {
      forInstance() {
        return this;
      },
      sendText: async () => {},
      setChatPresence: async () => {},
    },
    {
      answer: async (_input, history) => {
        receivedHistory = history;
        return "Resposta nova";
      },
      presence: noWait,
    },
  );
  await orchestrator.process(contact, [
    {
      instance: "hurtz-contexto",
      format: "text",
      text: "Mensagem atual única",
    },
  ]);
  assert.equal(
    receivedHistory.filter((item) => item.content === "Mensagem atual única")
      .length,
    0,
  );
  assert.deepEqual(
    receivedHistory.map((item) => item.content),
    ["Mensagem anterior", "Resposta anterior"],
  );
});

test("pedido de humano bloqueia novas respostas automáticas", async () => {
  enable({
    humanTransferKeywords: ["humano"],
    humanTransferMessage: "Vou chamar alguém do time.",
  });
  const calls = [];
  const fakeEvolution = {
    sendText: async (number, text) => calls.push({ number, text }),
    setChatPresence: async () => {},
  };
  const contact = "550000000002";
  setContactStatus(contact, "bot");
  const orchestrator = new Orchestrator(fakeEvolution, {
    answer: async () => "não usar",
    presence: noWait,
  });
  await orchestrator.process(contact, [
    { format: "text", text: "Quero falar com um humano." },
  ]);
  assert.equal(getContactStatus(contact), "human");
  assert.equal(calls.length, 1);
  await orchestrator.process(contact, [
    { format: "text", text: "Ainda estou aqui." },
  ]);
  assert.equal(calls.length, 1);
});

test("falha de TTS retorna texto sem perder atendimento", async () => {
  enable({ responseMode: "audio" });
  const calls = [];
  const fakeEvolution = {
    sendText: async (number, text) =>
      calls.push({ type: "text", number, text }),
    sendAudio: async () => calls.push({ type: "audio" }),
    setChatPresence: async () => {},
  };
  const contact = "550000000003";
  setContactStatus(contact, "bot");
  const orchestrator = new Orchestrator(fakeEvolution, {
    answer: async () => "Consigo explicar por aqui.",
    synthesize: async () => {
      throw new Error("Gemini indisponível");
    },
    presence: noWait,
  });
  await orchestrator.process(contact, [{ format: "text", text: "Explique." }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "text");
});

test("gatilho libera somente o lead que enviou a frase configurada", async () => {
  enable({
    triggerEnabled: true,
    triggerKeywords: ["quero atendimento"],
    triggerMatchMode: "contains",
  });
  const calls = [];
  const fakeEvolution = {
    sendText: async (_number, text) => calls.push(text),
    setChatPresence: async () => {},
  };
  const contact = "550000000004";
  setContactStatus(contact, "bot");
  setContactActivated(contact, false);
  const orchestrator = new Orchestrator(fakeEvolution, {
    answer: async (input) => `Resposta para: ${input}`,
    presence: noWait,
  });
  await orchestrator.process(contact, [{ format: "text", text: "Oi" }]);
  assert.equal(calls.length, 0);
  await orchestrator.process(contact, [
    { format: "text", text: "Quero atendimento agora" },
  ]);
  assert.equal(calls.length, 1);
  await orchestrator.process(contact, [
    { format: "text", text: "Pode continuar" },
  ]);
  assert.equal(calls.length, 2);
});

test("áudio mantém presença de gravação durante a preparação", async () => {
  enable({ responseMode: "audio", triggerEnabled: false });
  const presenceCalls = [];
  const sent = [];
  const fakeEvolution = {
    sendText: async () => {},
    sendAudio: async (_number, audio) => sent.push(audio),
    setChatPresence: async (_number, state, duration) =>
      presenceCalls.push({ state, duration }),
  };
  const contact = "550000000005";
  setContactStatus(contact, "bot");
  const orchestrator = new Orchestrator(fakeEvolution, {
    answer: async () => "Resposta em áudio.",
    synthesize: async () => ({ base64: "origem", mimeType: "audio/wav" }),
    convertVoice: async () => ({
      base64: "ogg-final",
      durationSeconds: 47.2,
    }),
  });
  await orchestrator.process(contact, [{ format: "text", text: "Explique." }]);
  assert.equal(
    presenceCalls.some((item) => item.state === "recording"),
    true,
  );
  assert.equal(presenceCalls.at(-1).state, "paused");
  assert.deepEqual(sent, ["ogg-final"]);
});

test("resposta completa usa uma presença e pausas curtas entre balões", async () => {
  enable({ responseMode: "text", triggerEnabled: false });
  const events = [];
  const contact = "550000000010";
  setContactStatus(contact, "bot");
  const orchestrator = new Orchestrator(
    {
      sendText: async (_number, text) => events.push(`send:${text}`),
      setChatPresence: async (_number, state) => events.push(`state:${state}`),
    },
    {
      answer: async () =>
        "Primeiro balão com uma explicação curta. " +
        "Segundo conteúdo com detalhes suficientes para ultrapassar o limite de caracteres e obrigar o sistema a criar outro balão de forma segura e natural. ".repeat(
          2,
        ),
      bubblePause: async () => events.push("bubble-pause"),
    },
  );
  await orchestrator.process(contact, [{ format: "text", text: "Explique" }]);
  const sent = events.filter((item) => item.startsWith("send:"));
  assert.ok(sent.length > 1);
  assert.equal(
    sent.every((item) => item.slice(5).length <= 200),
    true,
  );
  assert.equal(events.filter((item) => item === "state:composing").length, 1);
  assert.equal(
    events.filter((item) => item === "bubble-pause").length,
    sent.length - 1,
  );
  assert.ok(events.indexOf("state:composing") < events.indexOf(sent[0]));
  assert.equal(events.at(-1), "state:paused");
});

test("geração antiga é cancelada sem enviar resposta fora de contexto", async () => {
  enable({ responseMode: "text", triggerEnabled: false });
  const sent = [];
  const controller = new AbortController();
  const orchestrator = new Orchestrator(
    {
      sendText: async (_number, text) => sent.push(text),
      setChatPresence: async () => {},
    },
    {
      answer: async (_input, _history, _assistant, _context, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            const error = new Error("cancelado");
            error.name = "AbortError";
            reject(error);
          });
        }),
    },
  );
  const running = orchestrator.process(
    "550000000099",
    [{ format: "text", text: "Pergunta antiga" }],
    { signal: controller.signal },
  );
  setTimeout(() => controller.abort(), 10);
  await running;
  assert.deepEqual(sent, []);
});
