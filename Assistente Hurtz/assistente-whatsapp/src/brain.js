import { env } from "./config.js";
import { searchKnowledge } from "./rag.js";
import {
  cloudflareConfigured,
  searchBrainCloudflare,
  searchCloudflare,
} from "./cloudflare.js";
import { searchBrain } from "./brain-memory.js";
import { getContextCache, setContextCache } from "./memory.js";

function slangGuidance(value) {
  const intensity = Math.max(0, Math.min(100, Number(value) || 0));
  if (intensity === 0)
    return "Não use gírias. Mantenha uma conversa natural, simples e cordial.";
  if (intensity <= 30)
    return "Use gírias brasileiras com baixa frequência, apenas quando combinarem com o jeito do cliente. Exemplos possíveis: “então”, “boa” e “pode ser”.";
  if (intensity <= 65)
    return "Use gírias brasileiras com frequência moderada e natural. Varie expressões como “então”, “e aí”, “boa”, “pode ser” e “vamos lá”, sem colocar gíria em toda frase.";
  return "Use gírias brasileiras com frequência alta, acompanhando o estilo informal do cliente. Pode usar “então”, “e aí”, “boa”, “pode ser”, “vamos lá” e “cara”, mas sem repetir bordões, forçar intimidade ou prejudicar a clareza.";
}

export function systemPrompt(
  assistant,
  knowledge,
  cognitive = { rules: [], memories: [] },
  context = { summary: "", profile: {}, nextSteps: [] },
) {
  return `Você é ${assistant.assistantName}, atendente da ${assistant.businessName} no WhatsApp.
${assistant.persona}

REGRAS:
- Responda em português do Brasil, com frases curtas, naturais e úteis.
- Intensidade configurada de gírias: ${Math.max(0, Math.min(100, Number(assistant.slangIntensity) || 0))}/100.
- ${slangGuidance(assistant.slangIntensity)}
- Adapte as gírias ao contexto, ao grau de formalidade e ao vocabulário do cliente. Nunca use todas de uma vez.
- Não use linguagem corporativa artificial nem repita a pergunta.
- Não invente informações, preços, prazos ou políticas.
- Use a BASE abaixo como fonte factual. Se ela não trouxer a informação necessária, diga que precisa confirmar.
- Não esconda deliberadamente a automação. Se perguntarem diretamente, responda com honestidade e naturalidade.
- Cada ideia deve ser curta e adequada a balões de até 200 caracteres.
- Nunca use hífen, meia-risca, travessão ou listas marcadas com traços.
- Não produza markdown. Prefira frases naturais e parágrafos muito curtos.
- Retorne somente a mensagem que deve ser enviada ao cliente.

REGRAS INVIOLÁVEIS DOS NÚCLEOS:
${
  cognitive.rules.length
    ? cognitive.rules
        .map((item) => `[${item.nucleus}] ${item.instructions}`)
        .join("\n")
    : "Nenhum núcleo cognitivo relevante."
}

MEMÓRIA COGNITIVA UTILIZÁVEL:
${
  cognitive.memories.length
    ? cognitive.memories
        .map(
          (item) =>
            `[${item.node_name || item.name}/${item.category} · ${item.review_status === "pending" ? "CRIADO PELA IA, AGUARDANDO REVISÃO" : "REVISADO"}] ${item.content}`,
        )
        .join("\n")
    : "Nenhuma memória cognitiva relevante."
}

As REGRAS INVIOLÁVEIS têm prioridade sobre fatos criados pela IA, mesmo quando estes estão liberados para uso.

CONTEXTO CONSOLIDADO DO LEAD:
Resumo: ${context.summary || "Ainda não há resumo consolidado."}
Perfil: ${Object.keys(context.profile || {}).length ? JSON.stringify(context.profile) : "Ainda não há dados estruturados."}
Próximos passos: ${(context.nextSteps || []).length ? context.nextSteps.join("; ") : "Nenhum próximo passo registrado."}

BASE:
${knowledge.length ? knowledge.map((x) => `[${x.source}] ${x.text}`).join("\n\n") : "Nenhum trecho relevante encontrado."}`;
}

export async function answerWithOllama(
  message,
  history,
  assistant,
  context = { summary: "", profile: {}, nextSteps: [] },
  options = {},
) {
  const fetchImpl = options.fetchImpl || fetch;
  const ragStarted = performance.now();
  const cognitive = searchBrain(message, 8);
  let knowledge = [];
  if (!cognitive.active && cloudflareConfigured()) {
    try {
      knowledge = (await searchCloudflare(message, 4)).map((item) => ({
        source: `Cloudflare:${item.document_id}`,
        text: item.content,
        score: item.score,
      }));
    } catch {
      knowledge = [];
    }
  }
  if (!cognitive.active && !knowledge.length)
    knowledge = searchKnowledge(message, 4);
  if (cognitive.active && cloudflareConfigured()) {
    const cacheKey = `semantic:${cognitive.active.id}:${message.toLowerCase().trim()}`;
    let semantic = getContextCache(cacheKey);
    if (!semantic) {
      try {
        semantic = await searchBrainCloudflare(message, cognitive.active.id, 8);
        setContextCache(cacheKey, semantic, 5 * 60_000);
      } catch {
        semantic = [];
      }
    }
    const existing = new Set(cognitive.memories.map((item) => item.node_id));
    cognitive.memories.push(
      ...semantic.filter((item) => !existing.has(item.node_id)),
    );
    cognitive.memories = cognitive.memories.slice(0, 8);
  }
  options.onMetric?.("rag", performance.now() - ragStarted);
  const messages = [
    {
      role: "system",
      content: systemPrompt(assistant, knowledge, cognitive, context),
    },
    ...history.map((x) => ({
      role: x.role === "assistant" ? "assistant" : "user",
      content: x.content,
    })),
    { role: "user", content: message },
  ];
  const timeoutSignal = AbortSignal.timeout(
    Number(options.timeoutMs || env.ollamaTimeoutMs),
  );
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
  const response = await fetchImpl(`${env.ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: env.ollamaModel,
      stream: false,
      think: false,
      messages,
      options: { temperature: 0.55, num_predict: 220 },
    }),
    signal,
  });
  if (!response.ok)
    throw new Error(
      `Ollama ${response.status}: ${(await response.text()).slice(0, 240)}`,
    );
  const data = await response.json();
  return String(data.message?.content || assistant.unknownAnswer).trim();
}
