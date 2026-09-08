// Local inspection only. No production API, credentials, SSH or background jobs.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../Dashboard Meta Ads');
const features=[
 ['Visão geral e contas','overview','Gastos reconciliados, saldo, depósitos, limites diários, filtros, perfis e detalhes das campanhas.','Disponível no acesso individual publicado.'],
 ['Análise','analysis','Público por idade, localização, posicionamento, formato, comparações e histórico de até 90 dias.','Disponível no acesso individual publicado.'],
 ['Relatórios','reports','Relatórios por período, anúncios, edição de PNG, download em lote e impressão/PDF.','Disponível no acesso individual publicado.'],
 ['Pesquisa de criativos','creative-search','Busca de vídeos no TikTok e Instagram, termos, período, ordenação, filtros de conteúdo, capas sem texto, visualização e downloads.','Oculta no acesso individual. Backend usa Apify; as sessões de pesquisa ainda precisam de isolamento por usuário.'],
 ['Tarefas','tasks','Quadro de etapas, projetos, módulos, ciclos, responsáveis, prioridade, prazos, subtarefas, comentários, anexos e notificações.','Oculta no acesso individual. O armazenamento atual é compartilhado.'],
 ['Comentários dos anúncios','comments','Pesquisa por conta, moderação e histórico. A exclusão tem confirmação própria.','Existe na versão local, fora da publicação anterior. Depende das permissões da Meta e de isolamento por usuário.'],
 ['Alertas e teste de WhatsApp','alerts','Limites de gasto e saldo, velocidade de consumo, resumos, horários, QR Code, grupos e prévia da mensagem de teste.','Oculta no acesso individual. Configuração e instâncias atuais são compartilhadas.'],
 ['Configurações',null,'Há um item no menu, mas ele aponta para #. Não encontrei uma tela independente vinculada a esse item.','As configurações reais estão distribuídas entre perfis, contas, pesquisa e alertas.'],
 ['Analisador local de criativos',null,'Agente com Ollama, Qwen e FFmpeg para classificar quadros de vídeo usando a GPU.','Ferramenta auxiliar na pasta Hurtz Creative Analyzer. A execução depende da configuração do agente e da flag de auditoria visual.'],
 ['Extensão TikTok Collector',null,'Coleta links públicos visíveis na aba do TikTok após ação do usuário.','Ferramenta auxiliar na pasta Hurtz TikTok Collector; não é uma página independente do painel.'],
 ['Biblioteca de criativos',null,'O código conserva endpoints de vídeos e componentes de biblioteca. A interface atual integra resultados à Pesquisa de criativos.','Não encontrei uma segunda tela autônoma de biblioteca ou uma ferramenta independente chamada Testes.']
];
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ferramentas locais — Hurtz</title><style>body{margin:0;background:#f7f5f1;color:#231f1b;font:16px/1.6 system-ui}main{max-width:1100px;margin:auto;padding:40px 24px}h1{line-height:1.2}a{color:#923b00}header{margin-bottom:30px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}article{background:white;border:1px solid #ddd5ca;border-radius:12px;padding:22px}h2{font-size:20px;margin-top:0}.status{font-size:14px;color:#60564c}a:focus-visible{outline:3px solid #923b00;outline-offset:4px}.note{padding:16px;border-left:4px solid #e87722;background:#fff3e8}</style><main><header><p>HURTZ · REVISÃO LOCAL</p><h1>Todas as ferramentas encontradas</h1><p class="note">Prévia de interface: as telas podem ser abertas, mas integrações e gravações estão desativadas neste servidor. Nenhuma busca externa, envio, exclusão ou alteração em produção é executada.</p><p>A busca de criativos, as tarefas e os alertas foram ocultados no acesso individual porque seus recursos ainda eram compartilhados. Comentários também existem nesta versão local.</p></header><div class="grid">${features.map(([name,view,description,status])=>`<article><h2>${name}</h2><p>${description}</p><p class="status">${status}</p>${view?`<a href="/app/?view=${view}">Abrir prévia de ${name.toLowerCase()}</a>`:''}</article>`).join('')}</div></main></html>`;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 res.setHeader('Cache-Control','no-store');
 if(pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Prévia local: esta integração não está conectada. Nenhuma operação externa foi executada.'}))}
 if(req.method!=='GET'){res.writeHead(405);return res.end()}
 if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(html)}
 if(!pathname.startsWith('/app/')){res.writeHead(404);return res.end()}
 const name=pathname.slice(5)||'index.html',target=path.resolve(root,name),ext=path.extname(target);
 if(!target.startsWith(root+path.sep)||!types[ext]||['personal-meta.js','preview-server.js'].includes(name)){res.writeHead(404);return res.end()}
 fs.readFile(target,(error,buffer)=>{
  if(error){res.writeHead(404);return res.end()}
  let data=buffer;
  if(name==='app.js')data=buffer.toString('utf8').replace('const savedSession=originalStorage.getItem(MONITOR_SESSION_KEY);','const savedSession=null;').replace('if(!personalIdentity)showAlertLogin();','/* Explicit local UI preview: no authentication or API connection. */');
  if(name==='index.html')data=buffer.toString('utf8').replace('<body>','<body><div style="position:sticky;top:0;z-index:99999;padding:10px 20px;background:#fff0db;color:#432c16;font:14px system-ui"><a href="/" style="color:inherit">← Todas as ferramentas</a> · Prévia local — integrações e gravações desativadas</div>').replace('Apify conectada','Apify não conectada nesta prévia').replace('Monitoramento ativo','Prévia local').replace('Atualiza a cada 15 min','Sem consultas externas');
  res.writeHead(200,{'Content-Type':types[ext]});res.end(data);
 });
}).listen(8098,'127.0.0.1',()=>console.log('Prévia local: http://localhost:8098'));
