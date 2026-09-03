import crypto from "node:crypto";
import { env, loadAssistant } from "./config.js";
import { answerWithOllama } from "./brain.js";
import {
  decideFormat,
  matchesTrigger,
  normalizeOutgoingText,
  shouldTransfer,
  splitBubbles,
} from "./format.js";
import {
  addMessage,
  contextHistory,
  conversationContext,
  getContactStatus,
  isContactActivated,
  logEvent,
  savePerformanceMetric,
  setContactActivated,
  setContactStatus,
} from "./memory.js";
import { refreshConversationContext } from "./context-memory.js";
import {
  humanPresence,
  pauseBetweenBubbles,
  startLivePresence,
  stopLivePresence,
} from "./presence.js";
import {
  beginGeneration,
  endGeneration,
  scheduleContextWork,
} from "./context-worker.js";
import { synthesizeSpeech, toWhatsAppVoice, transcribeAudio } from "./audio.js";
import { syncContact, syncMessage } from "./cloudflare.js";

function mirror(promise, type, detail = {}) {
  Promise.resolve(promise).catch((error) =>
    logEvent("cloudflare_sync_error", {
      type,
      ...detail,
      message: error.message,
    }),
  );
}

function mirrorMessage(contact, row) {
  if (!row) return;
  const id = crypto
    .createHash("sha256")
    .update(`${contact}|${row.id}|${row.created_at}|${row.role}`)
    .digest("hex");
  mirror(
    syncMessage(contact, {
      id,
      role: row.role,
      content: row.content,
      format: row.format,
      externalId: row.external_id,
      createdAt: row.created_at,
    }),
    "message",
    { contact },
  );
}

export class Orchestrator {
  constructor(evolution, dependencies = {}) {
    this.evolution = evolution;
    this.answer = dependencies.answer || answerWithOllama;
    this.transcribe = dependencies.transcribe || transcribeAudio;
    this.synthesize = dependencies.synthesize || synthesizeSpeech;
    this.convertVoice = dependencies.convertVoice || toWhatsAppVoice;
    this.presence = dependencies.presence || humanPresence;
    this.startPresence = dependencies.startPresence || startLivePresence;
    this.stopPresence = dependencies.stopPresence || stopLivePresence;
    this.bubblePause = dependencies.bubblePause || pauseBetweenBubbles;
  }

  refreshContext(contact) {
    scheduleContextWork(contact, async () => {
      try {
        const context = await refreshConversationContext(contact);
        mirror(
          syncContact(contact, {
            summary: context.summary,
            metadata: {
              profile: context.profile,
              nextSteps: context.nextSteps,
            },
          }),
          "conversation_context",
          { contact },
        );
      } catch (error) {
        logEvent("context_refresh_failed", { contact, message: error.message });
      }
    });
  }

