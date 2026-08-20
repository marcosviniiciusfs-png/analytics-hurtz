import { env } from "./config.js";
import {
  contextHistory,
  conversationContext,
  saveConversationContext,
} from "./memory.js";

function parseObject(text) {
  const clean = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}

function deterministicProfile(messages, current = {}) {
  const text = messages
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join("\n");
  const profile = { ...current };
  const name = text.match(
    /(?:meu nome [ée]|me chamo)\s+([\p{L}][\p{L} '-]{1,60}?)(?=\s+e\s+|\s+trabalho\b|[.,!?]|$)/iu,
  );
  const company = text.match(
    /(?:empresa|trabalho (?:na|no|com a))\s+([\p{L}\p{N}][\p{L}\p{N} &.'-]{1,70})/iu,
  );
  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  if (name) profile.name = name[1].trim().replace(/[.,!?].*$/, "");
  if (company) profile.company = company[1].trim().replace(/[.,!?].*$/, "");
  if (email) profile.email = email[0];
  return profile;
}

export async function refreshConversationContext(
  contact,
  fetchImpl = fetch,
  force = false,
) {
  const current = conversationContext(contact);
  const messages = contextHistory(contact, 24, 14000);
  const latestId = messages.at(-1)?.id || 0;
  const newMessages = messages.filter(
    (item) => item.id > current.sourceMessageId,
  ).length;
  if (!force && newMessages < 4) return current;
  const fallbackProfile = deterministicProfile(messages, current.profile);
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
            content: `Atualize a memória operacional de um atendimento de WhatsApp.
Retorne somente JSON neste formato:
{"summary":"resumo factual curto","profile":{"name":"","company":"","interest":"","stage":"","preferences":[],"objections":[],"commitments":[]},"nextSteps":["ação objetiva"]}
Não invente. Preserve fatos úteis do resumo anterior. Remova fatos corrigidos pelo cliente.`,
          },
          {
            role: "user",
            content: `MEMÓRIA ANTERIOR:\n${JSON.stringify(current)}\n\nCONVERSA RECENTE:\n${messages.map((item) => `${item.role}: ${item.content}`).join("\n")}`,
          },
        ],
        options: { temperature: 0.1, num_predict: 500 },
      }),
    });
    if (!response.ok) throw new Error(`Ollama ${response.status}`);
    const parsed = parseObject((await response.json()).message?.content);
    if (!parsed) throw new Error("Resumo inválido");
    return saveConversationContext(contact, {
      summary: parsed.summary || current.summary,
      profile: { ...fallbackProfile, ...(parsed.profile || {}) },
      nextSteps: parsed.nextSteps || current.nextSteps,
      sourceMessageId: latestId,
    });
  } catch {
    return saveConversationContext(contact, {
      summary: current.summary,
      profile: fallbackProfile,
      nextSteps: current.nextSteps,
      sourceMessageId: latestId,
    });
  }
}
