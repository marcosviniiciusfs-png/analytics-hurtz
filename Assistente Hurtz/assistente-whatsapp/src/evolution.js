import { env } from "./config.js";

export class EvolutionClient {
  constructor(fetchImpl = fetch, instance = env.evolutionInstance) {
    this.fetch = fetchImpl;
    this.instance = instance;
  }

  configured() {
    return Boolean(env.evolutionUrl && env.evolutionKey);
  }

  forInstance(instance) {
    return new EvolutionClient(this.fetch, instance);
  }

  requireInstance() {
    if (!this.instance) throw new Error("Nenhuma instância Hurtz selecionada");
    return encodeURIComponent(this.instance);
  }

  async request(path, options = {}) {
    if (!this.configured())
      throw new Error("Evolution API ainda não configurada no .env");
    const response = await this.fetch(`${env.evolutionUrl}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        apikey: env.evolutionKey,
        ...(options.headers || {}),
      },
    });
    const body = await response.text();
    if (!response.ok)
      throw new Error(`Evolution ${response.status}: ${body.slice(0, 300)}`);
    return body ? JSON.parse(body) : {};
  }

  webhookUrl(instance = this.instance) {
    if (!env.publicWebhookUrl)
      throw new Error("PUBLIC_WEBHOOK_URL não configurada");
    const url = new URL(env.publicWebhookUrl);
    if (env.webhookSecret) url.searchParams.set("secret", env.webhookSecret);
    url.searchParams.set("instance", instance);
    return url.toString();
  }

  createInstance(instanceName) {
    return this.request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          enabled: true,
          url: this.webhookUrl(instanceName),
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          base64: true,
        },
      }),
    });
  }

  connectQr() {
    return this.request(`/instance/connect/${this.requireInstance()}`);
  }

  connectionState() {
    return this.request(`/instance/connectionState/${this.requireInstance()}`);
  }

  configureWebhook() {
    return this.request(`/webhook/set/${this.requireInstance()}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: this.webhookUrl(),
          webhookByEvents: false,
          webhookBase64: true,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        },
      }),
    });
  }

  profilePicture(number) {
    return this.request(
      `/chat/fetchProfilePictureUrl/${this.requireInstance()}`,
      {
        method: "POST",
        body: JSON.stringify({ number }),
      },
    );
  }

  sendText(number, text, delay = 0) {
    return this.request(`/message/sendText/${this.requireInstance()}`, {
      method: "POST",
      body: JSON.stringify({
        number,
        textMessage: { text },
        delay,
        linkPreview: true,
      }),
    });
  }

  sendAudio(number, base64Audio) {
    return this.request(
      `/message/sendWhatsAppAudio/${this.requireInstance()}`,
      {
        method: "POST",
        body: JSON.stringify({ number, audio: base64Audio, encoding: true }),
      },
    );
  }

  setChatPresence(number, presence, durationMs = env.minPresenceMs) {
    const delay =
      presence === "paused"
        ? 0
        : Math.max(1000, Math.ceil(Number(durationMs) || env.minPresenceMs));
    return this.request(`/chat/sendPresence/${this.requireInstance()}`, {
      method: "POST",
      body: JSON.stringify({ number, presence, delay }),
    }).catch(() =>
      this.request(`/instance/setPresence/${this.requireInstance()}`, {
        method: "POST",
        body: JSON.stringify({
          presence: presence === "paused" ? "available" : presence,
        }),
      }),
    );
  }
}
