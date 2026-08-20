import { performance } from "node:perf_hooks";

const model = process.argv[2] || "llama3.2:3b";
const levels = (process.argv[3] || "1,5,10,20")
  .split(",")
  .map(Number)
  .filter((value) => value > 0);
const percentile = (values, rate) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.ceil(values.length * rate) - 1)
  ];

async function request(index) {
  const marker = `LEAD${String(index).padStart(3, "0")}`;
  const started = performance.now();
  try {
    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: "30m",
        messages: [
          {
            role: "system",
            content:
              "Você atende pelo WhatsApp. Responda naturalmente em até 160 caracteres. Comece repetindo exatamente o identificador recebido.",
          },
          {
            role: "user",
            content: `${marker}: achei o serviço caro. Responda com empatia e faça uma pergunta útil.`,
          },
        ],
        options: { temperature: 0.2, num_predict: 80 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const answer = String(data.message?.content || "");
    return {
      ok: true,
      ms: Math.round(performance.now() - started),
      isolated: answer.includes(marker),
      evalCount: Number(data.eval_count || 0),
    };
  } catch (error) {
    return {
      ok: false,
      ms: Math.round(performance.now() - started),
      isolated: false,
      error: error.message,
    };
  }
}

await request(0);
const results = [];
for (const concurrency of levels) {
  const started = performance.now();
  const samples = await Promise.all(
    Array.from({ length: concurrency }, (_, index) => request(index + 1)),
  );
  const durations = samples.map((sample) => sample.ms);
  results.push({
    concurrency,
    wallMs: Math.round(performance.now() - started),
    averageMs: Math.round(
      durations.reduce((sum, value) => sum + value, 0) / durations.length,
    ),
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    fastestMs: Math.min(...durations),
    slowestMs: Math.max(...durations),
    successful: samples.filter((sample) => sample.ok).length,
    failed: samples.filter((sample) => !sample.ok).length,
    isolated: samples.filter((sample) => sample.isolated).length,
    generatedTokens: samples.reduce(
      (sum, sample) => sum + Number(sample.evalCount || 0),
      0,
    ),
  });
}
console.log(JSON.stringify({ model, results }, null, 2));
