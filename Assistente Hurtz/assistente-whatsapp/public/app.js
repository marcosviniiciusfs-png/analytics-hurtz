const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem("hurtzToken") || "";
let currentQrInstance = "";
let statusTimer = null;
let activeConversation = "";
let triggerGateEnabled = false;
let configDirty = false;
let renderedConversation = "";
let renderedMessageCount = 0;
let activeNucleus = "";
let brainData = [];
let brainMemoriesOpen = false;
let editingNucleus = "";
let feedbackReviewMode = false;
let feedbackTargetMessage = null;
let feedbackRating = "good";

const pageNames = {
  overview: "Visão geral",
  whatsapp: "Conexões",
  brain: "Cérebro",
  config: "Comportamento",
  inbox: "Atendimentos",
  activity: "Atividade",
};
const headers = (json) => ({
  ...(json ? { "content-type": "application/json" } : {}),
  authorization: `Bearer ${token}`,
});

async function api(path, options = {}, isForm = false) {
  const response = await fetch(path, {
    ...options,
    headers: { ...headers(!isForm), ...(options.headers || {}) },
  });
  if (response.status === 401) {
    token = prompt("Token administrativo do Hurtz:") || "";
    sessionStorage.setItem("hurtzToken", token);
    return api(path, options, isForm);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir");
  return data;
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 3000);
}
function escapeHtml(value) {
  const d = document.createElement("div");
  d.textContent = value;
  return d.innerHTML;
}
function knowledgeSegments(value) {
  const clean = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
  if (!clean) return [];
  const headingPattern =
    /\b(OBJETIVO|ORIENTAÇÃO|CONTEXTO|PASSO|AÇÃO|ACOMPANHAR|CAPACIDADE|DECISOR|PREFERÊNCIA|FRAMEWORK|REGRA DE ESTUDO|EXEMPLO|ATITUDE|RESPOSTA|PRÓXIMO PASSO)\b\s*:?\s*/gi;
  const pieces = clean.split(headingPattern);
  const segments = [];
  if (pieces[0]?.trim()) segments.push({ text: pieces[0].trim() });
  for (let index = 1; index < pieces.length; index += 2) {
    const title = pieces[index]?.trim();
    const text = pieces[index + 1]?.trim();
    if (title && text) segments.push({ title, text });
  }
  return segments.length ? segments : [{ text: clean }];
}
function knowledgeName(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*trecho\s*(\d+)/i, " · parte $1")
    .trim();
}
function compactBrainNodes(nodes = []) {
  const visible = nodes.filter((node) => node.origin !== "document_chunk");
  const legacyGroups = new Map();
  visible.forEach((node) => {
    const match =
      node.origin === "document" &&
      String(node.name).match(/^(.*?)\s*[·:]\s*(?:trecho|parte)\s*\d+/i);
    if (!match) return;
    const key = match[1].trim().toLowerCase();
    if (!legacyGroups.has(key)) legacyGroups.set(key, []);
    legacyGroups.get(key).push(node);
  });
  const consumed = new Set(
    [...legacyGroups.values()].flat().map((node) => node.id),
  );
  return [
    ...visible.filter((node) => !consumed.has(node.id)),
    ...[...legacyGroups.values()].map((group) => ({
      ...group[0],
      name: group[0].name.replace(/\s*[·:]\s*(?:trecho|parte)\s*\d+.*/i, ""),
      content: `Documento organizado em ${group.length} seções internas para consulta. ${group[0].content}`,
      section_count: group.length,
    })),
  ];
}
window.compactBrainNodes = compactBrainNodes;
function knowledgeHtml(value, compact = false) {
  return knowledgeSegments(value)
    .map(
      ({ title, text }) =>
        `<section class="knowledge-segment">${title ? `<b>${escapeHtml(title)}</b>` : ""}<p>${escapeHtml(compact && text.length > 180 ? `${text.slice(0, 177).trim()}…` : text)}</p></section>`,
    )
    .join("");
}
function nodeReviewLabel(node) {
  if (node.risk_level === "critical" && !node.usable)
    return "Bloqueado · informação crítica precisa de aprovação";
  if (node.review_status === "pending")
    return "Usável agora · aguardando revisão";
  return "Conhecimento revisado";
}
window.knowledgeHtml = knowledgeHtml;
function go(tab) {
  document
    .querySelectorAll(".nav-item,.tab")
    .forEach((x) => x.classList.remove("active"));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add("active");
  $(tab)?.classList.add("active");
  $("pageName").textContent = pageNames[tab] || tab;
  if (tab === "inbox") loadInbox();
}
function modal(id, open) {
  $(id).classList.toggle("open", open);
}

