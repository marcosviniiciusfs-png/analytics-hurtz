const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plan, localOllama } = require('../Dashboard Meta Ads/campaign-planner');

const draft = {
  name: 'Campanha de teste',
  headline: 'Título de teste',
  message: 'Texto principal de teste.',
  rationale: 'Rascunho validado para revisão.',
  destination: 'form',
  locationQuery: 'São Paulo',
  ageMin: 25,
  ageMax: 45,
  dailyBudget: 30,
  category: '',
  interestQueries: [],
  placements: 'automatic'
};

const config = {
  groq: { key: 'private-key', model: 'groq-model', url: 'https://groq.test/chat' },
  ollama: { model: 'qwen2.5:0.5b', url: 'http://127.0.0.1:11434/api/chat' }
};
const groqReply = value => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(value) } }] })
});
const ollamaReply = value => ({
  ok: true,
  status: 200,
  json: async () => ({ message: { content: JSON.stringify(value) } })
});

test('fails clearly when no provider is configured', async () => {
  await assert.rejects(
    plan({}, { config: {}, fetchImpl: async () => { throw new Error('should not fetch'); } }),
    /não está configurada/
  );
});

test('uses Groq as the primary provider', async () => {
  const calls = [];
  const result = await plan({ prompt: 'teste' }, {
    config,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return groqReply(draft);
    }
  });

  assert.deepEqual(result, draft);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, config.groq.url);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-key');
});

test('falls back to Ollama when Groq fails', async () => {
  const calls = [];
  const result = await plan({ prompt: 'teste' }, {
    config,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url === config.groq.url) return { ok: false, status: 429, json: async () => ({}) };
      return ollamaReply(draft);
    }
  });

  assert.deepEqual(result, draft);
  assert.deepEqual(calls.map(call => call.url), [config.groq.url, config.ollama.url]);
  assert.equal(JSON.parse(calls[1].options.body).stream, false);
  assert.equal(JSON.parse(calls[1].options.body).format.type, 'object');
  assert.equal(JSON.parse(calls[1].options.body).options.num_predict, 700);
});

test('returns a neutral service error only after both providers fail', async () => {
  await assert.rejects(
    plan({ prompt: 'teste' }, {
      config,
      fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) })
    }),
    /temporariamente indisponível/
  );
});

test('accepts only loopback Ollama endpoints', () => {
  assert.equal(localOllama('http://127.0.0.1:11434/api/chat'), true);
  assert.equal(localOllama('http://localhost:11434/api/chat'), true);
  assert.equal(localOllama('http://analytics_ollama:11434/api/chat'), true);
  assert.equal(localOllama('https://ollama.example.com/api/chat'), false);
});
