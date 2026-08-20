import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createServer } from "../src/server.js";
import { assistantPath, rootDir } from "../src/config.js";
import {
  addManagedInstance,
  createBrainNucleus,
  removeManagedInstanceRecord,
} from "../src/memory.js";

function fakeEvolution() {
  const calls = [];
  const client = {
    calls,
    configured: () => true,
    createInstance: async (name) => {
      calls.push({ action: "create", name });
      return {
        instance: { instanceName: name, status: "connecting" },
        qrcode: { base64: "data:image/png;base64,QR-SIMULADO" },
      };
    },
    forInstance: (name) => ({
      connectQr: async () => {
        calls.push({ action: "qr", name });
        return { base64: "data:image/png;base64,QR-SIMULADO-2" };
      },
      connectionState: async () => {
        calls.push({ action: "status", name });
        return { instance: { state: "open" } };
      },
      configureWebhook: async () => ({ success: true }),
    }),
  };
  return client;
}

async function startLocal() {
  const evolution = fakeEvolution();
  const pushed = [];
  const server = createServer({
    evolution,
    debouncer: { push: (key, event) => pushed.push({ key, event }) },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    server,
    evolution,
    pushed,
    base: `http://127.0.0.1:${address.port}`,
  };
}

test("recebe PDF pela rota HTTP do núcleo", async (t) => {
  const local = await startLocal();
  t.after(() => local.server.close());
  const nucleus = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Núcleo HTTP",
    instructions: "Sempre respeitar integralmente o documento enviado.",
  });
  const source = path.resolve(
    rootDir,
    "..",
    "documentos",
    "ESTUDO_ASSISTENTE_HURTZ_VOZ.pdf",
  );
  const form = new FormData();
  form.append(
    "pdf",
    new Blob([fs.readFileSync(source)], { type: "application/pdf" }),
    "estudo-http.pdf",
  );
  const response = await fetch(
    `${local.base}/api/brain/nuclei/${nucleus.id}/learn-pdf`,
    { method: "POST", body: form },
  );
  const result = await response.json();
  t.after(() =>
    fs.rmSync(
      path.join(
        rootDir,
        "data",
        "knowledge-pdfs",
        `${result.document?.id}.pdf`,
      ),
      { force: true },
    ),
  );
  assert.equal(response.status, 201);
  assert.ok(result.factualNodes > 0);
  assert.equal(result.document.filename, "estudo-http.pdf");
});

