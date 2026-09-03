const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const STATE_PATH = path.resolve(process.cwd(), 'higgsfield_judo_state.json');

function readState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function writeState(next) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
}

function findVideoPath() {
  const cwd = process.cwd();
  const videoDir = fs.readdirSync(cwd, { withFileTypes: true })
    .find((d) => d.isDirectory() && d.name.toLowerCase().includes('deo') && d.name.toLowerCase().includes('editar'));
  if (!videoDir) throw new Error('Pasta do video nao encontrada');
  const videoFile = fs.readdirSync(path.join(cwd, videoDir.name), { withFileTypes: true })
    .find((f) => f.isFile() && f.name.toLowerCase().endsWith('.mp4'));
  if (!videoFile) throw new Error('Arquivo mp4 nao encontrado');
  return {
    videoPath: path.join(cwd, videoDir.name, videoFile.name),
    filename: videoFile.name,
  };
}

function findFinalEditPath(kind = 'local') {
  const cwd = process.cwd();
  const videoDir = fs.readdirSync(cwd, { withFileTypes: true })
    .find((d) => d.isDirectory() && d.name.toLowerCase().includes('deo') && d.name.toLowerCase().includes('editar'));
  if (!videoDir) throw new Error('Pasta do video nao encontrada');
  const targetName =
    kind === 'v2_upscaled' ? 'judo_edit_epico_v2_upscaled.mp4'
      : kind === 'v2' ? 'judo_edit_epico_v2.mp4'
        : kind === 'v3_final' ? 'judo_edit_epico_v3_FINAL.mp4'
          : kind === 'v4_real' ? 'judo_edit_epico_v4_musica_real.mp4'
            : kind === 'upscaled' ? 'judo_edit_epico_upscaled.mp4'
              : 'judo_edit_epico_local.mp4';
  const finalFile = fs.readdirSync(path.join(cwd, videoDir.name), { withFileTypes: true })
    .find((f) => f.isFile() && f.name === targetName);
  if (!finalFile) throw new Error('Arquivo final local nao encontrado');
  return {
    videoPath: path.join(cwd, videoDir.name, finalFile.name),
    filename: finalFile.name,
  };
}

function extractStructured(result) {
  if (result && result.structuredContent) return result.structuredContent;
  if (Array.isArray(result && result.content)) {
    for (const c of result.content) {
      if (c.type === 'text') {
        try {
          return JSON.parse(c.text);
        } catch {}
      }
    }
  }
  return result;
}

function findUploadInfo(obj) {
  const seen = new Set();
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    const uploadUrl = cur.upload_url || cur.uploadUrl;
    const mediaId = cur.media_id || cur.mediaId || cur.id;
    if (typeof uploadUrl === 'string' && typeof mediaId === 'string') return { uploadUrl, mediaId };
    if (Array.isArray(cur)) stack.push(...cur);
    else stack.push(...Object.values(cur));
  }
  throw new Error('upload_url/media_id nao encontrados');
}

function findId(obj, keys) {
  const seen = new Set();
  const stack = [obj];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    for (const k of keys) {
      if (typeof cur[k] === 'string') return cur[k];
    }
    if (Array.isArray(cur)) stack.push(...cur);
    else stack.push(...Object.values(cur));
  }
  return null;
}

function createClient() {
  const child = spawn('cmd.exe', ['/c', 'npx.cmd', '-y', 'mcp-remote', 'https://mcp.higgsfield.ai/mcp'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let buffer = '';
  let nextId = 1;
  const pending = new Map();

  function send(method, params, timeoutMs = 120000) {
    const id = nextId++;
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(new Error(`Timeout esperando ${method}`));
      }, timeoutMs);
    });
  }

  child.stdout.on('data', (d) => {
    buffer += d.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && pending.has(msg.id)) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
          else p.resolve(msg.result);
        }
      } catch {}
    }
  });

  child.stderr.on('data', (d) => {
    const s = d.toString();
    if (/error|failed|unauth|expired/i.test(s)) process.stderr.write(s);
  });

  async function init() {
    await new Promise((r) => setTimeout(r, 800));
    await send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'codex-judo-edit', version: '1.0.0' },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');
  }

  return {
    init,
    callTool: (name, args, timeoutMs) => send('tools/call', { name, arguments: args }, timeoutMs),
    close: () => child.kill('SIGTERM'),
  };
}

