import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  brainNuclei,
  createBrainNucleus,
  deleteBrainNucleus,
  reviewBrainNode,
  setBrainNucleusActive,
  updateBrainNucleus,
} from "../src/memory.js";
import {
  learnBrain,
  learnBrainDocument,
  searchBrain,
} from "../src/brain-memory.js";

test("IA cria fatos usáveis pendentes sob regras invioláveis", async () => {
  const nucleus = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Follow-up",
    instructions: "Nunca prometer prazo sem confirmação humana.",
  });
  const fakeFetch = async () =>
    new Response(
      JSON.stringify({
        message: {
          content: JSON.stringify([
            {
              name: "Prazo de retorno",
              category: "action",
              content: "Perguntar ao lead qual período prefere para retorno.",
              confidence: 0.88,
            },
          ]),
        },
      }),
      { status: 200 },
    );
  const nodes = await learnBrain(
    nucleus.id,
    "No follow-up devemos perguntar quando o lead prefere receber retorno.",
    fakeFetch,
  );
  assert.equal(nodes[0].review_status, "pending");
  assert.equal(nodes[0].usable, 0);
  assert.equal(nodes[0].risk_level, "critical");
  const found = searchBrain("quando prefere retorno");
  assert.match(found.rules[0].instructions, /Nunca prometer prazo/);
  assert.equal(found.memories.length, 0);
  assert.equal(
    reviewBrainNode(nodes[0].id, "approved").review_status,
    "approved",
  );
  assert.equal(reviewBrainNode(nodes[0].id, "approved").usable, 1);
  assert.equal(
    brainNuclei().some((item) => item.id === nucleus.id),
    true,
  );
});

test("PDF alimenta o núcleo com fatos documentais e inferências revisáveis", async () => {
  const nucleus = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Produto",
    instructions: "Nunca alterar valores informados no documento.",
  });
  const fakeFetch = async () =>
    new Response(
      JSON.stringify({
        message: {
          content: JSON.stringify([
            {
              name: "Ação sugerida",
              category: "action",
              content: "Explicar o produto antes de oferecer.",
              confidence: 0.8,
            },
          ]),
        },
      }),
      { status: 200 },
    );
  const learned = await learnBrainDocument(
    nucleus.id,
    { title: "Manual do Produto" },
    ["O produto possui suporte durante o horário comercial."],
    fakeFetch,
  );
  assert.equal(learned.factualNodes[0].origin, "document");
  assert.equal(learned.factualNodes[0].review_status, "approved");
  assert.equal(learned.inferredNodes[0].review_status, "pending");
});

test("renomeia núcleo sem misturar suas memórias com outro núcleo", async () => {
  const first = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Primeiro núcleo",
    instructions: "Consultar apenas o conhecimento deste núcleo.",
  });
  const second = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Segundo núcleo",
    instructions: "Manter este conteúdo completamente separado.",
  });
  const fakeFetch = async () =>
    new Response(JSON.stringify({ message: { content: "[]" } }), {
      status: 200,
    });
  await learnBrain(first.id, "O primeiro núcleo atende vendas.", fakeFetch);
  await learnBrain(second.id, "O segundo núcleo atende suporte.", fakeFetch);
  const renamed = updateBrainNucleus(first.id, {
    name: "Vendas renomeado",
  });
  const nuclei = brainNuclei();
  assert.equal(renamed.name, "Vendas renomeado");
  assert.equal(
    nuclei
      .find((nucleus) => nucleus.id === first.id)
      .nodes.every((node) => node.nucleus_id === first.id),
    true,
  );
  assert.equal(
    nuclei
      .find((nucleus) => nucleus.id === second.id)
      .nodes.every((node) => node.nucleus_id === second.id),
    true,
  );
});

test("somente o núcleo ativado participa do atendimento e pode ser excluído", async () => {
  const sales = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Vendas isolado",
    instructions: "Responder somente sobre vendas.",
  });
  const support = createBrainNucleus({
    id: crypto.randomUUID(),
    name: "Suporte isolado",
    instructions: "Responder somente sobre suporte.",
  });
  const fakeFetch = async () => new Response("", { status: 500 });
  await learnBrain(
    sales.id,
    "O plano comercial de vendas possui demonstração.",
    fakeFetch,
  );
  await learnBrain(
    support.id,
    "O suporte técnico orienta a reinicialização.",
    fakeFetch,
  );
  setBrainNucleusActive(support.id, true);
  const result = searchBrain("suporte técnico reinicialização");
  assert.deepEqual(result.rules, [
    {
      nucleus: "Suporte isolado",
      instructions: "Responder somente sobre suporte.",
    },
  ]);
  assert.equal(
    result.memories.every((item) => item.id === support.id),
    true,
  );
  assert.equal(
    brainNuclei().filter((item) => item.status === "active").length,
    1,
  );
  assert.equal(deleteBrainNucleus(support.id).id, support.id);
  assert.equal(
    brainNuclei().some((item) => item.id === support.id),
    false,
  );
});
