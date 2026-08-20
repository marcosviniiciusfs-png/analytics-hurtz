import test from "node:test";
import assert from "node:assert/strict";
import { lexicalPostValidation, lexicalValidation, looksPortuguese } from "../src/validator.js";

const terms = ["não consigo engravidar", "aumentar fertilidade naturalmente"];
const criteria = "A pessoa deve falar de uma dificuldade própria para engravidar, estar tentando ou pedir ajuda. Rejeite elogios e histórias de terceiros.";

test("aprova necessidade pessoal diretamente relacionada", () => {
  const result = lexicalValidation("Estou tentando há dois anos e não consigo engravidar. Preciso de ajuda.", terms, criteria);
  assert.equal(result.eligible, true); assert.ok(result.relevanceScore >= 55);
});

test("aprova relação contextual com dificuldade própria", () => {
  const result = lexicalValidation("Tenho dificuldade e estou tentando ter filhos. Alguém pode me ajudar?", terms, criteria);
  assert.equal(result.eligible, true);
});

test("rejeita elogio genérico", () => {
  const result = lexicalValidation("Lindo trabalho ❤️", terms, criteria);
  assert.equal(result.eligible, false); assert.equal(result.relevanceScore, 0);
});

test("rejeita comentário sem necessidade própria", () => {
  const result = lexicalValidation("Minha irmã conhece uma pessoa que passou por isso.", terms, criteria);
  assert.equal(result.eligible, false);
});

test("aprova publicação em português relacionada e com comentários", () => {
  const result = lexicalPostValidation({ title: "Tentante: como aumentar a fertilidade", summary: "Veja informações para quem não consegue engravidar.", commentCount: 24 }, terms, criteria);
  assert.equal(result.eligible, true); assert.equal(result.commentsOk, true); assert.equal(result.languageOk, true);
});

test("rejeita publicação relacionada mas sem comentários", () => {
  const result = lexicalPostValidation({ title: "Não consigo engravidar", summary: "Informações sobre fertilidade para você.", commentCount: 0 }, terms, criteria);
  assert.equal(result.eligible, false); assert.equal(result.commentsOk, false);
});

test("rejeita publicação americana em inglês", () => {
  const result = lexicalPostValidation({ title: "How to get pregnant fast", summary: "American fertility tips and health information", commentCount: 90 }, terms, criteria);
  assert.equal(result.eligible, false); assert.equal(result.languageOk, false); assert.equal(looksPortuguese("American fertility tips"), false);
});

test("rejeita publicação em português sem relação com os termos", () => {
  const result = lexicalPostValidation({ title: "Receita de bolo", summary: "Veja como preparar uma receita deliciosa para você.", commentCount: 50 }, terms, criteria);
  assert.equal(result.eligible, false);
});