async function main() {
  const step = process.argv[2];
  const state = readState();
  const client = createClient();
  await client.init();

  try {
    if (step === 'upload-url') {
      const finalKinds = new Set(['final', 'upscaled', 'v2', 'v2_upscaled', 'v3_final', 'v4_real']);
      const isFinal = finalKinds.has(process.argv[3]);
      const { videoPath, filename } = isFinal
        ? findFinalEditPath(process.argv[3] === 'final' ? 'local' : process.argv[3])
        : findVideoPath();
      const upload = extractStructured(await client.callTool('media_upload', {
        filename,
        content_type: 'video/mp4',
      }));
      const info = findUploadInfo(upload);
      const prefix = isFinal ? (process.argv[3] === 'final' ? 'final' : process.argv[3]) : '';
      const next = prefix
        ? {
            ...state,
            [`${prefix}VideoPath`]: videoPath,
            [`${prefix}Filename`]: filename,
            [`${prefix}Upload`]: upload,
            [`${prefix}UploadUrl`]: info.uploadUrl,
            [`${prefix}MediaId`]: info.mediaId,
            [`${prefix}PublicUrl`]: upload.uploads?.[0]?.url || null,
          }
        : { ...state, videoPath, filename, upload, ...info };
      writeState(next);
      console.log(JSON.stringify({ filename, mediaId: info.mediaId, uploadUrl: info.uploadUrl.slice(0, 80) + '...' }, null, 2));
      return;
    }

    if (step === 'put') {
      const finalKinds = new Set(['final', 'upscaled', 'v2', 'v2_upscaled', 'v3_final', 'v4_real']);
      const isFinal = finalKinds.has(process.argv[3]);
      const prefix = process.argv[3] === 'final' ? 'final' : process.argv[3];
      const uploadUrl = isFinal ? state[`${prefix}UploadUrl`] : state.uploadUrl;
      const videoPath = isFinal ? state[`${prefix}VideoPath`] : state.videoPath;
      if (!uploadUrl || !videoPath) throw new Error('Rode upload-url antes');
      const bytes = fs.readFileSync(videoPath);
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: bytes });
      const next = isFinal
        ? { ...state, [`${prefix}PutStatus`]: res.status, [`${prefix}PutStatusText`]: res.statusText }
        : { ...state, putStatus: res.status, putStatusText: res.statusText };
      writeState(next);
      if (!res.ok) throw new Error(`PUT falhou: ${res.status} ${res.statusText} ${await res.text()}`);
      console.log(JSON.stringify({ putStatus: res.status, putStatusText: res.statusText }, null, 2));
      return;
    }

    if (step === 'confirm') {
      const finalKinds = new Set(['final', 'upscaled', 'v2', 'v2_upscaled', 'v3_final', 'v4_real']);
      const isFinal = finalKinds.has(process.argv[3]);
      const prefix = process.argv[3] === 'final' ? 'final' : process.argv[3];
      const mediaId = isFinal ? state[`${prefix}MediaId`] : state.mediaId;
      if (!mediaId) throw new Error('Rode upload-url antes');
      const confirm = extractStructured(await client.callTool('media_confirm', { type: 'video', media_id: mediaId }));
      const confirmedVideoId = findId(confirm, ['media_id', 'video_input_id', 'id']) || mediaId;
      writeState(isFinal ? { ...state, [`${prefix}Confirm`]: confirm, [`${prefix}ConfirmedVideoId`]: confirmedVideoId } : { ...state, confirm, confirmedVideoId });
      console.log(JSON.stringify({ confirmedVideoId, confirm }, null, 2));
      return;
    }

    if (step === 'analysis-create') {
      if (!state.confirmedVideoId) throw new Error('Rode confirm antes');
      const analysis = extractStructured(await client.callTool('video_analysis_create', { video_input_id: state.confirmedVideoId }));
      const analysisId = findId(analysis, ['video_analyze_id', 'analysis_id', 'id']);
      if (!analysisId) throw new Error('video_analyze_id nao encontrado');
      writeState({ ...state, analysis, analysisId });
      console.log(JSON.stringify({ analysisId, analysis }, null, 2));
      return;
    }

    if (step === 'analysis-status') {
      if (!state.analysisId) throw new Error('Rode analysis-create antes');
      const status = extractStructured(await client.callTool('video_analysis_status', { video_analyze_id: state.analysisId }));
      writeState({ ...state, analysisStatus: status });
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    if (step === 'presets') {
      const cursor = process.argv[3];
      const presets = extractStructured(await client.callTool('shorts_studio_list_presets', cursor ? { cursor } : {}));
      writeState({ ...state, presets });
      const items = presets.items || presets.result?.items || presets.presets || [];
      console.log(JSON.stringify({
        count: items.length,
        next_cursor: presets.next_cursor || presets.result?.next_cursor || null,
        items: items.map((item) => ({
          id: item.id || item.preset_id,
          name: item.name || item.title,
          preset_source: item.preset_source,
          description: item.description || item.prompt || item.subtitle || null,
        })),
      }, null, 2));
      return;
    }

    if (step === 'shorts-create') {
      if (!state.confirmedVideoId) throw new Error('Rode confirm antes');
      const presetId = process.argv[3] || '4ae118f4-fcb4-40d3-b809-a0b28a50f2e9';
      const presetSource = process.argv[4] || 'cms';
      const session = extractStructured(await client.callTool('shorts_studio_create', {
        source_video_id: state.confirmedVideoId,
        preset_id: presetId,
        preset_source: presetSource,
        aspect_ratio: '9:16',
        resolution: '720p',
      }, 180000));
      const sessionId = findId(session, ['session_id', 'id']);
      writeState({ ...state, shortsPresetId: presetId, shortsPresetSource: presetSource, shortsSession: session, shortsSessionId: sessionId });
      console.log(JSON.stringify({ sessionId, session }, null, 2));
      return;
    }

    if (step === 'shorts-status') {
      if (!state.shortsSessionId) throw new Error('Rode shorts-create antes');
      const status = extractStructured(await client.callTool('shorts_studio_status', { session_id: state.shortsSessionId }, 180000));
      writeState({ ...state, shortsStatus: status });
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    if (step === 'job-status') {
      const jobId = process.argv[3] || state.finalJobId;
      if (!jobId) throw new Error('Informe job id');
      const status = extractStructured(await client.callTool('job_status', { jobId, sync: true }, 180000));
      writeState({ ...state, lastJobStatus: status });
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    if (step === 'job-display') {
      const jobId = process.argv[3] || state.finalJobId;
      if (!jobId) throw new Error('Informe job id');
      const display = extractStructured(await client.callTool('job_display', { id: jobId }, 180000));
      writeState({ ...state, lastJobDisplay: display });
      console.log(JSON.stringify(display, null, 2));
      return;
    }

    if (step === 'reframe') {
      const videoId = process.argv[3] || state.finalConfirmedVideoId || state.bestShortJobId;
      if (!videoId) throw new Error('Informe video/job id para reframe');
      const reframe = extractStructured(await client.callTool('reframe', {
        params: {
          aspect_ratio: '9:16',
          duration_seconds: 18.7,
          resolution: '720p',
          medias: [{ value: videoId, role: 'video' }],
        },
      }, 180000));
      const jobId = findId(reframe, ['job_id', 'id']);
      writeState({ ...state, reframe, reframeJobId: jobId, finalJobId: jobId || state.finalJobId });
      console.log(JSON.stringify({ jobId, reframe }, null, 2));
      return;
    }

    if (step === 'upscale') {
      const videoId = process.argv[3] || state.reframeJobId || state.finalConfirmedVideoId || state.bestShortJobId;
      if (!videoId) throw new Error('Informe video/job id para upscale');
      const upscale = extractStructured(await client.callTool('upscale_video', {
        params: {
          provider: 'topaz',
          video_id: videoId,
          aspect_ratio: '9:16',
          resolution: '1080p',
        },
      }, 180000));
      const jobId = findId(upscale, ['job_id', 'id']);
      writeState({ ...state, upscale, upscaleJobId: jobId, finalJobId: jobId || state.finalJobId });
      console.log(JSON.stringify({ jobId, upscale }, null, 2));
      return;
    }

    if (step === 'recommend-video') {
      const recommendation = extractStructured(await client.callTool('models_explore', {
        action: 'recommend',
        type: 'video',
        query: 'Create a 15-20 second vertical 9:16 epic social media sports highlight edit from an uploaded 79 second judo fight video. Need preserve best action moments, throws and pin, cinematic impact.',
        limit: 10,
      }, 180000));
      writeState({ ...state, videoModelRecommendation: recommendation });
      console.log(JSON.stringify(recommendation, null, 2));
      return;
    }

    if (step === 'model-get') {
      const modelId = process.argv[3];
      if (!modelId) throw new Error('Informe model id');
      const model = extractStructured(await client.callTool('models_explore', {
        action: 'get',
        model_id: modelId,
      }, 180000));
      writeState({ ...state, lastModel: model });
      console.log(JSON.stringify(model, null, 2));
      return;
    }

    if (step === 'generate-video') {
      if (!state.confirmedVideoId) throw new Error('Rode confirm antes');
      const model = process.argv[3] || 'seedance_2_0';
      const generated = extractStructured(await client.callTool('generate_video', {
        params: {
          model,
          prompt: [
            'Transform the uploaded vertical judo fight into an epic short social media sports highlight edit.',
            'Target 15-20 seconds, vertical 9:16.',
            'Keep only the essential action: 1-2 seconds context, 3-4 seconds tense grip fighting, full impact of the main throw, 4-5 seconds ground fight, full second decisive throw/pin/final control, 1-2 seconds celebration/podium reaction.',
            'Use cinematic sports trailer pacing, energetic zoom transitions, impact emphasis at the throws, dramatic glow-like highlights around the attacking judoka when possible, strong contrast, sharp motion, no text overlays.'
          ].join(' '),
          aspect_ratio: '9:16',
          duration: 15,
          resolution: '720p',
          mode: 'std',
          bitrate_mode: 'high',
          genre: 'epic',
          generate_audio: true,
          medias: [{ value: state.confirmedVideoId, role: 'video_references' }],
        },
      }, 180000));
      const jobId = findId(generated, ['job_id', 'id']);
      writeState({ ...state, generatedVideo: generated, generatedVideoJobId: jobId, bestShortJobId: jobId, finalJobId: jobId });
      console.log(JSON.stringify({ jobId, generated }, null, 2));
      return;
    }

    throw new Error('Passo invalido');
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
