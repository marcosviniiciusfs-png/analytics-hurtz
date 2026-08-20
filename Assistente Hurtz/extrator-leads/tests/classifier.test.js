import test from "node:test";
import assert from "node:assert/strict";
import { classifyIntent, extractContacts, normalizeApifyItem } from "../src/classifier.js";
test("classifica orçamento, contato e urgência",()=>{const r=classifyIntent("Preciso de orçamento hoje. Me chama no WhatsApp.");assert.ok(["orcamento","contato"].includes(r.intention));assert.ok(r.score>=30);assert.ok(r.scores.orcamento>0);assert.ok(r.scores.contato>0)});
test("mantém texto sem intenção com score baixo",()=>{const r=classifyIntent("Gostei da publicação.");assert.equal(r.intention,"baixa_intencao");assert.equal(r.score,0)});
test("extrai contatos sem duplicar",()=>{const r=extractContacts("a@b.com a@b.com e (11) 99999-9999");assert.deepEqual(r.emails,["a@b.com"]);assert.equal(r.phones.length,1)});
test("normaliza Apify sem inventar gênero",()=>{const l=normalizeApifyItem({username:"maria",text:"Quero saber o valor",bio:"Contato maria@exemplo.com"},"https://instagram.com/p/x");assert.equal(l.platform,"Instagram");assert.equal(l.gender,"Não informado");assert.deepEqual(l.emails,["maria@exemplo.com"])});