  async process(contact, items, options = {}) {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    const metrics = {
      contact,
      requestId,
      inputFormat: "text",
      outputFormat: "text",
      transcriptionMs: 0,
      ragMs: 0,
      generationMs: 0,
      ttsMs: 0,
      sendMs: 0,
      firstResponseMs: 0,
      status: "ok",
      error: "",
    };
    const instance = items[0]?.instance || "";
    const evolution = instance
      ? this.evolution.forInstance(instance)
      : this.evolution;
    const memoryContact = instance ? `${instance}:${contact}` : contact;
    metrics.contact = memoryContact;
    const finishMetrics = (status = metrics.status, error = metrics.error) => {
      metrics.status = status;
      metrics.error = error;
      metrics.totalMs = performance.now() - startedAt;
      savePerformanceMetric(metrics);
      logEvent("performance_measured", { ...metrics });
    };
    const assistant = loadAssistant();
    if (!assistant.enabled) {
      logEvent("assistant_disabled", { instance, contact: memoryContact });
      return;
    }
    if (getContactStatus(memoryContact) === "human") return;
    logEvent("processing_started", { instance, contact: memoryContact });

    const resolved = [];
    const transcriptionStarted = performance.now();
    for (const item of items) {
      if (item.format === "audio") {
        if (!item.audioBase64) {
          await evolution.sendText(
            contact,
            "Recebi seu áudio, mas não consegui abrir a mídia. Pode me mandar em texto?",
          );
          return;
        }
        resolved.push(await this.transcribe(item.audioBase64));
      } else if (item.text) resolved.push(item.text);
    }
    metrics.transcriptionMs = performance.now() - transcriptionStarted;
    const incoming = resolved.filter(Boolean).join("\n");
    if (!incoming) return;
    // A mensagem atual é adicionada depois desta leitura para não aparecer
    // duas vezes no prompt (histórico + mensagem corrente).
    const recentHistory = contextHistory(
      memoryContact,
      assistant.maxHistoryMessages,
      assistant.maxContextCharacters || 9000,
    );
    const inboundFormat = items.some((x) => x.format === "audio")
      ? "audio"
      : "text";
    metrics.inputFormat = inboundFormat;
    const inboundExternalId =
      items.length === 1 ? items[0]?.externalId || null : null;
    mirrorMessage(
      memoryContact,
      addMessage(
        memoryContact,
        "user",
        incoming,
        inboundFormat,
        inboundExternalId,
      ),
    );

    if (assistant.triggerEnabled && !isContactActivated(memoryContact)) {
      if (!matchesTrigger(incoming, assistant)) {
        logEvent("trigger_waiting", { instance, contact });
        return;
      }
      setContactActivated(memoryContact, true);
      mirror(
        syncContact(memoryContact, { mode: "bot", aiActivated: true }),
        "contact",
        { contact: memoryContact },
      );
      logEvent("trigger_activated", { instance, contact });
    }

    if (shouldTransfer(incoming, assistant)) {
      setContactStatus(memoryContact, "human");
      mirror(syncContact(memoryContact, { mode: "human" }), "contact", {
        contact: memoryContact,
      });
      await this.presence(
        evolution,
        contact,
        assistant.humanTransferMessage,
        "text",
      );
      await evolution.sendText(contact, assistant.humanTransferMessage);
      mirrorMessage(
        memoryContact,
        addMessage(memoryContact, "assistant", assistant.humanTransferMessage),
      );
      logEvent("human_transfer", { instance, contact });
      return;
    }

    await this.startPresence(evolution, contact, "composing");
    logEvent("presence_started", {
      instance,
      contact: memoryContact,
      state: "composing",
      phase: "processing",
    });
    let answer;
    const generationStarted = performance.now();
    beginGeneration();
    try {
      answer = await this.answer(
        incoming,
        recentHistory,
        assistant,
        conversationContext(memoryContact),
        {
          signal: options.signal,
          onMetric: (name, duration) => {
            if (name === "rag") metrics.ragMs = duration;
          },
        },
      );
      metrics.generationMs = Math.max(
        0,
        performance.now() - generationStarted - metrics.ragMs,
      );
      logEvent("answer_generated", {
        instance,
        contact: memoryContact,
        characters: String(answer).length,
      });
    } catch (error) {
      metrics.generationMs = Math.max(
        0,
        performance.now() - generationStarted - metrics.ragMs,
      );
      if (options.signal?.aborted || error.name === "AbortError") {
        await this.stopPresence(evolution, contact);
        logEvent("generation_cancelled", {
          instance,
          contact: memoryContact,
        });
        finishMetrics("cancelled", "Substituída por uma mensagem mais recente");
        return;
      }
      logEvent("brain_error", { instance, contact, message: error.message });
      metrics.status = error.name === "TimeoutError" ? "timeout" : "fallback";
      metrics.error = error.message;
      answer = assistant.unknownAnswer;
    } finally {
      endGeneration();
    }
    answer = normalizeOutgoingText(answer);
    const format = decideFormat(answer, inboundFormat, assistant);
    metrics.outputFormat = format;

    if (format === "audio") {
      try {
        await this.startPresence(evolution, contact, "recording");
        const ttsStarted = performance.now();
        const generated = await this.synthesize(answer);
        const audio = await this.convertVoice(generated);
        metrics.ttsMs = performance.now() - ttsStarted;
        if (options.signal?.aborted) {
          await this.stopPresence(evolution, contact);
          finishMetrics(
            "cancelled",
            "Substituída por uma mensagem mais recente",
          );
          return;
        }
        const sendStarted = performance.now();
        await evolution.sendAudio(contact, audio.base64);
        metrics.sendMs = performance.now() - sendStarted;
        metrics.firstResponseMs = performance.now() - startedAt;
        await this.stopPresence(evolution, contact);
        mirrorMessage(
          memoryContact,
          addMessage(memoryContact, "assistant", answer, "audio"),
        );
        logEvent("response_sent", {
          instance,
          contact: memoryContact,
          format: "audio",
        });
        this.refreshContext(memoryContact);
        finishMetrics();
        return;
      } catch (error) {
        logEvent("tts_fallback_text", {
          instance,
          contact,
          message: error.message,
        });
        await this.startPresence(evolution, contact, "composing");
        metrics.outputFormat = "text";
      }
    }

    const bubbles = splitBubbles(
      answer,
      Math.min(200, Number(assistant.maxTextBubbleChars) || 200),
    );
    const sendStarted = performance.now();
    for (let index = 0; index < bubbles.length; index += 1) {
      const bubble = bubbles[index];
      if (options.signal?.aborted) {
        await this.stopPresence(evolution, contact);
        finishMetrics("cancelled", "Substituída por uma mensagem mais recente");
        return;
      }
      await evolution.sendText(contact, bubble);
      if (!metrics.firstResponseMs)
        metrics.firstResponseMs = performance.now() - startedAt;
      if (index < bubbles.length - 1) await this.bubblePause();
    }
    metrics.sendMs = performance.now() - sendStarted;
    await this.stopPresence(evolution, contact);
    mirrorMessage(
      memoryContact,
      addMessage(memoryContact, "assistant", answer, "text"),
    );
    logEvent("response_sent", {
      instance,
      contact: memoryContact,
      format: "text",
    });
    this.refreshContext(memoryContact);
    finishMetrics();
  }
}
