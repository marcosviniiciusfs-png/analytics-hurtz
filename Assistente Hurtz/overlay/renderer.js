const $ = (id) => document.getElementById(id);
const app = document.querySelector('.app');
let ws;
let reconnectTimer;
let sessionState = 'idle';
let compact = false;
let lastQuestion = '';
let noteCount = 0;
let backendReady = false;
let selectedPdfs = [];
const EXPECTED_BACKEND_VERSION = '1.1.0';
const modeDescriptions = {
  vendas: ['Vendas', 'Respostas comerciais com foco em valor e conversão.'],
  objecoes: ['Objeções', 'Ajuda a entender e responder resistências do cliente.'],
  apresentacao: ['Apresentação', 'Acompanha o PDF e sugere explicações curtas para falar.'],
  reuniao: ['Reunião', 'Prioriza decisões, notas, responsáveis e próximos passos.']
};
const guidanceTyping = createTypewriter('guidanceText', 32, true);
const nextTyping = createTypewriter('nextGuidanceText', 40, false);

function createTypewriter(elementId, interval, supportsReading) {
  const state = { target: '', shown: [], timer: null, read: new Set(), readTarget: 0, readTimer: null };
  const element = () => $(elementId);
  function render() {
    const node = element();
    node.replaceChildren();
    state.shown.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'script-word';
      if (supportsReading && state.read.has(index)) span.classList.add('read');
      span.textContent = word;
      node.append(span);
      if (index < state.shown.length - 1) node.append(' ');
    });
    node.classList.toggle('typing', state.shown.length < state.target.split(/\s+/).filter(Boolean).length);
  }
  function tick() {
    const words = state.target.split(/\s+/).filter(Boolean);
    if (state.shown.length < words.length) {
      state.shown.push(words[state.shown.length]);
      render();
    }
    if (state.shown.length >= words.length) {
      clearInterval(state.timer);
      state.timer = null;
      render();
    }
  }
  return {
    set(text) {
      const nextTarget = String(text || '').trim();
      if (!nextTarget || nextTarget === state.target) return;
      const isStreamingExtension = nextTarget.startsWith(state.target);
      state.target = nextTarget;
      if (!isStreamingExtension) {
        state.shown = [];
        state.read.clear();
        state.readTarget = 0;
        clearInterval(state.readTimer);
        state.readTimer = null;
      }
      if (!state.timer) state.timer = setInterval(tick, interval);
    },
    clear() {
      state.target = '';
      state.shown = [];
      state.read.clear();
      state.readTarget = 0;
      clearInterval(state.timer);
      clearInterval(state.readTimer);
      state.timer = null;
      state.readTimer = null;
      render();
    },
    highlight(indices) {
      const requested = indices || [];
      state.readTarget = requested.length ? Math.max(...requested) + 1 : state.readTarget;
      if (state.readTimer) return;
      state.readTimer = setInterval(() => {
        const nextIndex = state.read.size;
        if (nextIndex >= state.readTarget) {
          clearInterval(state.readTimer);
          state.readTimer = null;
          return;
        }
        state.read.add(nextIndex);
        element().querySelectorAll('.script-word')[nextIndex]?.classList.add('read');
      }, 22);
    },
    completeReading() {
      state.read = new Set(state.shown.map((_word, index) => index));
      state.readTarget = state.shown.length;
      element().querySelectorAll('.script-word').forEach((word) => word.classList.add('read'));
    }
  };
}

