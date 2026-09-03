import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import Busboy from "busboy";
import { env, loadAssistant, rootDir, saveAssistant } from "./config.js";
import {
  addManagedInstance,
  addMessage,
  brainNuclei,
  createBrainNucleus,
  deleteBrainNucleus,
  contactAudit,
  conversationFeedback,
  conversationContext,
  conversationMessages,
  conversations,
  dashboard,
  feedbackDashboard,
  getContactStatus,
  isContactActivated,
  isManagedInstance,
  knowledgeDocuments,
  logEvent,
  managedInstances,
  markSeen,
  performanceSummary,
  resetContactActivations,
  recentAudit,
  reviewBrainNode,
  saveConversationContext,
  saveResponseFeedback,
  seen,
  setContactStatus,
  setBrainNucleusActive,
  updateManagedInstance,
  updateManagedInstanceWebhook,
  updateBrainNucleus,
  trainingExamples,
  upsertContact,
} from "./memory.js";
import { parseEvolutionWebhook } from "./webhook-parser.js";
import { extractPdf, ingestPdf, savePdfOriginal } from "./knowledge.js";
import { cloudflareConfigured, testCloudflare } from "./cloudflare.js";
import {
  syncBrainNodes,
  syncBrainNucleus,
  syncContact,
  syncInstance,
  syncMessage,
  syncFeedback,
  deleteBrainNucleusFromCloudflare,
} from "./cloudflare.js";
import { learnBrain, learnBrainDocument } from "./brain-memory.js";

function mirror(promise, type, detail = {}) {
  Promise.resolve(promise).catch((error) =>
    logEvent("cloudflare_sync_error", {
      type,
      ...detail,
      message: error.message,
    }),
  );
}

function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function pdfUpload(req) {
  return new Promise((resolve, reject) => {
    const parser = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: 25 * 1024 * 1024, fields: 5 },
    });
    const chunks = [];
    let filename = "";
    let mime = "";
    let truncated = false;
    parser.on("file", (_field, stream, info) => {
      filename = info.filename;
      mime = info.mimeType;
      stream.on("limit", () => {
        truncated = true;
      });
      stream.on("data", (chunk) => chunks.push(chunk));
    });
    parser.on("error", reject);
    parser.on("finish", () => {
      if (truncated)
        return reject(new Error("O PDF ultrapassa o limite de 25 MB"));
      if (!chunks.length) return reject(new Error("Nenhum PDF foi enviado"));
      if (
        mime !== "application/pdf" &&
        !filename.toLowerCase().endsWith(".pdf")
      )
        return reject(new Error("Envie somente arquivos PDF"));
      resolve({ buffer: Buffer.concat(chunks), filename });
    });
    req.pipe(parser);
  });
}

function authorized(req) {
  if (!env.adminToken)
    return (
      req.socket.remoteAddress === "127.0.0.1" ||
      req.socket.remoteAddress === "::1"
    );
  return req.headers.authorization === `Bearer ${env.adminToken}`;
}

