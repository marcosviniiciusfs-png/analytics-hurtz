import crypto from "node:crypto";
import { env } from "./config.js";
import {
  activeBrainNucleus,
  addBrainNode,
  brainNucleus,
  getContextCache,
  setContextCache,
  usableBrainMemory,
} from "./memory.js";

const categories = new Set([
  "knowledge",
  "intelligence",
  "humor",
  "slang",
  "attitude",
  "action",
]);

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const criticalPattern =
  /\b(pre[çc]o|valor|prazo|contrato|garantia|reembolso|pagamento|desconto|multa|pol[ií]tica|jur[ií]dic|promessa)\b/i;

function parseJson(text) {
  const clean = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return [];
  }
}

export async function learnBrain(
  nucleusId,
  sourceText,
  fetchImpl = fetch,
  options = {},
) {
  const nucleus = brainNucleus(nucleusId);
  if (!nucleus) throw new Error("Núcleo não encontrado");
  const content = String(sourceText || "").trim();
  if (content.length < 20)
    throw new Error("Adicione pelo menos 20 caracteres de conhecimento");

  let learned = [];
  try {
    const response = await fetchImpl(`${env.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: env.ollamaModel,
        stream: false,
        think: false,
        format: "json",
        messages: [
          {
            role: "system",
            content: `Organize aprendizado para um cérebro de atendimento.
INSTRUÇÕES INVIOLÁVEIS DO NÚCLEO:
${nucleus.instructions}

Retorne somente um JSON array. Cada item:
{"name":"título curto","category":"knowledge|intelligence|humor|slang|attitude|action","content":"conhecimento ou orientação autocontida","confidence":0.0}
Extraia fatos, sinais de contexto, humor, linguagem, atitudes e ações úteis. Não contradiga as instruções invioláveis.`,
          },
          { role: "user", content },
        ],
        options: { temperature: 0.2, num_predict: 900 },
      }),
    });
    if (response.ok) {
      const data = await response.json();
      learned = parseJson(data.message?.content);
    }
  } catch {
    learned = [];
  }
  if (!learned.length)
    learned = [
      {
        name: "Conhecimento aprendido",
        category: "knowledge",
        content,
        confidence: 0.5,
      },
    ];

  return learned.slice(0, 30).map((item) =>
    addBrainNode({
      id: crypto.randomUUID(),
      nucleusId,
      parentId: options.parentId || null,
      name: String(item.name || "Aprendizado").slice(0, 100),
      category: categories.has(item.category) ? item.category : "knowledge",
      content: String(item.content || content).trim(),
      confidence: Math.max(0, Math.min(1, Number(item.confidence || 0.5))),
      origin: "ai",
      reviewStatus: "pending",
      usable: !criticalPattern.test(`${item.name} ${item.content}`),
      riskLevel: criticalPattern.test(`${item.name} ${item.content}`)
        ? "critical"
        : "normal",
    }),
  );
}

export async function learnBrainDocument(
  nucleusId,
  document,
  chunks,
  fetchImpl = fetch,
) {
  const nucleus = brainNucleus(nucleusId);
  if (!nucleus) throw new Error("Núcleo não encontrado");
  const documentNode = addBrainNode({
    id: crypto.randomUUID(),
    nucleusId,
    name: document.title,
    category: "knowledge",
    content:
      `Documento com ${chunks.length} seção(ões) internas para consulta. ${chunks[0] || ""}`.slice(
        0,
        2200,
      ),
    confidence: 1,
    origin: "document",
    reviewStatus: "approved",
    usable: true,
  });
  const chunkNodes = chunks.map((content, index) =>
    addBrainNode({
      id: crypto.randomUUID(),
      nucleusId,
      parentId: documentNode.id,
      name: `${document.title} · seção interna ${index + 1}`,
      category: "knowledge",
      content,
      confidence: 1,
      origin: "document_chunk",
      reviewStatus: "approved",
      usable: true,
    }),
  );
  const analysisText = chunks.slice(0, 10).join("\n\n").slice(0, 18000);
  const inferredNodes = await learnBrain(nucleusId, analysisText, fetchImpl, {
    parentId: documentNode.id,
  });
  const factualNodes = [documentNode, ...chunkNodes];
  return { factualNodes, inferredNodes };
}

export function searchBrain(query, topK = 8) {
  const active = activeBrainNucleus();
  if (!active) return { active: null, rules: [], memories: [] };
  const cacheKey = `brain:${active.id}:${topK}:${normalize(query)}`;
  const cached = getContextCache(cacheKey);
  if (cached) return cached;
  const wanted = new Set(
    normalize(query)
      .split(/\s+/)
      .filter((x) => x.length > 2),
  );
  const rows = usableBrainMemory();
  const scored = rows
    .map((row) => {
      const words = new Set(
        normalize(`${row.node_name} ${row.content}`).split(/\s+/),
      );
      let score = 0;
      for (const word of wanted) if (words.has(word)) score += 1;
      return { ...row, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const result = {
    active: { id: active.id, name: active.name },
    rules: active
      ? [{ nucleus: active.name, instructions: active.instructions }]
      : [],
    memories: scored,
  };
  setContextCache(cacheKey, result, 5 * 60_000);
  return result;
}
