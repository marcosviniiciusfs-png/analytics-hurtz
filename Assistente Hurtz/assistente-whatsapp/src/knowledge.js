import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { env, rootDir } from "./config.js";
import { saveKnowledgeDocument } from "./memory.js";
import { syncKnowledgeToCloudflare } from "./cloudflare.js";

const pdfDir = path.join(rootDir, "data", "knowledge-pdfs");
fs.mkdirSync(pdfDir, { recursive: true });

function safeFilename(value) {
  return path
    .basename(String(value || "documento.pdf"))
    .replace(/[^\p{L}\p{N}._ -]+/gu, "_")
    .slice(0, 120);
}

export function chunkText(text, max = 1100, overlap = 180) {
  const clean = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(clean.length, start + max);
    if (end < clean.length) {
      const breakAt = Math.max(
        clean.lastIndexOf("\n\n", end),
        clean.lastIndexOf(". ", end),
      );
      if (breakAt > start + max * 0.55) end = breakAt + 1;
    }
    const part = clean.slice(start, end).trim();
    if (part) chunks.push(part);
    if (end >= clean.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

export async function extractPdf(buffer, originalName) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString() !== "%PDF-"
  )
    throw new Error("O arquivo enviado não é um PDF válido");
  const id = crypto.createHash("sha256").update(buffer).digest("hex");
  const filename = safeFilename(originalName);
  const parser = new PDFParse({ data: buffer });
  let result;
  try {
    result = await parser.getText();
  } finally {
    await parser.destroy();
  }
  const text = String(result.text || "").trim();
  if (text.length < 30)
    throw new Error(
      "O PDF não possui texto suficiente para estudo. PDFs escaneados precisarão de OCR.",
    );
  const chunks = chunkText(text);
  const document = {
    id,
    filename,
    title: filename.replace(/\.pdf$/i, ""),
    pages: Number(result.total || result.pages?.length || 0),
    characters: text.length,
  };
  return { document, chunks, text };
}

export function savePdfOriginal(buffer, documentId) {
  fs.writeFileSync(path.join(pdfDir, `${documentId}.pdf`), buffer);
}

export async function ingestPdf(buffer, originalName) {
  const { document, chunks } = await extractPdf(buffer, originalName);
  const { id } = document;
  savePdfOriginal(buffer, id);
  saveKnowledgeDocument(document, chunks);
  let cloud = { synced: false, reason: "not_configured" };
  try {
    cloud = env.disableCloudSync
      ? { synced: false, reason: "disabled" }
      : await syncKnowledgeToCloudflare(document, chunks);
  } catch (error) {
    cloud = { synced: false, reason: error.message };
  }
  return { ...document, chunks: chunks.length, cloud };
}
