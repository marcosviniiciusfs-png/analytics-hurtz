let mediaStream = null;
let audioContext = null;
let processor = null;
let socket = null;
let sourceInfo = null;
let stopping = false;
let connectionErrored = false;
let pendingChunks = [];
let pendingLength = 0;

function notify(status) {
  chrome.runtime.sendMessage({
    type: 'capture-status',
    status
  }).catch(() => {});
}

async function stopCapture(notifyIdle = true) {
  stopping = true;
  if (processor) processor.disconnect();
  if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
  if (audioContext) await audioContext.close().catch(() => {});
  if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000, 'Captura encerrada');
  mediaStream = null;
  audioContext = null;
  processor = null;
  socket = null;
  sourceInfo = null;
  pendingChunks = [];
  pendingLength = 0;
  stopping = false;
  if (notifyIdle) notify({ state: 'idle' });
}

async function startCapture(streamId, tab) {
  await stopCapture(false);
  sourceInfo = tab;
  connectionErrored = false;
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(mediaStream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentOutput = audioContext.createGain();
  silentOutput.gain.value = 0;

  // tabCapture interrompe a reprodução original. Esta ligação mantém a
  // reunião audível para o usuário sem misturá-la a outras abas.
  source.connect(audioContext.destination);
  source.connect(processor);
  processor.connect(silentOutput);
  silentOutput.connect(audioContext.destination);

  socket = new WebSocket('ws://127.0.0.1:8766');
  socket.binaryType = 'arraybuffer';
  socket.onopen = () => {
    socket.send(JSON.stringify({
      tipo: 'fonte',
      titulo: tab.title,
      url: tab.url
    }));
    notify({ state: 'active', title: tab.title, url: tab.url });
  };
  socket.onerror = () => {
    connectionErrored = true;
    notify({
      state: 'error',
      message: 'Abra o Assistente de Reunião antes de conectar a aba.'
    });
  };
  socket.onclose = () => {
    if (!stopping) stopCapture(false);
    if (!connectionErrored) notify({ state: 'idle' });
  };

  processor.onaudioprocess = (event) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 1_000_000) return;
    const samples = new Float32Array(event.inputBuffer.getChannelData(0));
    pendingChunks.push(samples);
    pendingLength += samples.length;
    if (pendingLength < audioContext.sampleRate * .5) return;
    const combined = new Float32Array(pendingLength);
    let offset = 0;
    for (const chunk of pendingChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    pendingChunks = [];
    pendingLength = 0;
    const packet = new ArrayBuffer(4 + combined.length * 4);
    new DataView(packet).setUint32(0, audioContext.sampleRate, true);
    new Float32Array(packet, 4).set(combined);
    socket.send(packet);
  };

  mediaStream.getAudioTracks()[0]?.addEventListener('ended', () => stopCapture());
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;
  if (message.type === 'start') {
    startCapture(message.streamId, message.tab)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        notify({ state: 'error', message: error.message });
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }
  if (message.type === 'stop') {
    stopCapture().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