export function createServer({ evolution, debouncer }) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        return json(res, 200, {
          ok: true,
          service: "hurtz-whatsapp",
          version: "1.4.0",
          enabled: loadAssistant().enabled,
          evolutionConfigured: evolution.configured(),
          instance: env.evolutionInstance || null,
        });
      }
      if (req.method === "POST" && url.pathname === "/webhooks/evolution") {
        if (
          env.webhookSecret &&
          url.searchParams.get("secret") !== env.webhookSecret
        )
          return json(res, 401, { error: "webhook não autorizado" });
        const instance = url.searchParams.get("instance") || "";
        if (!isManagedInstance(instance)) {
          logEvent("webhook_rejected", {
            instance,
            reason: "unmanaged_instance",
          });
          return json(res, 403, { error: "instância não pertence ao Hurtz" });
        }
        const event = parseEvolutionWebhook(await body(req));
        if (!event.contact || event.fromMe || seen(event.externalId)) {
          logEvent("webhook_ignored", {
            instance,
            contact: event.contact,
            event: event.event,
            reason: !event.contact
              ? "no_contact"
              : event.fromMe
                ? "from_me"
                : "duplicate",
          });
          return json(res, 202, { ignored: true });
        }
        if (event.isGroup && loadAssistant().ignoreGroups) {
          logEvent("webhook_ignored", {
            instance,
            contact: event.contact,
            reason: "group",
          });
          return json(res, 202, { ignored: "group" });
        }
        event.instance = instance;
        markSeen(event.externalId);
        const memoryContact = `${instance}:${event.contact}`;
        upsertContact(memoryContact, event.pushName);
        if (event.format === "text" && event.text) {
          const inboundRow = addMessage(
            memoryContact,
            "user",
            event.text,
            "text",
            event.externalId || null,
          );
          if (inboundRow)
            mirror(
              syncMessage(memoryContact, {
                id: crypto
                  .createHash("sha256")
                  .update(
                    `${memoryContact}|${inboundRow.id}|${inboundRow.created_at}|user`,
                  )
                  .digest("hex"),
                role: "user",
                content: inboundRow.content,
                format: inboundRow.format,
                externalId: inboundRow.external_id,
                createdAt: inboundRow.created_at,
              }),
              "message",
              { contact: memoryContact },
            );
        }
        logEvent("message_received", {
          instance,
          contact: memoryContact,
          externalId: event.externalId,
          format: event.format,
          preview: String(event.text || "").slice(0, 120),
        });
        const instanceClient = evolution.forInstance(instance);
        if (typeof instanceClient.profilePicture === "function")
          instanceClient
            .profilePicture(event.contact)
            .then((profile) => {
              const profileUrl =
                profile?.profilePictureUrl ||
                profile?.picture ||
                profile?.url ||
                "";
              if (profileUrl)
                upsertContact(memoryContact, event.pushName, profileUrl);
            })
            .catch((error) =>
              logEvent("profile_unavailable", {
                instance,
                contact: memoryContact,
                message: error.message,
              }),
            );
        mirror(
          syncContact(memoryContact, {
            pushName: event.pushName,
            mode: getContactStatus(memoryContact),
          }),
          "contact",
          { contact: memoryContact },
        );
        if (getContactStatus(memoryContact) === "bot") {
          debouncer.push(memoryContact, event);
          logEvent("message_queued", {
            instance,
            contact: memoryContact,
            debounceMs: env.debounceMs,
          });
        } else {
          logEvent("message_waiting_human", {
            instance,
            contact: memoryContact,
          });
        }
        return json(res, 202, { accepted: true });
      }
      if (url.pathname.startsWith("/api/") && !authorized(req))
        return json(res, 401, { error: "não autorizado" });

      if (req.method === "GET" && url.pathname === "/api/status")
        return json(res, 200, {
          assistant: loadAssistant(),
          env: {
            evolutionConfigured: evolution.configured(),
            geminiConfigured: Boolean(env.geminiKey),
            cloudflareConfigured: cloudflareConfigured(),
            ollamaModel: env.ollamaModel,
            publicWebhookUrl: env.publicWebhookUrl,
          },
          instances: managedInstances(),
          dashboard: dashboard(),
          feedback: feedbackDashboard(),
          performance: performanceSummary(),
          audit: recentAudit(),
        });

      if (req.method === "PUT" && url.pathname === "/api/assistant") {
        const input = await body(req);
        const triggers = Array.isArray(input.triggerKeywords)
          ? input.triggerKeywords
              .map(String)
              .map((item) => item.trim())
              .filter(Boolean)
          : [];
        if (input.triggerEnabled && !triggers.length)
          return json(res, 400, {
            error: "Adicione pelo menos uma palavra ou frase gatilho",
          });
        const before = loadAssistant();
        const saved = saveAssistant({ ...input, triggerKeywords: triggers });
        const triggerChanged =
          Boolean(before.triggerEnabled) !== Boolean(saved.triggerEnabled) ||
          before.triggerMatchMode !== saved.triggerMatchMode ||
          JSON.stringify(before.triggerKeywords || []) !==
            JSON.stringify(saved.triggerKeywords || []);
        const resetContacts = triggerChanged ? resetContactActivations() : 0;
        logEvent("assistant_saved", {
          triggerEnabled: saved.triggerEnabled,
          triggerCount: saved.triggerKeywords.length,
          resetContacts,
        });
        return json(res, 200, { assistant: saved, resetContacts });
      }

      if (req.method === "PUT" && url.pathname === "/api/runtime/webhook") {
        const value = String((await body(req)).url || "").trim();
        const parsed = new URL(value);
        if (
          parsed.protocol !== "https:" ||
          parsed.pathname !== "/webhooks/evolution"
        )
          return json(res, 400, { error: "URL pública do webhook inválida" });
        env.publicWebhookUrl = parsed.toString();
        return json(res, 200, { configured: true, host: parsed.host });
      }

      if (req.method === "GET" && url.pathname === "/api/knowledge")
        return json(res, 200, { documents: knowledgeDocuments() });

      if (req.method === "GET" && url.pathname === "/api/brain/nuclei")
        return json(res, 200, { nuclei: brainNuclei() });

      if (req.method === "POST" && url.pathname === "/api/brain/nuclei") {
        const input = await body(req);
        const name = String(input.name || "")
          .trim()
          .slice(0, 80);
        const instructions = String(input.instructions || "").trim();
        if (!name || instructions.length < 10)
          return json(res, 400, {
            error:
              "Informe o nome e pelo menos 10 caracteres de instruções invioláveis",
          });
        const nucleus = createBrainNucleus({
          id: crypto.randomUUID(),
          name,
          instructions,
        });
        mirror(syncBrainNucleus(nucleus), "brain_nucleus", {
          nucleusId: nucleus.id,
        });
        logEvent("brain_nucleus_created", { nucleusId: nucleus.id, name });
        return json(res, 201, { nucleus });
      }

      const nucleusMatch = url.pathname.match(
        /^\/api\/brain\/nuclei\/([^/]+)$/,
      );
      if (req.method === "PATCH" && nucleusMatch) {
        const nucleusId = decodeURIComponent(nucleusMatch[1]);
        const input = await body(req);
        const name = String(input.name || "").trim();
        if (name.length < 2)
          return json(res, 400, {
            error: "O nome do núcleo precisa ter pelo menos 2 caracteres",
          });
        const nucleus = updateBrainNucleus(nucleusId, { name });
        if (!nucleus) return json(res, 404, { error: "Núcleo não encontrado" });
        mirror(syncBrainNucleus(nucleus), "brain_nucleus_updated", {
          nucleusId,
        });
        logEvent("brain_nucleus_updated", { nucleusId, name });
        return json(res, 200, { nucleus });
      }
      if (req.method === "DELETE" && nucleusMatch) {
        const nucleusId = decodeURIComponent(nucleusMatch[1]);
        const nucleus = deleteBrainNucleus(nucleusId);
        if (!nucleus) return json(res, 404, { error: "Núcleo não encontrado" });
        mirror(
          deleteBrainNucleusFromCloudflare(nucleusId),
          "brain_nucleus_deleted",
          { nucleusId },
        );
        logEvent("brain_nucleus_deleted", {
          nucleusId,
          name: nucleus.name,
        });
        return json(res, 200, { removed: true, nucleus });
      }

      const activateNucleusMatch = url.pathname.match(
        /^\/api\/brain\/nuclei\/([^/]+)\/activation$/,
      );
      if (req.method === "PUT" && activateNucleusMatch) {
        const nucleusId = decodeURIComponent(activateNucleusMatch[1]);
        const input = await body(req);
        const nucleus = setBrainNucleusActive(nucleusId, Boolean(input.active));
        if (!nucleus) return json(res, 404, { error: "Núcleo não encontrado" });
        const nuclei = brainNuclei();
        nuclei.forEach((item) =>
          mirror(syncBrainNucleus(item), "brain_nucleus_activation", {
            nucleusId: item.id,
          }),
        );
        logEvent("brain_nucleus_activation", {
          nucleusId,
          active: nucleus.status === "active",
        });
        return json(res, 200, { nucleus, nuclei });
      }

      const learnMatch = url.pathname.match(
        /^\/api\/brain\/nuclei\/([^/]+)\/learn$/,
      );
      if (req.method === "POST" && learnMatch) {
        const nucleusId = decodeURIComponent(learnMatch[1]);
        const input = await body(req);
        const nodes = await learnBrain(nucleusId, input.content);
        mirror(syncBrainNodes(nodes), "brain_nodes", { nucleusId });
        logEvent("brain_learned", { nucleusId, nodes: nodes.length });
        return json(res, 201, { nodes });
      }

      const learnPdfMatch = url.pathname.match(
        /^\/api\/brain\/nuclei\/([^/]+)\/learn-pdf$/,
      );
      if (req.method === "POST" && learnPdfMatch) {
        const nucleusId = decodeURIComponent(learnPdfMatch[1]);
        const upload = await pdfUpload(req);
        const { document, chunks } = await extractPdf(
          upload.buffer,
          upload.filename,
        );
        savePdfOriginal(upload.buffer, document.id);
        const learned = await learnBrainDocument(nucleusId, document, chunks);
        const nodes = [...learned.factualNodes, ...learned.inferredNodes];
        mirror(syncBrainNodes(nodes), "brain_pdf_nodes", {
          nucleusId,
          documentId: document.id,
        });
        logEvent("brain_pdf_learned", {
          nucleusId,
          documentId: document.id,
          filename: document.filename,
          factualNodes: learned.factualNodes.length,
          inferredNodes: learned.inferredNodes.length,
        });
        return json(res, 201, {
          document,
          factualNodes: 1,
          internalSections: learned.factualNodes.length - 1,
          inferredNodes: learned.inferredNodes.length,
        });
      }

      const reviewMatch = url.pathname.match(
        /^\/api\/brain\/nodes\/([^/]+)\/review$/,
      );
      if (req.method === "PATCH" && reviewMatch) {
        const input = await body(req);
        const status = input.status === "approved" ? "approved" : "pending";
        const node = reviewBrainNode(
          decodeURIComponent(reviewMatch[1]),
          status,
        );
        if (!node)
          return json(res, 404, { error: "Conhecimento não encontrado" });
        mirror(syncBrainNodes([node]), "brain_node_review", {
          nodeId: node.id,
        });
        return json(res, 200, { node });
      }

      if (req.method === "GET" && url.pathname === "/api/conversations")
        return json(res, 200, { conversations: conversations() });

      const conversationMatch = url.pathname.match(
        /^\/api\/conversations\/([^/]+)\/messages$/,
      );
      if (req.method === "GET" && conversationMatch) {
        const contact = decodeURIComponent(conversationMatch[1]);
        return json(res, 200, {
          contact,
          status: getContactStatus(contact),
          aiActivated: isContactActivated(contact),
          context: conversationContext(contact),
          feedback: conversationFeedback(contact),
          messages: conversationMessages(contact),
          audit: contactAudit(contact),
        });
      }

      const contextMatch = url.pathname.match(
        /^\/api\/conversations\/([^/]+)\/context$/,
      );
      if (req.method === "PUT" && contextMatch) {
        const contact = decodeURIComponent(contextMatch[1]);
        const input = await body(req);
        const context = saveConversationContext(contact, input);
        mirror(
          syncContact(contact, {
            summary: context.summary,
            metadata: {
              profile: context.profile,
              nextSteps: context.nextSteps,
            },
          }),
          "conversation_context_manual",
          { contact },
        );
        logEvent("conversation_context_updated", { contact });
        return json(res, 200, { context });
      }

      const feedbackMatch = url.pathname.match(
        /^\/api\/conversations\/([^/]+)\/feedback$/,
      );
      if (req.method === "POST" && feedbackMatch) {
        const contact = decodeURIComponent(feedbackMatch[1]);
        const input = await body(req);
        const rating = input.rating === "good" ? "good" : "bad";
        if (!Number.isInteger(Number(input.messageId)))
          return json(res, 400, { error: "Mensagem inválida" });
        if (
          rating === "bad" &&
          !String(input.note || "").trim() &&
          !String(input.idealResponse || "").trim()
        )
          return json(res, 400, {
            error: "Explique o problema ou escreva a resposta ideal",
          });
        const feedback = saveResponseFeedback({
          contact,
          messageId: Number(input.messageId),
          rating,
          reason: input.reason,
          note: input.note,
          idealResponse: input.idealResponse,
        });
        if (!feedback)
          return json(res, 404, {
            error: "Resposta da IA não encontrada nesta conversa",
          });
        mirror(syncFeedback(feedback), "response_feedback", {
          contact,
          feedbackId: feedback.id,
        });
        logEvent("response_feedback_saved", {
          contact,
          messageId: feedback.message_id,
          rating: feedback.rating,
          reason: feedback.reason,
        });
        return json(res, 200, {
          feedback,
          dashboard: feedbackDashboard(),
        });
      }

      if (req.method === "GET" && url.pathname === "/api/feedback/export") {
        const lines = trainingExamples().map((item) => JSON.stringify(item));
        res.writeHead(200, {
          "content-type": "application/x-ndjson; charset=utf-8",
          "content-disposition":
            'attachment; filename="hurtz-feedback-training.jsonl"',
        });
        return res.end(`${lines.join("\n")}${lines.length ? "\n" : ""}`);
      }

      if (req.method === "POST" && url.pathname === "/api/knowledge") {
        const upload = await pdfUpload(req);
        const document = await ingestPdf(upload.buffer, upload.filename);
        logEvent("knowledge_pdf_ingested", {
          id: document.id,
          filename: document.filename,
          chunks: document.chunks,
        });
        return json(res, 201, { document });
      }

      if (req.method === "GET" && url.pathname === "/api/cloudflare/status")
        return json(res, 200, await testCloudflare());

      if (req.method === "POST" && url.pathname === "/api/instances") {
        const input = await body(req);
        const label = String(input.label || "WhatsApp Hurtz")
          .trim()
          .slice(0, 60);
        const slug =
          label
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 28) || "whatsapp";
        const name = `hurtz-${slug}-${crypto.randomBytes(3).toString("hex")}`;
        const created = await evolution.createInstance(name);
        addManagedInstance(
          name,
          label,
          created.instance?.status || "connecting",
        );
        mirror(
          syncInstance({
            name,
            label,
            status: created.instance?.status || "connecting",
          }),
          "instance",
          { name },
        );
        logEvent("managed_instance_created", { name, label });
        return json(res, 201, {
          instance: {
            name,
            label,
            status: created.instance?.status || "connecting",
          },
          qr: created.qrcode?.base64 || null,
        });
      }

      const instanceMatch = url.pathname.match(
        /^\/api\/instances\/([^/]+)\/(qr|status|webhook)$/,
      );
      if (instanceMatch) {
        const name = decodeURIComponent(instanceMatch[1]);
        const action = instanceMatch[2];
        if (!isManagedInstance(name))
          return json(res, 404, { error: "instância Hurtz não encontrada" });
        const client = evolution.forInstance(name);
        if (req.method === "GET" && action === "qr") {
          const result = await client.connectQr();
          return json(res, 200, {
            qr: result.base64 || result.qrcode?.base64 || null,
            pairingCode: result.pairingCode || null,
          });
        }
        if (req.method === "GET" && action === "status") {
          const result = await client.connectionState();
          const state = result.instance?.state || result.state || "unknown";
          updateManagedInstance(name, state);
          const local = managedInstances().find((item) => item.name === name);
          mirror(
            syncInstance({ name, label: local?.label || name, status: state }),
            "instance",
            { name },
          );
          return json(res, 200, { name, state });
        }
        if (req.method === "POST" && action === "webhook") {
          try {
            const result = await client.configureWebhook();
            updateManagedInstanceWebhook(name, "active");
            logEvent("webhook_configured", { instance: name });
            return json(res, 200, {
              configured: true,
              instance: name,
              result,
            });
          } catch (error) {
            updateManagedInstanceWebhook(name, "error");
            logEvent("webhook_configuration_failed", {
              instance: name,
              message: error.message,
            });
            throw error;
          }
        }
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/contacts/")) {
        const [, , , contact, action] = url.pathname.split("/");
        const decodedContact = decodeURIComponent(contact || "");
        if (!decodedContact || !["bot", "human"].includes(action))
          return json(res, 400, { error: "ação inválida" });
        setContactStatus(decodedContact, action);
        mirror(syncContact(decodedContact, { mode: action }), "contact", {
          contact: decodedContact,
        });
        logEvent("contact_mode", { contact: decodedContact, action });
        return json(res, 200, {
          contact: decodedContact,
          status: getContactStatus(decodedContact),
          aiActivated: isContactActivated(decodedContact),
        });
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/" || url.pathname === "/index.html")
      ) {
        const html = fs.readFileSync(
          path.join(rootDir, "public", "index.html"),
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(html);
      }
      if (
        req.method === "GET" &&
        ["/app.js", "/brain-graph.js", "/brain-map.js"].includes(url.pathname)
      ) {
        const js = fs.readFileSync(
          path.join(rootDir, "public", path.basename(url.pathname)),
        );
        res.writeHead(200, {
          "content-type": "text/javascript; charset=utf-8",
        });
        return res.end(js);
      }
      if (req.method === "GET" && url.pathname === "/styles.css") {
        const css = fs.readFileSync(path.join(rootDir, "public", "styles.css"));
        res.writeHead(200, { "content-type": "text/css; charset=utf-8" });
        return res.end(css);
      }
      if (
        req.method === "GET" &&
        url.pathname === "/assets/brain-lateral-public-domain.svg"
      ) {
        const svg = fs.readFileSync(
          path.join(
            rootDir,
            "public",
            "assets",
            "brain-lateral-public-domain.svg",
          ),
        );
        res.writeHead(200, {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "public, max-age=3600",
        });
        return res.end(svg);
      }
      json(res, 404, { error: "não encontrado" });
    } catch (error) {
      logEvent("http_error", { path: url.pathname, message: error.message });
      json(res, 500, { error: error.message });
    }
  });
}
