const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function authorized(request, env) {
  const value = request.headers.get("authorization") || "";
  return env.HURTZ_SYNC_TOKEN && value === `Bearer ${env.HURTZ_SYNC_TOKEN}`;
}

const vectorId = (documentId, position) =>
  `${documentId.slice(0, 48)}:${position}`;

async function indexChunks(env, documentId, chunks) {
  if (!chunks.length) return;
  const vectors = [];
  for (let offset = 0; offset < chunks.length; offset += 20) {
    const group = chunks.slice(offset, offset + 20);
    const embedded = await env.AI.run("@cf/baai/bge-m3", {
      text: group.map((item) => item.content),
    });
    const data = embedded.data || embedded;
    for (let index = 0; index < group.length; index++) {
      vectors.push({
        id: vectorId(documentId, group[index].position),
        values: data[index],
        metadata: { documentId, position: group[index].position },
      });
    }
  }
  for (let offset = 0; offset < vectors.length; offset += 1000)
    await env.VECTORIZE.upsert(vectors.slice(offset, offset + 1000));
}

async function saveKnowledge(request, env) {
  const body = await request.json();
  const document = body.document || {};
  const chunks = Array.isArray(body.chunks) ? body.chunks : [];
  if (!document.id || !document.filename || !chunks.length)
    return json({ error: "Documento ou blocos inválidos" }, 400);

  await env.DB.prepare(
    `
    INSERT INTO knowledge_documents
      (id, filename, title, pages, characters, storage_key, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ready', CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET filename=excluded.filename, title=excluded.title,
      pages=excluded.pages, characters=excluded.characters,
      storage_key=excluded.storage_key, status='ready', updated_at=CURRENT_TIMESTAMP
  `,
  )
    .bind(
      document.id,
      document.filename,
      document.title,
      document.pages || 0,
      document.characters || 0,
      document.storageKey || null,
    )
    .run();

  await env.DB.prepare("DELETE FROM knowledge_chunks WHERE document_id = ?")
    .bind(document.id)
    .run();
  for (let offset = 0; offset < chunks.length; offset += 50) {
    await env.DB.batch(
      chunks
        .slice(offset, offset + 50)
        .map((item) =>
          env.DB.prepare(
            "INSERT INTO knowledge_chunks (id, document_id, position, content) VALUES (?, ?, ?, ?)",
          ).bind(
            `${document.id}:${item.position}`,
            document.id,
            item.position,
            item.content,
          ),
        ),
    );
  }
  await indexChunks(env, document.id, chunks);
  return json({ synced: true, documentId: document.id, chunks: chunks.length });
}

async function search(request, env) {
  const body = await request.json();
  const query = String(body.query || "").trim();
  if (!query) return json({ results: [] });
  const embedded = await env.AI.run("@cf/baai/bge-m3", { text: [query] });
  const vector = (embedded.data || embedded)[0];
  const matches = await env.VECTORIZE.query(vector, {
    topK: Math.min(Number(body.topK) || 5, 12),
    returnMetadata: "all",
  });
  const results = [];
  for (const match of matches.matches || []) {
    const row = await env.DB.prepare(
      "SELECT document_id, position, content FROM knowledge_chunks WHERE document_id = ? AND position = ?",
    )
      .bind(match.metadata.documentId, match.metadata.position)
      .first();
    if (row) results.push({ ...row, score: match.score });
  }
  return json({ results });
}

async function removeKnowledge(documentId, env) {
  const result = await env.DB.prepare(
    "SELECT position FROM knowledge_chunks WHERE document_id = ?",
  )
    .bind(documentId)
    .all();
  const ids = (result.results || []).map((item) =>
    vectorId(documentId, item.position),
  );
  for (let offset = 0; offset < ids.length; offset += 1000)
    await env.VECTORIZE.deleteByIds(ids.slice(offset, offset + 1000));
  await env.DB.prepare("DELETE FROM knowledge_documents WHERE id = ?")
    .bind(documentId)
    .run();
  return json({ removed: true, documentId, vectors: ids.length });
}

async function saveInstance(request, env) {
  const item = await request.json();
  if (!item.name?.startsWith("hurtz-"))
    return json({ error: "Instância inválida" }, 400);
  await env.DB.prepare(
    `
    INSERT INTO whatsapp_instances (id, evolution_name, label, status, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(evolution_name) DO UPDATE SET
      label=excluded.label, status=excluded.status, updated_at=CURRENT_TIMESTAMP
  `,
  )
    .bind(
      item.id || item.name,
      item.name,
      item.label || item.name,
      item.status || "created",
    )
    .run();
  return json({ synced: true });
}