test("edita, ativa e exclui núcleo pelas rotas administrativas", async (t) => {
  const local = await startLocal();
  t.after(() => local.server.close());
  const nucleus = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Nome temporário",
    instructions: "Manter as regras durante todo o atendimento.",
  });
  const renamed = await fetch(`${local.base}/api/brain/nuclei/${nucleus.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Nome definitivo" }),
  });
  assert.equal(renamed.status, 200);
  assert.equal((await renamed.json()).nucleus.name, "Nome definitivo");
  const activated = await fetch(
    `${local.base}/api/brain/nuclei/${nucleus.id}/activation`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: true }),
    },
  );
  const activation = await activated.json();
  assert.equal(activated.status, 200);
  assert.equal(activation.nucleus.status, "active");
  assert.equal(
    activation.nuclei.filter((item) => item.status === "active").length,
    1,
  );
  const removed = await fetch(`${local.base}/api/brain/nuclei/${nucleus.id}`, {
    method: "DELETE",
  });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).removed, true);
});

test("salva e devolve memória operacional de uma conversa", async (t) => {
  const local = await startLocal();
  t.after(() => local.server.close());
  const contact = `hurtz-context-api:${crypto.randomUUID()}`;
  const saved = await fetch(
    `${local.base}/api/conversations/${encodeURIComponent(contact)}/context`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        summary: "Lead pediu uma demonstração.",
        profile: { name: "Ana", stage: "qualificação" },
        nextSteps: ["Confirmar horário"],
      }),
    },
  );
  assert.equal(saved.status, 200);
  const detail = await fetch(
    `${local.base}/api/conversations/${encodeURIComponent(contact)}/messages`,
  );
  const data = await detail.json();
  assert.equal(data.context.profile.name, "Ana");
  assert.deepEqual(data.context.nextSteps, ["Confirmar horário"]);
});

test("cria e conecta somente instância Hurtz usando Evolution simulada", async (t) => {
  const local = await startLocal();
  t.after(() => local.server.close());

  const response = await fetch(`${local.base}/api/instances`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label: "Matriz Teste Isolado" }),
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  t.after(() => removeManagedInstanceRecord(created.instance.name));
  assert.match(
    created.instance.name,
    /^hurtz-matriz-teste-isolado-[a-f0-9]{6}$/,
  );
  assert.equal(created.qr, "data:image/png;base64,QR-SIMULADO");
  assert.deepEqual(local.evolution.calls[0], {
    action: "create",
    name: created.instance.name,
  });

  const status = await fetch(
    `${local.base}/api/instances/${created.instance.name}/status`,
  );
  assert.deepEqual(await status.json(), {
    name: created.instance.name,
    state: "open",
  });
});

test("bloqueia webhook de instância que não pertence ao Hurtz", async (t) => {
  const local = await startLocal();
  t.after(() => local.server.close());
  const response = await fetch(
    `${local.base}/webhooks/evolution?instance=ferramenta-de-terceiro`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "MESSAGES_UPSERT",
        data: {
          key: { id: "X-ISOLADO", remoteJid: "5511000000000@s.whatsapp.net" },
          message: { conversation: "oi" },
        },
      }),
    },
  );
  assert.equal(response.status, 403);
  assert.equal(local.pushed.length, 0);
});

test("salva e devolve gatilhos pela API administrativa", async (t) => {
  const original = fs.readFileSync(assistantPath, "utf8");
  const local = await startLocal();
  t.after(() => {
    fs.writeFileSync(assistantPath, original);
    local.server.close();
  });
  const response = await fetch(`${local.base}/api/assistant`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      triggerEnabled: true,
      triggerKeywords: [" quero atendimento ", "começar"],
      triggerMatchMode: "contains",
      slangIntensity: 65,
    }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.assistant.triggerEnabled, true);
  assert.deepEqual(result.assistant.triggerKeywords, [
    "quero atendimento",
    "começar",
  ]);
  assert.equal(result.assistant.slangIntensity, 65);
  const status = await fetch(`${local.base}/api/status`).then((item) =>
    item.json(),
  );
  assert.deepEqual(status.assistant.triggerKeywords, [
    "quero atendimento",
    "começar",
  ]);
});

test("assumir e devolver conversa altera o modo confirmado", async (t) => {
  const local = await startLocal();
  t.after(() => local.server.close());
  const contact = "hurtz-teste:550000009999";
  const human = await fetch(
    `${local.base}/api/contacts/${encodeURIComponent(contact)}/human`,
    { method: "POST" },
  ).then((item) => item.json());
  assert.equal(human.status, "human");
  const bot = await fetch(
    `${local.base}/api/contacts/${encodeURIComponent(contact)}/bot`,
    { method: "POST" },
  ).then((item) => item.json());
  assert.equal(bot.status, "bot");
});

test("webhook realista cria contato e nome no preview", async (t) => {
  const local = await startLocal();
  const instance = "hurtz-preview-isolado";
  addManagedInstance(instance, "Preview isolado", "open");
  t.after(() => {
    removeManagedInstanceRecord(instance);
    local.server.close();
  });
  const response = await fetch(
    `${local.base}/webhooks/evolution?instance=${instance}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "messages.upsert",
        data: {
          key: {
            id: "PREVIEW-ISOLADO-1",
            remoteJid: "5511999991111@s.whatsapp.net",
            fromMe: false,
          },
          pushName: "Lead Preview",
          message: { conversation: "quero atendimento" },
        },
      }),
    },
  );
  assert.equal(response.status, 202);
  assert.equal(local.pushed.length, 1);
  const list = await fetch(`${local.base}/api/conversations`).then((item) =>
    item.json(),
  );
  const contact = list.conversations.find((item) =>
    item.contact.endsWith("5511999991111"),
  );
  assert.equal(contact.push_name, "Lead Preview");
});
