function first(...values) {
  return values.find((v) => typeof v === "string" && v.trim()) || "";
}

export function parseEvolutionWebhook(payload) {
  const data = payload?.data || payload;
  const key = data?.key || data?.message?.key || {};
  const message = data?.message || data?.data?.message || {};
  const remote = first(key.remoteJid, data?.remoteJid, data?.sender);
  const contact = remote.replace(/@.+$/, "").replace(/\D/g, "");
  const fromMe = Boolean(key.fromMe ?? data?.fromMe);
  const isGroup = /@g\.us$/.test(remote);
  const externalId = first(key.id, data?.messageId, data?.id);
  const pushName = first(data?.pushName, payload?.senderName);
  const text = first(
    message.conversation,
    message.extendedTextMessage?.text,
    message.imageMessage?.caption,
    message.videoMessage?.caption,
    data?.text,
  );
  const audio = message.audioMessage || null;
  return {
    event: String(payload?.event || payload?.type || "").toUpperCase(),
    contact,
    remote,
    fromMe,
    isGroup,
    externalId,
    pushName,
    format: audio ? "audio" : "text",
    text,
    audioBase64: first(data?.base64, audio?.base64),
  };
}
