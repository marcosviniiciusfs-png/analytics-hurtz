const OFFSCREEN_DOCUMENT = 'offscreen.html';

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL(OFFSCREEN_DOCUMENT);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url]
  });
  if (contexts.length) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT,
    reasons: ['USER_MEDIA'],
    justification: 'Capturar somente o áudio da aba de reunião selecionada pelo usuário.'
  });
}

async function setStatus(status) {
  await chrome.storage.local.set({ hurtzCaptureStatus: status });
  chrome.runtime.sendMessage({ target: 'popup', type: 'status', status }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target === 'offscreen' || message.target === 'popup') return false;

  if (message.type === 'get-status') {
    chrome.storage.local.get('hurtzCaptureStatus').then(({ hurtzCaptureStatus }) => {
      sendResponse(hurtzCaptureStatus || { state: 'idle' });
    });
    return true;
  }

  if (message.type === 'start-capture') {
    (async () => {
      try {
        await setStatus({ state: 'connecting', title: message.tab.title });
        await ensureOffscreenDocument();
        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: message.tab.id
        });
        await chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'start',
          streamId,
          tab: message.tab
        });
        sendResponse({ ok: true });
      } catch (error) {
        const status = { state: 'error', message: error.message };
        await setStatus(status);
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'stop-capture') {
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop' })
      .finally(() => setStatus({ state: 'idle' }));
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'capture-status') {
    setStatus(message.status);
    return false;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  setStatus({ state: 'idle' });
});