function renderInstances(items) {
  $("instances").innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<article class="instance-card"><span class="eyebrow">INSTÂNCIA HURTZ</span><h2>${escapeHtml(item.label)}</h2><small>${escapeHtml(item.name)} • WhatsApp ${escapeHtml(item.status)}</small><div class="webhook-state ${item.webhook_status === "active" ? "on" : item.webhook_status === "error" ? "error" : ""}"><i></i>Recebimento de mensagens: ${item.webhook_status === "active" ? "ativo" : item.webhook_status === "error" ? "com erro" : "aguardando configuração"}</div><div class="instance-actions"><button onclick="refreshQr('${encodeURIComponent(item.name)}')">QR Code</button><button onclick="checkStatus('${encodeURIComponent(item.name)}')">Verificar status</button></div></article>`,
        )
        .join("")
    : `<div class="empty-state"><b>Nenhum WhatsApp conectado</b><p>Crie uma instância exclusiva para começar com segurança.</p><button class="primary" onclick="document.getElementById('newConnection').click()">＋ Nova conexão</button></div>`;
}
const brainCategories = {
  knowledge: ["📚", "Conhecimento"],
  intelligence: ["✦", "Inteligência"],
  humor: ["☺", "Humor"],
  slang: ["💬", "Gírias"],
  attitude: ["◉", "Atitudes"],
  action: ["→", "Ações"],
};
function renderBrain(items) {
  brainData = items;
  $("brainCount").textContent = items.length;
  $("metricDocs").textContent = items.length;
  if (activeNucleus && !items.some((item) => item.id === activeNucleus))
    activeNucleus = "";
  $("brainNuclei").innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<article class="brain-nucleus ${item.id === activeNucleus ? "active" : ""}"><button class="brain-nucleus-select" data-nucleus="${item.id}"><i>🧠</i><div><b>${escapeHtml(item.name)}</b><small>${compactBrainNodes(item.nodes).length} memória(s)</small></div></button><div class="brain-nucleus-controls"><label class="nucleus-toggle" title="${item.status === "active" ? "Usado no atendimento" : "Ativar para atendimento"}"><input type="checkbox" data-nucleus-active="${item.id}" ${item.status === "active" ? "checked" : ""}/><span></span></label><button data-nucleus-rename="${item.id}" title="Renomear">✎</button><button data-nucleus-delete="${item.id}" title="Excluir">⌫</button></div></article>`,
        )
        .join("")
    : `<div class="empty-state"><b>Nenhum núcleo</b><p>Crie a primeira estrutura cognitiva.</p></div>`;
  document.querySelectorAll(".brain-nucleus-select").forEach(
    (button) =>
      (button.onclick = () => {
        activeNucleus = button.dataset.nucleus;
        renderBrain(brainData);
      }),
  );
  document
    .querySelectorAll("[data-nucleus-active]")
    .forEach(
      (input) =>
        (input.onchange = () =>
          setNucleusActivation(input.dataset.nucleusActive, input.checked)),
    );
  document
    .querySelectorAll("[data-nucleus-rename]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openRenameNucleus(button.dataset.nucleusRename)),
    );
  document
    .querySelectorAll("[data-nucleus-delete]")
    .forEach(
      (button) =>
        (button.onclick = () => removeNucleus(button.dataset.nucleusDelete)),
    );
  const active = items.find((item) => item.id === activeNucleus);
  $("brainEmpty").hidden = Boolean(active);
  $("brainDetail").hidden = !active;
  if (!active) return;
  $("brainTitle").textContent = active.name;
  $("brainRules").textContent = active.instructions;
  $("brainActiveState").textContent =
    active.status === "active"
      ? "ATIVO NOS ATENDIMENTOS"
      : "FORA DOS ATENDIMENTOS";
  $("brainActiveState").classList.toggle(
    "inactive",
    active.status !== "active",
  );
  window.HurtzBrainMap?.render(active);
  if (!$("graphViewPane").hidden) window.HurtzGraph?.render(active);
  $("brainTree").innerHTML = Object.entries(brainCategories)
    .map(([category, [icon, label]]) => {
      const nodes = compactBrainNodes(active.nodes).filter(
        (node) => node.category === category,
      );
      if (!nodes.length) return "";
      return `<article class="brain-branch"><header><i>${icon}</i><div><b>${label}</b><small>${nodes.length} ramificação(ões)</small></div></header><div>${nodes.map((node) => `<details class="brain-node ${node.review_status} ${node.risk_level === "critical" ? "critical" : ""}"><summary><div><b>${escapeHtml(knowledgeName(node.name))}</b><small>${escapeHtml(knowledgeSegments(node.content)[0]?.text?.slice(0, 90) || "Abrir conhecimento")}</small></div><span>${node.review_status === "pending" ? "Revisar" : "✓"}</span></summary><div class="brain-node-body">${knowledgeHtml(node.content)}<footer><small>${nodeReviewLabel(node)} · confiança ${Math.round(Number(node.confidence) * 100)}%</small>${node.review_status === "pending" ? `<button data-review="${node.id}">Aprovar</button>` : ""}</footer></div></details>`).join("")}</div></article>`;
    })
    .join("");
  $("brainTree").classList.toggle("open", brainMemoriesOpen);
  document.querySelectorAll("[data-review]").forEach(
    (button) =>
      (button.onclick = async () => {
        await reviewBrainNode(button.dataset.review);
      }),
  );
}
async function reviewBrainNode(id) {
  await api(`/api/brain/nodes/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ status: "approved" }),
  });
  toast("Conhecimento revisado e aprovado");
  await loadBrain();
}
window.reviewBrainNode = reviewBrainNode;

function openRenameNucleus(id) {
  const active = brainData.find((item) => item.id === id);
  if (!active) return;
  editingNucleus = id;
  $("renameNucleusInput").value = active.name;
  modal("renameNucleusModal", true);
  requestAnimationFrame(() => {
    $("renameNucleusInput").focus();
    $("renameNucleusInput").select();
  });
}
async function confirmRenameNucleus() {
  const active = brainData.find((item) => item.id === editingNucleus);
  if (!active) return;
  const name = $("renameNucleusInput").value.trim();
  if (!name || name === active.name) return;
  try {
    await api(`/api/brain/nuclei/${encodeURIComponent(editingNucleus)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    modal("renameNucleusModal", false);
    toast("Nome do núcleo atualizado");
    await loadBrain();
  } catch (error) {
    toast(error.message);
  }
}
async function setNucleusActivation(id, active) {
  try {
    const result = await api(
      `/api/brain/nuclei/${encodeURIComponent(id)}/activation`,
      { method: "PUT", body: JSON.stringify({ active }) },
    );
    if (active) activeNucleus = id;
    renderBrain(result.nuclei || []);
    toast(
      active
        ? "Núcleo definido para os atendimentos"
        : "Núcleo removido dos atendimentos",
    );
  } catch (error) {
    toast(error.message);
    await loadBrain();
  }
}
async function removeNucleus(id) {
  const nucleus = brainData.find((item) => item.id === id);
  if (!nucleus) return;
  const confirmed = confirm(
    `Excluir o núcleo “${nucleus.name}”?\n\nTodos os conhecimentos e ramificações deste núcleo serão apagados. Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await api(`/api/brain/nuclei/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (activeNucleus === id) activeNucleus = "";
    toast("Núcleo excluído");
    await loadBrain();
  } catch (error) {
    toast(error.message);
  }
}
async function loadBrain() {
  const data = await api("/api/brain/nuclei");
  renderBrain(data.nuclei || []);
}
async function createNucleus() {
  const name = $("brainNucleusName").value.trim();
  const instructions = $("brainNucleusRules").value.trim();
  try {
    const result = await api("/api/brain/nuclei", {
      method: "POST",
      body: JSON.stringify({ name, instructions }),
    });
    activeNucleus = result.nucleus.id;
    $("brainNucleusName").value = "";
    $("brainNucleusRules").value = "";
    toast("Núcleo criado");
    await loadBrain();
  } catch (error) {
    toast(error.message);
  }
}
async function teachBrain() {
  if (!activeNucleus) return;
  const content = $("brainLearningContent").value.trim();
  const button = $("teachBrain");
  try {
    button.disabled = true;
    button.textContent = "Aprendendo e ramificando...";
    const result = await api(
      `/api/brain/nuclei/${encodeURIComponent(activeNucleus)}/learn`,
      { method: "POST", body: JSON.stringify({ content }) },
    );
    $("brainLearningContent").value = "";
    toast(`${result.nodes.length} conhecimento(s) criado(s) para revisão`);
    await loadBrain();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Ensinar e criar ramificações";
  }
}
async function uploadBrainPdf(file) {
  if (!activeNucleus) return toast("Selecione um núcleo primeiro");
  if (!file || !file.name.toLowerCase().endsWith(".pdf"))
    return toast("Escolha um arquivo PDF");
  const form = new FormData();
  form.append("pdf", file);
  const button = $("chooseBrainPdf");
  try {
    button.disabled = true;
    button.textContent = "Estudando PDF...";
    const result = await api(
      `/api/brain/nuclei/${encodeURIComponent(activeNucleus)}/learn-pdf`,
      { method: "POST", body: form },
      true,
    );
    toast(
      `${result.document.title}: ${result.factualNodes} fatos e ${result.inferredNodes} ramificações`,
    );
    await loadBrain();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Escolher PDF";
    $("brainPdfInput").value = "";
  }
}
function fill(data) {
  const a = data.assistant;
  if (!configDirty) {
    [
      "businessName",
      "assistantName",
      "persona",
      "responseMode",
      "triggerMatchMode",
      "unknownAnswer",
      "humanTransferMessage",
    ].forEach((k) => ($(k).value = a[k] ?? ""));
    ["enabled", "audioReplyToAudio", "ignoreGroups", "triggerEnabled"].forEach(
      (k) => ($(k).checked = Boolean(a[k])),
    );
    $("triggerKeywords").value = (a.triggerKeywords || []).join(", ");
    $("keywords").value = (a.humanTransferKeywords || []).join(", ");
    $("slangIntensity").value = Number(a.slangIntensity ?? 35);
  }
  renderSlangIntensity($("slangIntensity").value);
  triggerGateEnabled = Boolean(a.triggerEnabled);
  renderTriggerState(a);
  $("enabledLabel").textContent = a.enabled ? "Ativo" : "Pausado";
  $("assistantPausedBanner").hidden = Boolean(a.enabled);
  $("connection").textContent = data.env.evolutionConfigured
    ? `${data.instances.length} conexão(ões)`
    : "Evolution não configurada";
  $("connection").classList.toggle("ok", data.env.evolutionConfigured);
  $("sideDot").classList.toggle("on", data.env.evolutionConfigured);
  $("sideStatus").textContent = data.env.evolutionConfigured
    ? "Infraestrutura pronta"
    : "Sistema local";
  $("sideDetail").textContent = data.env.evolutionConfigured
    ? "Evolution configurada"
    : "Evolution não configurada";
  $("instanceCount").textContent = data.instances.length;
  $("metricInstances").textContent = data.instances.length;
  renderInstances(data.instances || []);
  $("messages").textContent = data.dashboard.messages;
  $("activityMessages").textContent = data.dashboard.messages;
  $("human").textContent = data.dashboard.human;
  $("activityHuman").textContent = data.dashboard.human;
  $("contacts").textContent = data.dashboard.contacts;
  const performanceData = data.performance || { samples: 0, averages: {} };
  const seconds = (value) => `${(Number(value || 0) / 1000).toFixed(1)} s`;
  $("performanceSamples").textContent = performanceData.samples
    ? `${performanceData.samples} atendimento(s) medido(s)`
    : "Sem amostras";
  $("performanceFirst").textContent = seconds(
    performanceData.averages.first_response_ms,
  );
  $("performanceGeneration").textContent = seconds(
    performanceData.averages.generation_ms,
  );
  $("performanceRag").textContent = seconds(performanceData.averages.rag_ms);
  $("performanceTotal").textContent = seconds(
    performanceData.averages.total_ms,
  );
  $("evolutionHealth").textContent = data.env.evolutionConfigured
    ? "Configurada"
    : "Não configurada";
  $("evolutionDot").classList.toggle("on", data.env.evolutionConfigured);
  $("cloudflareHealth").textContent = data.env.cloudflareConfigured
    ? "D1 + Vectorize conectados"
    : "Configuração em andamento";
  $("cloudflareDot").classList.toggle("on", data.env.cloudflareConfigured);
  $("geminiHealth").textContent = data.env.geminiConfigured
    ? "SDK e chave configurados"
    : "SDK instalado • chave pendente";
  $("geminiDot").classList.toggle("on", data.env.geminiConfigured);
  $("ollamaHealth").textContent = data.env.ollamaModel;
  $("recent").innerHTML =
    data.dashboard.recent
      .map(
        (x) =>
          `<div><b>${x.role === "user" ? "Cliente" : "Hurtz"} • ${escapeHtml(x.contact)}</b><p>${escapeHtml(x.content)}</p><small>${x.format} • ${x.created_at}</small></div>`,
      )
      .join("") ||
    "<div class='empty-state'>Nenhuma conversa processada.</div>";
  renderGlobalAudit(data.audit || []);
}
function renderSlangIntensity(value) {
  const intensity = Number(value);
  $("slangIntensityValue").textContent = `${intensity}%`;
  $("slangIntensityHint").textContent =
    intensity === 0
      ? "Sem gírias; linguagem simples e cordial."
      : intensity <= 30
        ? "Uso leve, somente quando combinar com o lead."
        : intensity <= 65
          ? "Uso moderado e contextual."
          : "Uso frequente, informal e sem repetir bordões.";
  $("slangIntensity").style.setProperty("--range-progress", `${intensity}%`);
}
function auditLabel(type) {
  return (
    {
      message_received: "Mensagem recebida",
      message_queued: "Encaminhada para processamento",
      processing_started: "Processamento iniciado",
      assistant_disabled: "IA pausada: mensagem não respondida",
      trigger_waiting: "Bloqueada: aguardando gatilho",
      trigger_activated: "Gatilho reconhecido",
      answer_generated: "Resposta gerada pela IA",
      presence_started: "Digitando ou gravando antes do envio",
      response_sent: "Resposta enviada ao WhatsApp",
      message_waiting_human: "Mensagem aguardando atendente humano",
      contact_mode: "Responsável pelo atendimento alterado",
      processing_failed: "Falha no processamento",
      webhook_configured: "Recebimento da Evolution configurado",
      webhook_configuration_failed: "Falha ao configurar recebimento",
      webhook_ignored: "Evento ignorado",
      webhook_rejected: "Evento rejeitado",
      profile_unavailable: "Foto de perfil indisponível",
    }[type] || type
  );
}
function renderGlobalAudit(items) {
  $("globalAudit").innerHTML = items.length
    ? items
        .slice(0, 40)
        .map((item) => {
          const failed = /failed|error|rejected/.test(item.type);
          const contact = item.detail?.contact
            ? contactParts(String(item.detail.contact)).number
            : item.detail?.instance || "Sistema";
          return `<div class="${failed ? "failed" : ""}"><i></i><div><b>${escapeHtml(auditLabel(item.type))}</b><small>${escapeHtml(contact)} • ${escapeHtml(item.created_at)}</small></div></div>`;
        })
        .join("")
    : "<div class='empty-state'>Nenhum evento auditado.</div>";
}
function renderTriggerState(assistant) {
  const keywords = assistant.triggerKeywords || [];
  const state = $("triggerSavedState");
  state.classList.toggle("active", Boolean(assistant.triggerEnabled));
  state.innerHTML = assistant.triggerEnabled
    ? `<b>Ativo para novos atendimentos</b><span>${keywords.map(escapeHtml).join("</span><span>")}</span>`
    : keywords.length
      ? `<b>Salvo, mas desativado</b><span>${keywords.map(escapeHtml).join("</span><span>")}</span>`
      : "Nenhum gatilho configurado.";
}
async function load() {
  try {
    const [status, brain] = await Promise.all([
      api("/api/status"),
      api("/api/brain/nuclei"),
    ]);
    fill(status);
    renderBrain(brain.nuclei || []);
  } catch (e) {
    toast(e.message);
  }
}
async function save() {
  const value = {};
  [
    "businessName",
    "assistantName",
    "persona",
    "responseMode",
    "triggerMatchMode",
    "unknownAnswer",
    "humanTransferMessage",
  ].forEach((k) => (value[k] = $(k).value));
  ["enabled", "audioReplyToAudio", "ignoreGroups", "triggerEnabled"].forEach(
    (k) => (value[k] = $(k).checked),
  );
  value.humanTransferKeywords = $("keywords")
    .value.split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  value.triggerKeywords = $("triggerKeywords")
    .value.split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  value.slangIntensity = Number($("slangIntensity").value);
  if (value.triggerEnabled && !value.triggerKeywords.length)
    return toast("Adicione ao menos um gatilho antes de ativar");
  const button = $("save");
  try {
    button.disabled = true;
    button.textContent = "Salvando...";
    const result = await api("/api/assistant", {
      method: "PUT",
      body: JSON.stringify(value),
    });
    const saved = result.assistant;
    if (
      !saved ||
      JSON.stringify(saved.triggerKeywords || []) !==
        JSON.stringify(value.triggerKeywords) ||
      Boolean(saved.triggerEnabled) !== Boolean(value.triggerEnabled) ||
      Number(saved.slangIntensity) !== Number(value.slangIntensity)
    )
      throw new Error("O servidor não confirmou os gatilhos configurados");
    configDirty = false;
    triggerGateEnabled = Boolean(saved.triggerEnabled);
    renderTriggerState(saved);
    toast(
      saved.triggerEnabled
        ? `${saved.triggerKeywords.length} gatilho(s) salvo(s) e ativos`
        : "Alterações salvas",
    );
    await load();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Salvar alterações";
  }
}

async function createInstance() {
  const label = $("instanceLabel").value.trim();
  if (!label) return toast("Dê um nome para a conexão");
  try {
    $("createInstance").disabled = true;
    const data = await api("/api/instances", {
      method: "POST",
      body: JSON.stringify({ label }),
    });
    modal("connectModal", false);
    $("instanceLabel").value = "";
    await load();
    if (data.qr) openQr(data.instance.name, data.qr);
    else refreshQr(encodeURIComponent(data.instance.name));
  } catch (e) {
    toast(e.message);
  } finally {
    $("createInstance").disabled = false;
  }
}
function openQr(instance, qr) {
  currentQrInstance = instance;
  $("qrImage").src = qr;
  $("qrStatus").textContent = "Aguardando leitura...";
  modal("qrModal", true);
  clearInterval(statusTimer);
  statusTimer = setInterval(
    () => checkStatus(encodeURIComponent(instance), true),
    2500,
  );
}
window.refreshQr = async (encoded) => {
  try {
    const data = await api(`/api/instances/${encoded}/qr`);
    if (!data.qr) throw new Error("A Evolution não retornou o QR Code");
    openQr(decodeURIComponent(encoded), data.qr);
  } catch (e) {
    toast(e.message);
  }
};
window.checkStatus = async (encoded, silent = false) => {
  try {
    const data = await api(`/api/instances/${encoded}/status`);
    const connected = ["open", "connected"].includes(
      String(data.state).toLowerCase(),
    );
    if (currentQrInstance === decodeURIComponent(encoded)) {
      $("qrStatus").textContent = connected
        ? "WhatsApp conectado com sucesso"
        : `Estado: ${data.state}`;
      if (connected) {
        clearInterval(statusTimer);
        setTimeout(() => modal("qrModal", false), 1200);
      }
    }
    if (!silent)
      toast(connected ? "WhatsApp conectado" : `Estado: ${data.state}`);
    load();
  } catch (e) {
    if (!silent) toast(e.message);
  }
};

function contactParts(contact) {
  const split = contact.indexOf(":");
  return split > 0
    ? { instance: contact.slice(0, split), number: contact.slice(split + 1) }
    : { instance: "Local", number: contact };
}
function renderConversationList(items) {
  $("conversationCount").textContent = items.length;
  $("conversationSummary").textContent =
    `${items.length} conversa${items.length === 1 ? "" : "s"}`;
  $("conversationList").innerHTML = items.length
    ? items
        .map((item) => {
          const parts = contactParts(item.contact),
            selected = item.contact === activeConversation ? " active" : "",
            waiting =
              triggerGateEnabled &&
              !item.ai_activated &&
              item.status !== "human",
            label =
              item.status === "human"
                ? "HUMANO"
                : waiting
                  ? "AGUARDA GATILHO"
                  : "IA";
          const avatar = item.profile_url
            ? `<img class="conversation-avatar" src="${escapeHtml(item.profile_url)}" alt="">`
            : `<span class="conversation-avatar">${escapeHtml((item.push_name || parts.number).slice(0, 2).toUpperCase())}</span>`;
          return `<button class="conversation-item${selected}" data-contact="${encodeURIComponent(item.contact)}">${avatar}<div><b>${escapeHtml(item.push_name || parts.number)}</b><small>${escapeHtml(item.last_message || "Aguardando mensagem")}</small><em class="${item.status === "human" ? "human" : waiting ? "waiting" : ""}">${label}</em></div></button>`;
        })
        .join("")
    : `<div class="empty-state"><b>Nenhuma conversa</b><p>Os atendimentos aparecerão aqui após a primeira mensagem.</p></div>`;
  document
    .querySelectorAll(".conversation-item")
    .forEach(
      (button) =>
        (button.onclick = () =>
          openConversation(decodeURIComponent(button.dataset.contact))),
    );
}
function renderChat(data) {
  const parts = contactParts(data.contact);
  $("chatContact").textContent = parts.number;
  $("chatInstance").textContent = `Conexão: ${parts.instance}`;
  $("chatControls").hidden = false;
  const human = data.status === "human",
    waiting = triggerGateEnabled && !data.aiActivated && !human;
  $("conversationMode").textContent = human
    ? "Atendimento humano"
    : waiting
      ? "Aguardando gatilho"
      : "IA ativa";
  $("conversationMode").classList.toggle("human", human);
  $("conversationMode").classList.toggle("waiting", waiting);
  $("takeConversation").disabled = human;
  $("returnConversation").disabled = !human;
  renderConversationContext(data.context || {});
  renderAudit(data.audit || []);
  const chat = $("chatMessages");
  const feedbackByMessage = new Map(
    (data.feedback || []).map((item) => [Number(item.message_id), item]),
  );
  const assistantMessages = data.messages.filter(
    (message) => message.role === "assistant",
  );
  const reviewedCount = assistantMessages.filter((message) =>
    feedbackByMessage.has(Number(message.id)),
  ).length;
  $("feedbackReviewBar").hidden = !feedbackReviewMode;
  $("feedbackReviewCount").textContent =
    `${reviewedCount} de ${assistantMessages.length} respostas avaliadas`;
  $("reviewConversation").textContent = feedbackReviewMode
    ? "Revisando"
    : "Revisar conversa";
  $("reviewConversation").classList.toggle("active", feedbackReviewMode);
  const wasNearBottom =
    chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
  const conversationChanged = renderedConversation !== data.contact;
  chat.innerHTML = data.messages.length
    ? data.messages
        .map((message) => {
          const kind =
            message.role === "user"
              ? "customer"
              : message.role === "human"
                ? "human"
                : "hurtz";
          const who =
            message.role === "user"
              ? "Cliente"
              : message.role === "human"
                ? "Equipe"
                : "Hurtz";
          const feedback = feedbackByMessage.get(Number(message.id));
          const feedbackControls =
            feedbackReviewMode && message.role === "assistant"
              ? `<div class="message-feedback${feedback ? ` rated ${feedback.rating}` : ""}"><button data-feedback-message="${message.id}" data-feedback-rating="good" class="${feedback?.rating === "good" ? "selected" : ""}">✓ Boa</button><button data-feedback-message="${message.id}" data-feedback-rating="bad" class="${feedback?.rating === "bad" ? "selected" : ""}">× Melhorar</button></div>`
              : "";
          return `<div class="message ${kind}${feedback ? ` feedback-${feedback.rating}` : ""}" data-message-id="${message.id}"><span>${escapeHtml(message.content)}</span><small>${who} • ${escapeHtml(message.format)} • ${escapeHtml(message.created_at)}</small>${feedbackControls}</div>`;
        })
        .join("")
    : `<div class="chat-empty"><b>Aguardando mensagens</b></div>`;
  if (
    conversationChanged ||
    (data.messages.length > renderedMessageCount && wasNearBottom)
  )
    chat.scrollTop = chat.scrollHeight;
  renderedConversation = data.contact;
  renderedMessageCount = data.messages.length;
  document.querySelectorAll("[data-feedback-message]").forEach((button) => {
    button.onclick = () => {
      const message = data.messages.find(
        (item) => Number(item.id) === Number(button.dataset.feedbackMessage),
      );
      openFeedback(
        message,
        feedbackByMessage.get(Number(button.dataset.feedbackMessage)),
        button.dataset.feedbackRating,
      );
    };
  });
}
function renderConversationContext(context) {
  const profile = context.profile || {};
  const facts = Object.entries(profile).filter(
    ([, value]) =>
      value !== "" && value != null && (!Array.isArray(value) || value.length),
  );
  const hasContext = Boolean(
    context.summary || facts.length || context.nextSteps?.length,
  );
  $("chatContext").hidden = false;
  $("chatContextSummary").textContent = context.summary
    ? context.summary
    : "A memória será consolidada conforme a conversa avançar.";
  $("chatContextFacts").innerHTML = [
    ...facts
      .slice(0, 5)
      .map(
        ([key, value]) =>
          `<span><b>${escapeHtml(key)}</b>${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</span>`,
      ),
    ...(context.nextSteps?.length
      ? [
          `<span class="next-step"><b>Próximo passo</b>${escapeHtml(context.nextSteps[0])}</span>`,
        ]
      : []),
  ].join("");
  $("chatContext").classList.toggle("empty", !hasContext);
  $("chatContext").dataset.context = JSON.stringify(context);
}
function toggleFeedbackReview(open) {
  feedbackReviewMode = open;
  $("feedbackReviewBar").hidden = !open;
  document.querySelector(".chat-panel")?.classList.toggle("reviewing", open);
  if (activeConversation) loadInbox();
}
function selectFeedbackRating(rating) {
  feedbackRating = rating;
  $("feedbackGood").classList.toggle("active", rating === "good");
  $("feedbackBad").classList.toggle("active", rating === "bad");
  $("idealResponseField").hidden = rating !== "bad";
}
function openFeedback(message, existing, preferredRating) {
  if (!message) return;
  feedbackTargetMessage = message;
  $("feedbackMessagePreview").textContent = message.content;
  $("feedbackReason").value = existing?.reason || "naturalness";
  $("feedbackNote").value = existing?.note || "";
  $("feedbackIdeal").value = existing?.ideal_response || "";
  selectFeedbackRating(existing?.rating || preferredRating || "good");
  modal("feedbackModal", true);
}
async function saveFeedback() {
  if (!activeConversation || !feedbackTargetMessage) return;
  const note = $("feedbackNote").value.trim();
  const idealResponse = $("feedbackIdeal").value.trim();
  if (feedbackRating === "bad" && !note && !idealResponse) {
    toast("Explique o problema ou escreva a resposta ideal");
    return;
  }
  try {
    await api(
      `/api/conversations/${encodeURIComponent(activeConversation)}/feedback`,
      {
        method: "POST",
        body: JSON.stringify({
          messageId: Number(feedbackTargetMessage.id),
          rating: feedbackRating,
          reason: $("feedbackReason").value,
          note,
          idealResponse,
        }),
      },
    );
    modal("feedbackModal", false);
    toast("Avaliação salva para aprendizado supervisionado");
    await loadInbox();
  } catch (error) {
    toast(error.message);
  }
}
async function exportFeedback() {
  try {
    const response = await fetch("/api/feedback/export", {
      headers: headers(false),
    });
    if (!response.ok) throw new Error("Não foi possível exportar os dados");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hurtz-feedback-training.jsonl";
    link.click();
    URL.revokeObjectURL(url);
    toast("Base de treinamento exportada");
  } catch (error) {
    toast(error.message);
  }
}
function openContextEditor() {
  const context = JSON.parse($("chatContext").dataset.context || "{}");
  $("contextSummaryInput").value = context.summary || "";
  $("contextProfileInput").value = JSON.stringify(
    context.profile || {},
    null,
    2,
  );
  $("contextStepsInput").value = (context.nextSteps || []).join("\n");
  modal("contextModal", true);
}
async function saveChatContext() {
  if (!activeConversation) return;
  try {
    const profile = JSON.parse($("contextProfileInput").value || "{}");
    const result = await api(
      `/api/conversations/${encodeURIComponent(activeConversation)}/context`,
      {
        method: "PUT",
        body: JSON.stringify({
          summary: $("contextSummaryInput").value.trim(),
          profile,
          nextSteps: $("contextStepsInput")
            .value.split(/\n/)
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      },
    );
    renderConversationContext(result.context);
    modal("contextModal", false);
    toast("Memória do lead atualizada");
  } catch (error) {
    toast(
      error instanceof SyntaxError
        ? "O perfil precisa ser um JSON válido"
        : error.message,
    );
  }
}
function renderAudit(items) {
  $("chatAudit").innerHTML = items.length
    ? items
        .slice(0, 6)
        .map((item) => {
          const failed = /failed|error/.test(item.type);
          return `<span class="${failed ? "failed" : ""}"><i></i>${escapeHtml(auditLabel(item.type))}<small>${escapeHtml(item.created_at)}</small></span>`;
        })
        .join("")
    : "<span><i></i>Sem eventos auditados para esta conversa.</span>";
}
async function openConversation(contact) {
  activeConversation = contact;
  renderedConversation = "";
  renderedMessageCount = 0;
  await loadInbox();
}
async function loadInbox() {
  try {
    const list = await api("/api/conversations");
    $("inboxLive").textContent = "● Atualização ao vivo";
    $("inboxLive").classList.add("on");
    const conversations = list.conversations || [];
    if (
      !activeConversation ||
      !conversations.some((item) => item.contact === activeConversation)
    )
      activeConversation = conversations[0]?.contact || "";
    renderConversationList(conversations);
    if (activeConversation) {
      const detail = await api(
        `/api/conversations/${encodeURIComponent(activeConversation)}/messages`,
      );
      renderChat(detail);
    } else {
      $("chatControls").hidden = true;
      $("chatContact").textContent = "Selecione um atendimento";
      $("chatInstance").textContent =
        "As mensagens aparecerão aqui em tempo real.";
    }
  } catch (e) {
    $("inboxLive").textContent = "● Reconectando...";
    $("inboxLive").classList.remove("on");
  }
}
async function setConversationMode(mode) {
  if (!activeConversation) return;
  const button =
    mode === "human" ? $("takeConversation") : $("returnConversation");
  try {
    button.disabled = true;
    const result = await api(
      `/api/contacts/${encodeURIComponent(activeConversation)}/${mode}`,
      { method: "POST" },
    );
    if (result.status !== mode)
      throw new Error("O modo da conversa não foi confirmado");
    toast(
      mode === "human"
        ? "Conversa assumida: a IA foi pausada"
        : result.aiActivated || !triggerGateEnabled
          ? "Conversa devolvida: IA ativa"
          : "Conversa devolvida: aguardando o gatilho do lead",
    );
    await loadInbox();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
}

document
  .querySelectorAll(".nav-item")
  .forEach((b) => (b.onclick = () => go(b.dataset.tab)));
document
  .querySelectorAll("[data-go]")
  .forEach((b) => (b.onclick = () => go(b.dataset.go)));
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => modal(b.dataset.close, false)));
$("newConnection").onclick = () => modal("connectModal", true);
$("createInstance").onclick = createInstance;
$("save").onclick = save;
$("createBrainNucleus").onclick = createNucleus;
$("teachBrain").onclick = teachBrain;
$("renameBrainNucleus").onclick = () => openRenameNucleus(activeNucleus);
$("confirmRenameNucleus").onclick = confirmRenameNucleus;
$("renameNucleusInput").onkeydown = (event) => {
  if (event.key === "Enter") confirmRenameNucleus();
};
$("toggleBrainMemories").onclick = () => {
  brainMemoriesOpen = !brainMemoriesOpen;
  $("brainTree").classList.toggle("open", brainMemoriesOpen);
  $("toggleBrainMemories").textContent = brainMemoriesOpen
    ? "Ocultar memórias"
    : "Mostrar memórias";
};
$("enabled").onchange = save;
document
  .querySelectorAll("#config input, #config textarea, #config select")
  .forEach((field) =>
    field.addEventListener("input", () => {
      configDirty = true;
    }),
  );
$("slangIntensity").addEventListener("input", (event) =>
  renderSlangIntensity(event.target.value),
);
$("chooseBrainPdf").onclick = (event) => {
  event.stopPropagation();
  $("brainPdfInput").click();
};
$("brainPdfInput").onchange = (event) =>
  uploadBrainPdf(event.target.files?.[0]);
["dragenter", "dragover"].forEach((name) =>
  $("brainPdfDrop").addEventListener(name, (event) => {
    event.preventDefault();
    $("brainPdfDrop").classList.add("drag");
  }),
);
["dragleave", "drop"].forEach((name) =>
  $("brainPdfDrop").addEventListener(name, (event) => {
    event.preventDefault();
    $("brainPdfDrop").classList.remove("drag");
  }),
);
$("brainPdfDrop").addEventListener("drop", (event) =>
  uploadBrainPdf(event.dataTransfer.files?.[0]),
);
$("takeConversation").onclick = () => setConversationMode("human");
$("returnConversation").onclick = () => setConversationMode("bot");
$("reviewConversation").onclick = () =>
  toggleFeedbackReview(!feedbackReviewMode);
$("finishFeedbackReview").onclick = () => toggleFeedbackReview(false);
$("exportFeedback").onclick = exportFeedback;
$("feedbackGood").onclick = () => selectFeedbackRating("good");
$("feedbackBad").onclick = () => selectFeedbackRating("bad");
$("saveFeedback").onclick = saveFeedback;
$("editChatContext").onclick = openContextEditor;
$("saveChatContext").onclick = saveChatContext;
(async () => {
  if (window.hurtzDesktop?.adminToken)
    token = await window.hurtzDesktop.adminToken();
  load();
  setInterval(load, 15000);
})();
setInterval(() => {
  if ($("inbox").classList.contains("active")) loadInbox();
}, 900);
