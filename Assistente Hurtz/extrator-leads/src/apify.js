const API = "https://api.apify.com/v2";

export async function runActor({ token, actorId, urls = [], input, timeoutMs = 180000 }) {
  if (!token) throw new Error("Configure a API Key da Apify antes de iniciar a coleta.");
  if (!actorId) throw new Error("Actor da Apify não configurado para esta plataforma.");
  const encodedActor = actorId.replace("/", "~");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API}/acts/${encodedActor}/runs?token=${encodeURIComponent(token)}&waitForFinish=120`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input || { startUrls: urls.map((url) => ({ url })), directUrls: urls, resultsLimit: 500 }),
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `Apify respondeu ${response.status}`);
    const datasetId = payload?.data?.defaultDatasetId;
    if (!datasetId) throw new Error("A Apify não retornou um conjunto de resultados.");
    const itemsResponse = await fetch(`${API}/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&clean=true&format=json`, { signal: controller.signal });
    if (!itemsResponse.ok) throw new Error(`Não foi possível baixar os resultados (${itemsResponse.status}).`);
    return itemsResponse.json();
  } finally { clearTimeout(timer); }
}
