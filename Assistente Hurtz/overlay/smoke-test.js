const fs = require('fs');
for (const file of ['main.js','preload.js','index.html','renderer.js','styles.css']) {
  if (!fs.existsSync(require('path').join(__dirname, file))) throw new Error(`Ausente: ${file}`);
}
if (!fs.readFileSync(require('path').join(__dirname, 'main.js'), 'utf8').includes('setContentProtection(true)')) throw new Error('Proteção de captura ausente');
const html = fs.readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
for (const id of ['appVersion', 'setupScreen', 'choosePdfs', 'assistantInstructions', 'activateAssistant', 'workspace', 'presentationCard', 'activeDocument', 'guidanceText', 'nextGuidanceText']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Controle obrigatório ausente: ${id}`);
}
if (html.indexOf('id="presentationCard"') > html.indexOf('<nav class="tabs"')) {
  throw new Error('O teleprompter precisa ficar antes das áreas com scroll');
}
const css = fs.readFileSync(require('path').join(__dirname, 'styles.css'), 'utf8');
if (!css.includes('.live-coach{flex:0 0 auto')) throw new Error('O teleprompter não está fixado no layout');
if (!css.includes('.live-coach.is-reading') || !css.includes('.script-word.read')) {
  throw new Error('O destaque visual da leitura guiada está ausente');
}
const renderer = fs.readFileSync(require('path').join(__dirname, 'renderer.js'), 'utf8');
for (const eventName of ['leitura_guiada', 'leitura_guiada_concluida', 'roteiro_avancado']) {
  if (!renderer.includes(eventName)) throw new Error(`Evento visual ausente: ${eventName}`);
}
for (const channelMarker of ['VOCÊ • MICROFONE', 'PARTICIPANTE', 'intencao_ouvinte']) {
  if (!renderer.includes(channelMarker) && !html.includes(channelMarker)) {
    throw new Error(`Canal visual ausente: ${channelMarker}`);
  }
}
if (!css.includes('--blue:#72a8ed') || !css.includes('.transcript-item.me') || !css.includes('.transcript-item.remote')) {
  throw new Error('Cores dos canais de áudio ausentes');
}
if (!renderer.includes("createTypewriter('guidanceText', 32") || !renderer.includes("createTypewriter('nextGuidanceText', 40")) {
  throw new Error('A velocidade controlada de digitação não está configurada');
}
for (const obsolete of ['Comece a leitura. O assistente já está acompanhando', 'Preparando uma resposta...']) {
  if (html.includes(obsolete)) throw new Error(`Mensagem de espera obsoleta encontrada: ${obsolete}`);
}
console.log('[OK] Smoke test do overlay concluído');