async function saveContact(request, env) {
  const item = await request.json();
  if (!item.instanceName || !item.whatsappId)
    return json({ error: "Contato inválido" }, 400);
  const id = `${item.instanceName}:${item.whatsappId}`;
  const activationProvided = item.aiActivated !== undefined;
  const activated = item.aiActivated ? 1 : 0;
  await env.DB.prepare(
    `
    INSERT INTO contacts (id, instance_name, whatsapp_id, push_name, mode, summary, metadata, ai_activated, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(instance_name, whatsapp_id) DO UPDATE SET
      push_name=COALESCE(NULLIF(excluded.push_name,''),contacts.push_name),
      mode=excluded.mode, summary=COALESCE(excluded.summary,contacts.summary),
      metadata=excluded.metadata,
      ai_activated=CASE WHEN ?=1 THEN excluded.ai_activated ELSE contacts.ai_activated END,
      updated_at=CURRENT_TIMESTAMP
  `,
  )
    .bind(
      id,
      item.instanceName,
      item.whatsappId,
      item.pushName || "",
      item.mode || "bot",
      item.summary || null,
      JSON.stringify(item.metadata || {}),
      activated,
      activationProvided ? 1 : 0,
    )
    .run();
  return json({ synced: true, id });
}

async function saveMessage(request, env) {
  const item = await request.json();
  if (!item.id || !item.instanceName || !item.whatsappId || !item.content)
    return json({ error: "Mensagem inválida" }, 400);
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO messages
      (id, instance_name, whatsapp_id, external_id, role, format, content, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  )
    .bind(
      item.id,
      item.instanceName,
      item.whatsappId,
      item.externalId || null,
      item.role,
      item.format || "text",
      item.content,
      JSON.stringify(item.metadata || {}),
      item.createdAt || new Date().toISOString(),
    )
    .run();
  return json({ synced: true, id: item.id });
}

async function saveMemory(request, env) {
  const item = await request.json();
  if (!item.key) return json({ error: "Chave inválida" }, 400);
  await env.DB.prepare(
    `
    INSERT INTO memory_cache (cache_key, value, expires_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(cache_key) DO UPDATE SET value=excluded.value,
      expires_at=excluded.expires_at, updated_at=CURRENT_TIMESTAMP
  `,
  )
    .bind(item.key, JSON.stringify(item.value ?? null), item.expiresAt || null)
    .run();
  return json({ synced: true });
}

async function saveFeedback(request, env) {
  const item = await request.json();
  if (!item.id || !item.contact || !item.message_id || !item.rating)
    return json({ error: "Feedback inválido" }, 400);
  await env.DB.prepare(
    `INSERT INTO response_feedback
      (id,contact,message_id,rating,reason,note,ideal_response,context_snapshot,updated_at)
     VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET rating=excluded.rating,
       reason=excluded.reason,note=excluded.note,
       ideal_response=excluded.ideal_response,
       context_snapshot=excluded.context_snapshot,updated_at=CURRENT_TIMESTAMP`,
  )
    .bind(
      item.id,
      item.contact,
      String(item.message_id),
      item.rating,
      item.reason || "other",
      item.note || "",
      item.ideal_response || "",
      item.context_snapshot || "[]",
    )
    .run();
  return json({ synced: true, id: item.id });
}

async function saveBrainNucleus(request, env) {
  const item = await request.json();
  if (!item.id || !item.name || !item.instructions)
    return json({ error: "Núcleo inválido" }, 400);
  await env.DB.prepare(
    `
    INSERT INTO brain_nuclei(id,name,instructions,status,updated_at)
    VALUES(?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,
      instructions=excluded.instructions,status=excluded.status,
      updated_at=CURRENT_TIMESTAMP
  `,
  )
    .bind(item.id, item.name, item.instructions, item.status || "active")
    .run();
  return json({ synced: true, id: item.id });
}

async function saveBrainNodes(request, env) {
  const body = await request.json();
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];
  if (!nodes.length) return json({ synced: true, nodes: 0 });
  await env.DB.batch(
    nodes.map((item) =>
      env.DB.prepare(
        `
    INSERT INTO brain_nodes
      (id,nucleus_id,parent_id,name,category,content,origin,review_status,usable,confidence,risk_level,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,
      content=excluded.content,review_status=excluded.review_status,
      usable=excluded.usable,confidence=excluded.confidence,
      risk_level=excluded.risk_level,updated_at=CURRENT_TIMESTAMP
  `,
      ).bind(
        item.id,
        item.nucleus_id || item.nucleusId,
        item.parent_id || item.parentId || null,
        item.name,
        item.category,
        item.content,
        item.origin || "ai",
        item.review_status || item.reviewStatus || "pending",
        item.usable === 0 || item.usable === false ? 0 : 1,
        Number(item.confidence || 0.5),
        item.risk_level || item.riskLevel || "normal",
      ),
    ),
  );
  const searchable = nodes.filter(
    (item) =>
      item.usable !== 0 &&
      item.usable !== false &&
      String(item.content || "").trim(),
  );
  for (let offset = 0; offset < searchable.length; offset += 20) {
    const group = searchable.slice(offset, offset + 20);
    const embedded = await env.AI.run("@cf/baai/bge-m3", {
      text: group.map((item) => `${item.name}\n${item.content}`),
    });
    const data = embedded.data || embedded;
    await env.VECTORIZE.upsert(
      group.map((item, index) => ({
        id: `brain:${item.id}`,
        values: data[index],
        metadata: {
          type: "brain",
          nucleusId: item.nucleus_id || item.nucleusId,
          nodeId: item.id,
        },
      })),
    );
  }
  return json({ synced: true, nodes: nodes.length });
}

