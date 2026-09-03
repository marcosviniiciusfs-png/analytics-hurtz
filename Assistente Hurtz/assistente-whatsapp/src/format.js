export function decideFormat(answer, inboundFormat, assistant) {
  if (assistant.responseMode === "text") return "text";
  if (assistant.responseMode === "audio") return "audio";
  if (inboundFormat === "audio" && assistant.audioReplyToAudio) return "audio";
  const sentences = String(answer)
    .split(/[.!?]+/)
    .filter((x) => x.trim()).length;
  const explanatory =
    /\b(passo|primeiro|depois|funciona|porque|explicar|detalh)\b/i.test(answer);
  return answer.length > 360 || sentences >= 4 || explanatory
    ? "audio"
    : "text";
}

export function normalizeOutgoingText(text) {
  return String(text || "")
    .replace(/[‐‑‒–—―-]+/g, " ")
    .replace(/^\s*[•*]+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitBubbles(text, max = 200) {
  const clean = normalizeOutgoingText(text);
  const safeMax = Math.min(200, Math.max(40, Number(max) || 200));
  if (clean.length <= safeMax) return clean ? [clean] : [];
  const parts = clean.split(/(?<=[.!?])\s+|\n+/);
  const result = [];
  let current = "";
  for (const part of parts) {
    if (part.length > safeMax) {
      if (current) {
        result.push(current.trim());
        current = "";
      }
      const words = part.split(/\s+/);
      let fragment = "";
      for (const word of words) {
        const candidate = fragment ? `${fragment} ${word}` : word;
        if (candidate.length > safeMax && fragment) {
          result.push(fragment.trim());
          fragment = word;
        } else fragment = candidate;
      }
      current = fragment;
    } else if (current && `${current} ${part}`.length > safeMax) {
      result.push(current.trim());
      current = part;
    } else current = current ? `${current} ${part}` : part;
  }
  if (current.trim()) result.push(current.trim());
  return result.flatMap((item) => {
    if (item.length <= safeMax) return [item];
    const fragments = [];
    for (let index = 0; index < item.length; index += safeMax)
      fragments.push(item.slice(index, index + safeMax).trim());
    return fragments.filter(Boolean);
  });
}

export function shouldTransfer(text, assistant) {
  const normalized = String(text).toLowerCase();
  return assistant.humanTransferKeywords.some((word) =>
    normalized.includes(String(word).toLowerCase()),
  );
}

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function matchesTrigger(text, assistant) {
  const incoming = normalize(text);
  const keywords = Array.isArray(assistant.triggerKeywords)
    ? assistant.triggerKeywords.map(normalize).filter(Boolean)
    : [];
  if (!incoming || !keywords.length) return false;
  return assistant.triggerMatchMode === "exact"
    ? keywords.some((keyword) => incoming === keyword)
    : keywords.some((keyword) => incoming.includes(keyword));
}
