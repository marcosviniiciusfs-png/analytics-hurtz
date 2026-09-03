import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ingestPdf, chunkText } from "../src/knowledge.js";
import { removeKnowledgeDocumentRecord } from "../src/memory.js";
import { rootDir } from "../src/config.js";

test("divide conhecimento com sobreposição útil", () => {
  const text = `${"Primeiro conteúdo relevante. ".repeat(45)}\n\n${"Segundo assunto importante. ".repeat(45)}`;
  const chunks = chunkText(text, 500, 80);
  assert.ok(chunks.length >= 3);
  assert.ok(chunks.every((chunk) => chunk.length <= 510));
});

test("extrai e indexa um PDF real sem serviços externos", async (t) => {
  const source = path.resolve(
    rootDir,
    "..",
    "documentos",
    "ESTUDO_ASSISTENTE_HURTZ_VOZ.pdf",
  );
  const result = await ingestPdf(
    fs.readFileSync(source),
    "teste-estudo-hurtz.pdf",
  );
  t.after(() => {
    removeKnowledgeDocumentRecord(result.id);
    fs.rmSync(
      path.join(rootDir, "data", "knowledge-pdfs", `${result.id}.pdf`),
      { force: true },
    );
  });
  assert.ok(result.characters > 1000);
  assert.ok(result.chunks > 3);
  assert.equal(result.cloud.synced, false);
});
