import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  addMessage,
  contextHistory,
  conversationContext,
  getContextCache,
  saveConversationContext,
  setContextCache,
} from "../src/memory.js";
import { refreshConversationContext } from "../src/context-memory.js";

test("histórico de contexto respeita orçamento e ordem cronológica", () => {
  const contact = `context-budget-${crypto.randomUUID()}`;
  addMessage(contact, "user", "A".repeat(120));
  addMessage(contact, "assistant", "B".repeat(120));
  addMessage(contact, "user", "C".repeat(120));
  const rows = contextHistory(contact, 10, 250);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].content[0], "B");
  assert.equal(rows[1].content[0], "C");
});

test("cache contextual expira e memória do lead pode ser corrigida", async () => {
  const contact = `context-profile-${crypto.randomUUID()}`;
  setContextCache(`test:${contact}`, { value: 1 }, 1000);
  assert.deepEqual(getContextCache(`test:${contact}`), { value: 1 });
  setContextCache(`expired:${contact}`, { value: 2 }, -1);
  assert.equal(getContextCache(`expired:${contact}`), null);
  addMessage(contact, "user", "Meu nome é Marina e trabalho na Acme.");
  addMessage(contact, "assistant", "Prazer, Marina.");
  addMessage(contact, "user", "Quero conhecer o produto.");
  addMessage(contact, "assistant", "Vou explicar.");
  const context = await refreshConversationContext(
    contact,
    async () => new Response("", { status: 500 }),
    true,
  );
  assert.equal(context.profile.name, "Marina");
  const corrected = saveConversationContext(contact, {
    ...conversationContext(contact),
    profile: { name: "Marina", company: "Acme" },
    nextSteps: ["Apresentar o produto"],
  });
  assert.equal(corrected.profile.company, "Acme");
  assert.deepEqual(corrected.nextSteps, ["Apresentar o produto"]);
});
