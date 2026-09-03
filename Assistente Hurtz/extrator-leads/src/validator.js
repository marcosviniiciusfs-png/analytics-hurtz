const stopWords = new Set("a o as os de da do das dos e em no na nos nas para por com sem um uma que se eu meu minha meus minhas isso isto esse essa nao não mais muito como qual quero preciso consigo conseguir".split(" "));
const needSignals = ["preciso", "quero", "não consigo", "nao consigo", "estou tentando", "tentante", "tenho dificuldade", "alguém indica", "alguem indica", "quanto custa", "valor", "orçamento", "orcamento", "me ajuda", "sofro com", "meu problema", "minha situação", "minha situacao"];
const weakOnly = /^(?:lindo|amei|adorei|parabéns|parabens|top|show|verdade|sim|não|nao|obrigad[oa]|👏|❤️|😍|🙏|🔥|😂|\s|[.!?])+$/iu;

function normalized(value = "") { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function tokens(value = "") { return [...new Set(normalized(value).split(" ").filter((word) => word.length >= 4 && !stopWords.has(word)))]; }

const portugueseMarkers = new Set("para como uma nao não que com por sobre você voce seu sua seus suas mais muito essa esse isso estou tenho precisa quero conseguir ajuda tratamento preço preco valor onde quando porque também tambem dos das nos nas meu minha".split(" ").map(normalized));
export function looksPortuguese(value = "") {
  const words = normalized(value).split(" ").filter(Boolean); if (!words.length) return false;
  const markers = words.filter((word) => portugueseMarkers.has(word)).length;
  return markers >= 2 || /[áàâãéêíóôõúç]/i.test(value) || /\b(não|você|também|estou|tenho|preciso|quero)\b/i.test(value);
}

export function lexicalPostValidation(post, terms = [], criteria = "") {
  const content = `${post.title || ""} ${post.summary || ""}`; const text = normalized(content);
  const groups = terms.map((term) => ({ phrase: normalized(term), words: tokens(term) }));
  const direct = groups.some((group) => group.phrase.length > 4 && text.includes(group.phrase));
  const overlaps = groups.map((group) => group.words.filter((word) => text.includes(word)).length);
  const strongest = Math.max(0, ...overlaps); const criteriaMatches = tokens(criteria).filter((word) => text.includes(word));
  const languageOk = looksPortuguese(content); const commentsOk = Number(post.commentCount) > 0;
  const relevanceScore = Math.min(100, (direct ? 65 : 0) + strongest * 25 + criteriaMatches.length * 5);
  const relevant = direct || strongest >= 2 || (strongest >= 1 && criteriaMatches.length >= 2);
  return { eligible: languageOk && commentsOk && relevant && relevanceScore >= 55, relevanceScore, languageOk, commentsOk, reason: !languageOk ? "Publicação fora do português do Brasil." : !commentsOk ? "Publicação sem comentários públicos confirmados." : !relevant ? "Assunto sem relação suficiente com os termos." : "Publicação relacionada e com comentários disponíveis.", method: "lexical" };
}

export async function validatePostsWithOllama(posts, { terms = [], criteria = "", url = "http://127.0.0.1:11434", model = "llama3.2:3b", timeoutMs = 20000 } = {}) {
  const prevalidated = posts.map((post) => lexicalPostValidation(post, terms, criteria)); if (!posts.length) return [];
  const eligibleIndexes = prevalidated.map((value, index) => value.languageOk && value.commentsOk ? index : -1).filter((index) => index >= 0);
  if (!eligibleIndexes.length) return prevalidated;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  const prompt = `Valide publicações públicas para pesquisa de leads. Termos: ${terms.join(" | ")}. Critérios: ${criteria || "relação direta com os termos"}. Aprove somente se o assunto estiver claramente relacionado, estiver em português do Brasil e fizer sentido procurar nos comentários pessoas com essa necessidade. Responda SOMENTE JSON: {"results":[{"id":"...","eligible":true,"relevanceScore":0,"reason":"curta"}]}.
${eligibleIndexes.map((index) => `${posts[index].id}: ${JSON.stringify(`${posts[index].title} ${posts[index].summary}`)}`).join("\n")}`;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, stream: false, format: "json", options: { temperature: 0 }, messages: [{ role: "user", content: prompt }] }), signal: controller.signal });
    if (!response.ok) throw new Error("Ollama indisponível"); const payload = await response.json(); const parsed = JSON.parse(payload?.message?.content || "{}"); const map = new Map((parsed.results || []).map((item) => [String(item.id), item]));
    return posts.map((post, index) => { const base = prevalidated[index]; if (!base.languageOk || !base.commentsOk) return base; const ai = map.get(String(post.id)); if (!ai) return base; const score = Math.max(0, Math.min(100, Number(ai.relevanceScore || 0))); return { ...base, eligible: Boolean(ai.eligible) && score >= 65, relevanceScore: score, reason: String(ai.reason || base.reason).slice(0, 240), method: "ollama" }; });
  } catch { return prevalidated; } finally { clearTimeout(timer); }
}

