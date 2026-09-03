import test from "node:test";
import assert from "node:assert/strict";
import {
  addMessage,
  conversationFeedback,
  feedbackDashboard,
  saveResponseFeedback,
  trainingExamples,
} from "../src/memory.js";

test("feedback supervisionado fica ligado à resposta correta", () => {
  const contact = "feedback-unit@s.whatsapp.net";
  addMessage(contact, "user", "Como funciona o plano?");
  const answer = addMessage(contact, "assistant", "Vou explicar pra você.");
  const saved = saveResponseFeedback({
    contact,
    messageId: answer.id,
    rating: "good",
    reason: "naturalness",
    note: "Resposta curta e natural",
  });
  assert.equal(saved.message_id, answer.id);
  assert.equal(saved.rating, "good");
  assert.equal(conversationFeedback(contact).length, 1);
  assert.ok(feedbackDashboard().good >= 1);
});

test("correção gera exemplo pronto para treinamento sem apagar a resposta original", () => {
  const contact = "feedback-correction@s.whatsapp.net";
  addMessage(contact, "user", "Qual é o próximo passo?");
  const answer = addMessage(
    contact,
    "assistant",
    "Texto antigo e pouco claro.",
  );
  saveResponseFeedback({
    contact,
    messageId: answer.id,
    rating: "bad",
    reason: "next_action",
    note: "Faltou indicar uma ação objetiva",
    idealResponse: "Boa, agora me diga qual horário fica melhor pra você.",
  });
  const example = trainingExamples().find((item) => item.contact === contact);
  assert.equal(example.rating, "bad");
  assert.equal(example.rejectedResponse, "Texto antigo e pouco claro.");
  assert.equal(
    example.messages.at(-1).content,
    "Boa, agora me diga qual horário fica melhor pra você.",
  );
});

test("não aceita avaliação de mensagem do cliente", () => {
  const contact = "feedback-customer@s.whatsapp.net";
  const customer = addMessage(contact, "user", "Oi");
  assert.equal(
    saveResponseFeedback({
      contact,
      messageId: customer.id,
      rating: "good",
    }),
    null,
  );
});
