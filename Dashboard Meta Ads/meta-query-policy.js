'use strict';

// Read-only reports. Never cache or automatically retry campaign mutations.
function createQueryPolicy({now = Date.now, freshMs = 300000, maxEntries = 150, maxBytes = 32 * 1024 * 1024} = {}) {
  const cache = new Map(), pending = new Map(), queue = [];
  let active = false, bytes = 0, blockedUntil = 0, strikes = 0, lastLimit = 0;
  const limited = () => Object.assign(new Error('A Meta limitou as consultas. Os dados já carregados foram preservados. Aguarde antes de atualizar.'), {status: 429, retryAfter: Math.max(1, Math.ceil((blockedUntil - now()) / 1000))});
  function pause(seconds = 120) {
    strikes = now() - lastLimit < 3600000 ? strikes + 1 : 1;
    lastLimit = now();
    blockedUntil = Math.max(blockedUntil, now() + Math.max(seconds, Math.min(1800, 120 * 2 ** (strikes - 1))) * 1000);
  }
  function drain() {
    if (active || !queue.length) return;
    const job = queue.shift(); active = true;
    Promise.resolve().then(() => {
      if (blockedUntil > now()) throw limited();
      return job.work();
    }).then(job.resolve, job.reject).finally(() => { active = false; drain(); });
  }
  function schedule(work) {
    if (queue.length >= 20) return Promise.reject(Object.assign(new Error('Há muitas consultas em andamento. Aguarde um minuto antes de atualizar.'), {status: 429, retryAfter: 60}));
    return new Promise((resolve, reject) => { queue.push({work, resolve, reject}); drain(); });
  }
  function put(key, value) {
    const size = Buffer.byteLength(JSON.stringify(value));
    if (size > maxBytes) return;
    if (cache.has(key)) { bytes -= cache.get(key).size; cache.delete(key); }
    cache.set(key, {value, size, time: now()}); bytes += size;
    while (cache.size > maxEntries || bytes > maxBytes) { const oldest = cache.keys().next().value; bytes -= cache.get(oldest).size; cache.delete(oldest); }
  }
  async function report(scope, input, load, refresh = false) {
    const keyFor = id => JSON.stringify([scope, input.kind, input.from, input.to, Boolean(input.reportOnly), id]);
    const missing = input.ids.filter(id => {
      const entry = cache.get(keyFor(id));
      return !(entry && now() - entry.time < (refresh ? 60000 : freshMs)) && !pending.has(keyFor(id));
    });
    if (missing.length) {
      const job = schedule(async () => {
        let result;
        try { result = await load({...input, ids: missing}); }
        catch (error) { if (error.status === 429) pause(error.retryAfter); throw error; }
        const rows = Object.values(result.accounts || {});
        if (rows.some(row => row.rate_limited)) pause(Math.max(...rows.map(row => Number(row.retry_after) || 0)));
        for (const id of missing) {
          const row = result.accounts?.[id];
          if (row && !row.error && !row.rate_limited && row.reconciled !== false) put(keyFor(id), row);
        }
        return result;
      });
      for (const id of missing) {
        const key = keyFor(id), promise = job.then(result => {
          const row = result.accounts?.[id];
          if (row?.rate_limited) throw limited();
          return row || {id, error: 'A consulta não retornou dados para esta conta.', reconciled: false};
        }).finally(() => pending.delete(key));
        // Each promise has a handler even if another account rejects first.
        promise.catch(() => {}); pending.set(key, promise);
      }
    }
    const rows = await Promise.all(input.ids.map(async id => {
      const key = keyFor(id), entry = cache.get(key);
      if (entry && now() - entry.time < (refresh ? 60000 : freshMs)) return [id, entry.value];
      return [id, await pending.get(key)];
    }));
    return {since: input.from, until: input.to, accounts: Object.fromEntries(rows)};
  }
  return {report, pause};
}
module.exports = {createQueryPolicy};