export function lexicalValidation(comment, terms = [], criteria = "") {
  const text = normalized(comment); const termTokens = tokens(terms.join(" ")); const criteriaTokens = tokens(criteria);
  const matches = termTokens.filter((word) => text.includes(word));
  const criteriaMatches = criteriaTokens.filter((word) => text.includes(word));
  const directPhrase = terms.some((term) => normalized(term).length > 5 && text.includes(normalized(term)));
  const personalNeed = needSignals.some((signal) => text.includes(normalized(signal)));
  const tooWeak = text.length < 12 || weakOnly.test(comment.trim());
  let relevanceScore = Math.min(100, matches.length * 18 + criteriaMatches.length * 8 + (directPhrase ? 35 : 0) + (personalNeed ? 25 : 0));
  if (tooWeak) relevanceScore = 0;
  const eligible = !tooWeak && ((directPhrase && personalNeed) || matches.length >= 2 || (matches.length >= 1 && personalNeed) || criteriaMatches.length >= 2 || (criteriaMatches.length >= 1 && personalNeed));
  return { eligible, relevanceScore, reason: tooWeak ? "Comentário genérico ou curto demais." : eligible ? "Há relação com o tema e sinal de necessidade ou interesse." : "Não há evidência suficiente de relação e intenção pessoal.", matchedTerms: [...new Set([...matches, ...criteriaMatches])].slice(0, 8), method: "lexical" };
}

export async function validateWithOllama(candidates, { terms = [], criteria = "", url = "http://127.0.0.1:11434", model = "llama3.2:3b", timeoutMs = 20000 } = {}) {
  if (!candidates.length) return [];
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  const prompt = `Você valida leads encontrados em comentários públicos. Termos da pesquisa: ${terms.join(" | ")}. Critérios adicionais do usuário: ${criteria || "Nenhum"}.
Um lead válido precisa falar de si, de uma necessidade, dificuldade, desejo, procura, preço, indicação ou intenção relacionada ao tema. Rejeite elogios genéricos, emojis, marcações, spam, pessoas apenas dando conselho e comentários sem relação clara.
Responda SOMENTE JSON válido no formato {"results":[{"id":"...","eligible":true,"relevanceScore":0,"reason":"frase curta"}]}. Avalie:
${candidates.map((item) => `${item.id}: ${JSON.stringify(item.comment)}`).join("\n")}`;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, stream: false, format: "json", options: { temperature: 0 }, messages: [{ role: "user", content: prompt }] }), signal: controller.signal });
    if (!response.ok) throw new Error(`Ollama respondeu ${response.status}`);
    const payload = await response.json(); const parsed = JSON.parse(payload?.message?.content || "{}"); const map = new Map((parsed.results || []).map((item) => [String(item.id), item]));
    return candidates.map((candidate) => { const ai = map.get(String(candidate.id)); if (!ai) return candidate.validation; const relevanceScore = Math.max(0, Math.min(100, Number(ai.relevanceScore || 0))); const hardReject = candidate.validation.relevanceScore === 0 && /genérico|curto/i.test(candidate.validation.reason); return { eligible: !hardReject && Boolean(ai.eligible) && relevanceScore >= 55, relevanceScore, reason: String(ai.reason || candidate.validation.reason).slice(0, 240), matchedTerms: candidate.validation.matchedTerms, method: "ollama" }; });
  } catch { return candidates.map((candidate) => candidate.validation); }
  finally { clearTimeout(timer); }
}