function setStatus(text) { $('status').textContent = text; }
function updateSetupAvailability() {
  const hasInstructions = $('assistantInstructions').value.trim().length >= 20;
  $('activateAssistant').disabled = !(backendReady && selectedPdfs.length && hasInstructions);
  if (!backendReady) $('setupStatus').textContent = 'Aguardando os componentes locais...';
  else if (!selectedPdfs.length) $('setupStatus').textContent = 'Selecione pelo menos um documento PDF.';
  else if (!hasInstructions) $('setupStatus').textContent = 'Escreva as instruções do assistente.';
  else $('setupStatus').textContent = 'Tudo pronto para preparar o assistente.';
}
function send(comando, extra = {}) {
  if (ws?.readyState !== WebSocket.OPEN) {
    setStatus('Backend desconectado');
    return false;
  }
  ws.send(JSON.stringify({ comando, ...extra }));
  return true;
}
function setSession(state) {
  sessionState = state;
  app.dataset.session = state;
  const button = $('startSession');
  button.textContent = state === 'active' ? 'Pausar' : state === 'paused' ? 'Retomar' : 'Iniciar';
  button.classList.toggle('primary', state !== 'active');
  $('finishSession').hidden = state === 'idle';
}
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((button) => button.classList.toggle('active', button.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === name));
  if (name === 'assist') $('answerBadge').hidden = true;
}
function showAnswer(question, answer, intent = 'pergunta') {
  lastQuestion = question;
  $('assistEmpty').hidden = true;
  $('thinking').hidden = true;
  $('answerCard').hidden = false;
  $('detectedQuestion').textContent = question;
  $('answerCard').dataset.intent = intent;
  $('answerCard').querySelector('.card-label span').textContent =
    intent === 'manual' ? 'RESPOSTA SOLICITADA' :
      intent === 'objecao' ? 'OBJEÇÃO DO PARTICIPANTE' : 'PERGUNTA DO PARTICIPANTE';
  $('answerText').textContent = answer;
  $('answerTime').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (!document.querySelector('[data-tab="assist"]').classList.contains('active')) $('answerBadge').hidden = false;
}
function addTranscript(message) {
  const list = $('transcriptList');
  list.querySelector('.placeholder')?.remove();
  const item = document.createElement('article');
  item.className = `transcript-item ${message.falante === 'eu' ? 'me' : `remote ${message.intencao || 'fala'}`}`;
  item.dataset.transcriptId = message.id || '';
  const label = message.falante === 'eu' ? 'VC' : 'PT';
  const origin = message.falante === 'eu'
    ? 'VOCÊ • MICROFONE'
    : `${message.intencao === 'objecao' ? 'OBJEÇÃO' : message.intencao === 'pergunta' ? 'PERGUNTA' : 'PARTICIPANTE'} • ÁUDIO DA CALL`;
  item.innerHTML = `<span class="speaker">${label}</span><div><small class="channel-origin"></small><p></p><time></time></div>`;
  item.querySelector('.channel-origin').textContent = origin;
  item.querySelector('p').textContent = message.texto;
  item.querySelector('time').textContent = message.horario || '';
  list.appendChild(item);
  while (list.children.length > 150) list.firstElementChild.remove();
  list.scrollTop = list.scrollHeight;
}
function updateTranscript(message) {
  const item = document.querySelector(`[data-transcript-id="${message.id}"]`);
  if (!item) return addTranscript(message);
  item.querySelector('p').textContent = message.texto;
  item.querySelector('time').textContent = message.horario || '';
  if (message.falante !== 'eu') {
    item.className = `transcript-item remote ${message.intencao || 'fala'}`;
    item.querySelector('.channel-origin').textContent =
      `${message.intencao === 'objecao' ? 'OBJEÇÃO' : message.intencao === 'pergunta' ? 'PERGUNTA' : 'PARTICIPANTE'} • ÁUDIO DA CALL`;
  }
  item.scrollIntoView({ block: 'nearest' });
}
function addNote(text) {
  const list = $('notesList');
  list.querySelector('.placeholder')?.remove();
  const item = document.createElement('div');
  item.className = 'note-item';
  item.textContent = text;
  list.prepend(item);
  noteCount += 1;
  $('noteBadge').textContent = noteCount;
  $('noteBadge').hidden = false;
}
function connect() {
  ws = new WebSocket('ws://127.0.0.1:8765');
  ws.onopen = () => setStatus('Pronto para iniciar');
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.tipo === 'ready') {
      $('appVersion').textContent = `v${message.versao || '—'}`;
      if (message.versao !== EXPECTED_BACKEND_VERSION) {
        backendReady = false;
        $('setupStatus').textContent = `Backend incompatível (${message.versao || 'antigo'}). Feche e abra o Assistente de Reunião novamente.`;
        setStatus('Atualização necessária');
        return;
      }
      backendReady = true;
      setSession(message.ativo ? 'active' : 'idle');
      setStatus('Configuração necessária');
      updateSetupAvailability();
      $('meetingSource').textContent = 'Aba da reunião desconectada';
      $('meetingSource').classList.remove('connected');
    } else if (message.tipo === 'fonte_reuniao') {
      const connected = message.estado === 'conectada';
      $('meetingSource').textContent = connected
        ? `Ouvindo: ${message.nome || 'aba da reunião'}`
        : 'Aba da reunião desconectada';
      $('meetingSource').classList.toggle('connected', connected);
      setStatus(connected ? 'Áudio isolado da reunião conectado' : 'Conecte a aba pela extensão Hurtz');
    } else if (message.tipo === 'sessao') {
      setSession(message.estado === 'ativa' ? 'active' : 'paused');
      setStatus(message.texto);
    } else if (message.tipo === 'transcricao') {
      addTranscript(message);
      setStatus('Ouvindo a reunião...');
    } else if (message.tipo === 'transcricao_atualizada') {
      updateTranscript(message);
      setStatus('Ouvindo a reunião...');
    } else if (message.tipo === 'documento_identificado') {
      $('thinking').hidden = true;
      $('assistEmpty').hidden = true;
      $('presentationCard').hidden = false;
      $('activeDocument').textContent = `${message.arquivo}${message.trecho_numero ? ` • trecho ${message.trecho_numero}` : ''}`;
      $('documentConfidence').textContent = `Correspondência ${message.confianca}`;
      if (!document.querySelector('[data-tab="assist"]').classList.contains('active')) $('answerBadge').hidden = false;
    } else if (message.tipo === 'documento_pronto') {
      $('thinking').hidden = true;
      $('assistEmpty').hidden = true;
      $('presentationCard').hidden = false;
      $('activeDocument').textContent = message.arquivo;
      $('documentConfidence').textContent = 'Documento preparado';
      guidanceTyping.clear();
      nextTyping.clear();
      setStatus('Acompanhamento ativo');
    } else if (message.tipo === 'orientacao_inicio') {
      $('thinking').hidden = true;
      $('assistEmpty').hidden = true;
      $('presentationCard').hidden = false;
      $('activeDocument').textContent = `${message.arquivo}${message.trecho_numero ? ` • trecho ${message.trecho_numero}` : ''}`;
      $('documentConfidence').textContent = `Correspondência ${message.confianca}`;
      if (message.agora) guidanceTyping.set(message.agora);
      if (message.depois) nextTyping.set(message.depois);
      setStatus('Acompanhando a leitura...');
    } else if (message.tipo === 'orientacao_delta') {
      $('thinking').hidden = true;
      if (message.agora) guidanceTyping.set(message.agora);
      if (message.depois) nextTyping.set(message.depois);
      setStatus('Acompanhando a leitura...');
    } else if (message.tipo === 'orientacao_apresentacao') {
      $('presentationCard').hidden = false;
      $('thinking').hidden = true;
      if (message.agora) guidanceTyping.set(message.agora);
      if (message.depois) nextTyping.set(message.depois);
      $('activeDocument').textContent = `${message.arquivo}${message.trecho_numero ? ` • trecho ${message.trecho_numero}` : ''}`;
      setStatus('Orientação de apresentação pronta');
    } else if (message.tipo === 'leitura_guiada') {
      $('presentationCard').classList.add('is-reading');
      guidanceTyping.highlight(message.indices_lidos || []);
      setStatus(`Lendo a sugestão • ${Math.round((message.progresso || 0) * 100)}%`);
    } else if (message.tipo === 'leitura_guiada_concluida') {
      $('presentationCard').classList.add('is-reading');
      guidanceTyping.completeReading();
      setStatus('Sugestão concluída');
    } else if (message.tipo === 'roteiro_avancado') {
      $('presentationCard').classList.remove('is-reading');
      guidanceTyping.set(message.agora || '');
      if (message.depois) nextTyping.set(message.depois);
      else nextTyping.clear();
      setStatus('Próxima fala disponível');
    } else if (message.tipo === 'intencao_ouvinte') {
      $('answerCard').dataset.intent = message.intencao;
      setStatus(message.intencao === 'objecao' ? 'Objeção detectada no áudio da call' : 'Pergunta detectada no áudio da call');
    } else if (message.tipo === 'processando') {
      if ($('mode').value === 'apresentacao') {
        $('thinking').hidden = true;
        setStatus('Acompanhando a leitura...');
        return;
      }
      $('thinking').hidden = false;
      $('thinking').querySelector('span').textContent = message.texto;
      setStatus(message.texto);
    } else if (message.tipo === 'resposta') {
      showAnswer(message.pergunta, message.texto, message.manual ? 'manual' : message.intencao);
      setStatus('Resposta pronta');
    } else if (message.tipo === 'nota') {
      addNote(message.texto);
    } else if (message.tipo === 'encerramento') {
      setSession('idle');
      $('thinking').hidden = true;
      $('summaryText').textContent = message.resumo || 'Resumo indisponível.';
      $('nextSteps').replaceChildren(...(message.proximos_passos || []).map((text) => {
        const li = document.createElement('li'); li.textContent = text; return li;
      }));
      (message.notas || []).forEach((note) => addNote(note));
      $('meetingResult').hidden = false;
      showTab('notes');
      setStatus('Reunião finalizada');
    } else if (message.tipo === 'configurando') {
      $('activateAssistant').disabled = true;
      $('activateAssistant').textContent = 'Indexando documentos...';
      $('setupStatus').textContent = message.texto;
    } else if (message.tipo === 'configurado') {
      $('setupScreen').hidden = true;
      $('workspace').hidden = false;
      $('mode').hidden = false;
      $('startSession').hidden = false;
      $('activateAssistant').textContent = 'Preparar e ativar assistente';
      setStatus(`${message.total_trechos} trechos prontos`);
      $('mode').value = 'apresentacao';
      const [modeTitle, modeDescription] = modeDescriptions.apresentacao;
      $('modeHelp').querySelector('b').textContent = modeTitle;
      $('modeHelp').querySelector('span').textContent = modeDescription;
      send('modo', { valor: 'apresentacao' });
      send('iniciar');
    } else if (message.tipo === 'erro_configuracao') {
      $('activateAssistant').textContent = 'Preparar e ativar assistente';
      $('setupStatus').textContent = message.texto;
      updateSetupAvailability();
    } else if (message.tipo === 'erro') {
      $('thinking').hidden = true;
      setStatus(message.texto);
    }
  };
  ws.onclose = () => {
    backendReady = false;
    updateSetupAvailability();
    setStatus('Backend desconectado — reconectando...');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 1800);
  };
  ws.onerror = () => ws.close();
}