async function searchBrain(request, env) {
  const body = await request.json();
  const query = String(body.query || "").trim();
  const nucleusId = String(body.nucleusId || "").trim();
  if (!query || !nucleusId) return json({ results: [] });
  const embedded = await env.AI.run("@cf/baai/bge-m3", { text: [query] });
  const vector = (embedded.data || embedded)[0];
  const matches = await env.VECTORIZE.query(vector, {
    topK: Math.min(Number(body.topK) || 8, 12),
    returnMetadata: "all",
    filter: { type: "brain", nucleusId },
  });
  const results = [];
  for (const match of matches.matches || []) {
    const row = await env.DB.prepare(
      `SELECT id node_id,nucleus_id,name node_name,category,content,origin,
        review_status,confidence FROM brain_nodes
       WHERE id=? AND nucleus_id=? AND usable=1`,
    )
      .bind(match.metadata.nodeId, nucleusId)
      .first();
    if (row) results.push({ ...row, score: match.score });
  }
  return json({ results });
}

async function removeBrainNucleus(id, env) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM brain_nodes WHERE nucleus_id=?").bind(id),
    env.DB.prepare("DELETE FROM brain_nuclei WHERE id=?").bind(id),
  ]);
  return json({ removed: true, id });
}

async function cloudDashboard(env) {
  const [contacts, messages, human, documents] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) total FROM contacts"),
    env.DB.prepare("SELECT COUNT(*) total FROM messages"),
    env.DB.prepare("SELECT COUNT(*) total FROM contacts WHERE mode='human'"),
    env.DB.prepare("SELECT COUNT(*) total FROM knowledge_documents"),
  ]);
  return json({
    contacts: contacts.results[0]?.total || 0,
    messages: messages.results[0]?.total || 0,
    human: human.results[0]?.total || 0,
    documents: documents.results[0]?.total || 0,
  });
}

async function removeRecord(url, env) {
  const match = url.pathname.match(/^\/(instances|contacts|messages)\/(.+)$/);
  if (!match) return null;
  const [, type, encodedId] = match;
  const id = decodeURIComponent(encodedId);
  const table = {
    instances: "whatsapp_instances",
    contacts: "contacts",
    messages: "messages",
  }[type];
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return json({ removed: true, type, id });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health")
      return json({
        ok: true,
        service: "hurtz-assistente-api",
        database: "D1",
        knowledge: "Vectorize",
      });
    if (!authorized(request, env))
      return json({ error: "Não autorizado" }, 401);
    try {
      if (request.method === "POST" && url.pathname === "/knowledge")
        return await saveKnowledge(request, env);
      if (request.method === "POST" && url.pathname === "/search")
        return await search(request, env);
      if (request.method === "POST" && url.pathname === "/instances")
        return await saveInstance(request, env);
      if (request.method === "POST" && url.pathname === "/contacts")
        return await saveContact(request, env);
      if (request.method === "POST" && url.pathname === "/messages")
        return await saveMessage(request, env);
      if (request.method === "POST" && url.pathname === "/memory")
        return await saveMemory(request, env);
      if (request.method === "POST" && url.pathname === "/feedback")
        return await saveFeedback(request, env);
      if (request.method === "POST" && url.pathname === "/brain/nuclei")
        return await saveBrainNucleus(request, env);
      if (request.method === "POST" && url.pathname === "/brain/nodes")
        return await saveBrainNodes(request, env);
      if (request.method === "POST" && url.pathname === "/brain/search")
        return await searchBrain(request, env);
      if (
        request.method === "DELETE" &&
        url.pathname.startsWith("/brain/nuclei/")
      )
        return await removeBrainNucleus(
          decodeURIComponent(url.pathname.slice("/brain/nuclei/".length)),
          env,
        );
      if (request.method === "GET" && url.pathname === "/dashboard")
        return await cloudDashboard(env);
      if (request.method === "DELETE") {
        const removed = await removeRecord(url, env);
        if (removed) return removed;
      }
      if (request.method === "DELETE" && url.pathname.startsWith("/knowledge/"))
        return await removeKnowledge(
          decodeURIComponent(url.pathname.slice("/knowledge/".length)),
          env,
        );
      if (request.method === "GET" && url.pathname === "/documents") {
        const result = await env.DB.prepare(
          "SELECT * FROM knowledge_documents ORDER BY created_at DESC",
        ).all();
        return json({ documents: result.results });
      }
      return json({ error: "Rota não encontrada" }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: "Falha interna", detail: error.message }, 500);
    }
  },
};
