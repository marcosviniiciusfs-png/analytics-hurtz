const intentions = {
  orcamento: ["orçamento", "orcamento", "preço", "preco", "valor", "quanto custa"],
  contato: ["me chama", "whatsapp", "ligar", "contato", "celular", "chama"],
  localizacao: ["moro em", "sou de", "região", "regiao", "cidade", "onde fica"],
  necessidade: ["preciso", "quero", "ajuda", "solucionar", "problema", "indicação", "indicacao"],
  urgencia: ["hoje", "agora", "imediato", "urgente"],
};

const penalties = {
  spam: ["promoção", "promocao", "compre agora", "vendo", "desconto imperdível"],
  negativo: ["não quero", "nao quero", "não preciso", "nao preciso"],
};

export function extractContacts(text = "") {
  const emails = [...new Set(text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [])];
  const phones = [...new Set(text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g) || [])]
    .map((value) => value.trim());
  return { emails, phones };
}

export function classifyIntent(text = "") {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const scores = Object.fromEntries(Object.keys(intentions).map((key) => [key, 0]));
  const evidence = [];
  for (const [intent, terms] of Object.entries(intentions)) {
    for (const term of terms) {
      if (normalized.includes(term)) {
        scores[intent] += 10;
        evidence.push(term);
      }
    }
  }
  let score = Object.values(scores).reduce((sum, value) => sum + value, 0);
  for (const [category, terms] of Object.entries(penalties)) {
    for (const term of terms) {
      if (normalized.includes(term)) {
        score -= 15;
        evidence.push(`penalidade: ${category}`);
      }
    }
  }
  score = Math.max(0, Math.min(100, score));
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return {
    score,
    intention: score > 20 && best?.[1] > 0 ? best[0] : "baixa_intencao",
    evidence: [...new Set(evidence)].slice(0, 8),
    scores,
  };
}

export function normalizeApifyItem(item = {}, sourceUrl = "") {
  const comment = String(item.text || item.comment || item.commentText || item.body || item.caption || "").trim();
  const profileUrl = item.profileUrl || item.ownerProfileUrl || item.authorUrl || item.username_link || "";
  const name = item.ownerFullName || item.authorName || item.author || item.name || item.username || "Desconhecido";
  const publicText = [comment, item.biography, item.bio].filter(Boolean).join("\n");
  const contacts = extractContacts(publicText);
  const intent = classifyIntent(comment);
  return {
    id: crypto.randomUUID(),
    name,
    username: item.username || item.ownerUsername || "",
    profileUrl,
    photoUrl: item.profilePicUrl || item.profilePicture || "",
    comment,
    bio: String(item.biography || item.bio || "").slice(0, 1000),
    emails: contacts.emails,
    phones: contacts.phones,
    gender: "Não informado",
    intention: intent.intention,
    score: intent.score,
    evidence: intent.evidence,
    platform: /instagram/i.test(sourceUrl) ? "Instagram" : /facebook/i.test(sourceUrl) ? "Facebook" : /reddit/i.test(sourceUrl) ? "Reddit" : "Fórum",
    sourceUrl,
    commentedAt: item.timestamp || item.createdAt || item.date || null,
    collectedAt: new Date().toISOString(),
    review: "pending",
  };
}