$('choosePdfs').onclick = async () => {
  const paths = await window.overlay.chooseTrainingPdfs();
  if (!paths.length) return;
  selectedPdfs = [...new Set([...selectedPdfs, ...paths])];
  $('selectedFiles').replaceChildren(...selectedPdfs.map((path) => {
    const row = document.createElement('div');
    row.className = 'file-row';
    const name = path.split(/[\\/]/).pop();
    const label = document.createElement('span');
    label.textContent = name;
    const state = document.createElement('strong');
    state.textContent = 'SELECIONADO';
    row.append(label, state);
    return row;
  }));
  updateSetupAvailability();
};
$('assistantInstructions').oninput = updateSetupAvailability;
$('activateAssistant').onclick = () => {
  if (!backendReady || !selectedPdfs.length) return;
  send('configurar', {
    documentos: selectedPdfs,
    instrucoes: $('assistantInstructions').value.trim()
  });
};
document.querySelectorAll('.tabs button').forEach((button) => button.onclick = () => showTab(button.dataset.tab));
$('startSession').onclick = () => {
  if (sessionState === 'idle') {
    $('transcriptList').innerHTML = '<p class="placeholder">Aguardando a primeira fala...</p>';
    $('notesList').innerHTML = '<p class="placeholder">Nenhuma nota registrada.</p>';
    $('meetingResult').hidden = true;
    noteCount = 0;
    $('noteBadge').hidden = true;
    send('iniciar');
  }
  else if (sessionState === 'active') send('pausar');
  else send('retomar');
};
$('finishSession').onclick = () => send('encerrar');
$('mode').onchange = () => {
  const [title, description] = modeDescriptions[$('mode').value];
  $('modeHelp').querySelector('b').textContent = title;
  $('modeHelp').querySelector('span').textContent = description;
  send('modo', { valor: $('mode').value });
};
$('askForm').onsubmit = (event) => {
  event.preventDefault();
  const text = $('askInput').value.trim();
  if (text && send('perguntar', { texto: text })) {
    lastQuestion = text;
    $('askInput').value = '';
    $('thinking').hidden = false;
    showTab('assist');
  }
};
$('askInput').onkeydown = (event) => {
  if (event.key === 'Enter' && event.ctrlKey) $('askForm').requestSubmit();
};
$('noteForm').onsubmit = (event) => {
  event.preventDefault();
  const text = $('noteInput').value.trim();
  if (text && send('nota', { texto: text })) $('noteInput').value = '';
};
$('copyAnswer').onclick = () => navigator.clipboard.writeText($('answerText').textContent);
$('regenerateAnswer').onclick = () => lastQuestion && send('perguntar', { texto: lastQuestion });
$('shortenAnswer').onclick = () => lastQuestion && send('perguntar', { texto: `Responda em no máximo duas frases: ${lastQuestion}` });
$('clearTranscript').onclick = () => $('transcriptList').innerHTML = '<p class="placeholder">A tela foi limpa. A sessão continua sendo registrada.</p>';
$('toggleExpand').onclick = () => {
  compact = !compact;
  document.body.classList.toggle('compact', compact);
  window.overlay.compact(compact);
};
$('hideWindow').onclick = () => window.overlay.minimize();
$('closeWindow').onclick = () => {
  clearTimeout(reconnectTimer);
  window.overlay.close();
};
connect();
