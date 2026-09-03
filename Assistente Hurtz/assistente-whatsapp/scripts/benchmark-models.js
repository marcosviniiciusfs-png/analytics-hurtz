import { performance } from "node:perf_hooks";

const url = "http://127.0.0.1:11434/api/chat";
const models = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["llama3.2:3b", "qwen3:8b"];
const prompts = [
  "Um cliente pergunta quanto custa um serviço, mas a base não contém preço. Responda de forma natural, curta e sem inventar.",
  "O cliente disse: achei caro e preciso pensar. Responda com empatia e faça apenas uma pergunta útil para entender a objeção.",
  "O cliente escreveu: quero cancelar e falar com uma pessoa. Diga que vai transferir para atendimento humano, em até 160 caracteres.",
];

for (const model of models) {
  const samples = [];
  for (const prompt of prompts) {
    const started = performance.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        messages: [
          {
            role: "system",
            content:
              "Você atende pelo WhatsApp em português do Brasil. Seja natural, direto, não invente e use no máximo 200 caracteres.",
          },
          { role: "user", content: prompt },
        ],
        options: { temperature: 0.3, num_predict: 100 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`${model}: HTTP ${response.status}`);
    const data = await response.json();
    samples.push({
      ms: Math.round(performance.now() - started),
      tokensPerSecond: data.eval_duration
        ? Number(((data.eval_count * 1e9) / data.eval_duration).toFixed(1))
        : 0,
      characters: String(data.message?.content || "").length,
      answer: String(data.message?.content || "").trim(),
    });
  }
  console.log(JSON.stringify({ model, samples }, null, 2));
}
