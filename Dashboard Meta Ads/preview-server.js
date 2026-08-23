const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { Readable } = require('stream');

const root = __dirname;
const port = Number(process.env.PORT || 8091);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const analysisResponseCache = new Map();
const ANALYSIS_CACHE_TTL = 15 * 60 * 1000;
const taskDataCache={payload:null,expiresAt:0};
const TASK_CACHE_TTL=30*1000;
const secretValue=(directName,fileName)=>{const direct=process.env[directName];if(direct)return String(direct).trim();const file=process.env[fileName];if(file){try{return fs.readFileSync(file,'utf8').trim()}catch{}}return ''};
const creativeExpectedType=(term,selected='auto')=>{if(['car','property','any'].includes(selected)&&selected!=='auto')return selected;const value=String(term||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/\b(carro|carros|veiculo|veiculos|automovel|automoveis|moto|motos|caminhao|caminhoes|hb20|onix|corolla|polo|mobi|compass|strada|hilux|s10|toro|renegade|kwid|argo|tracker|creta)\b/.test(value))return'car';if(/\b(imovel|imoveis|casa|casas|apartamento|apartamentos|terreno|terrenos|lote|lotes|fazenda|fazendas|sitio|sitios|condominio|condominios)\b/.test(value))return'property';return'any'};
const creativeAuditSessions=new Map(),creativeAuditJobs=[];let creativeAgentLastSeen=0;
const CREATIVE_VISUAL_AUDIT_ENABLED=process.env.CREATIVE_VISUAL_AUDIT_ENABLED==='1';
const CREATIVE_AUDIT_TTL=60*60*1000,CREATIVE_CLAIM_TTL=5*60*1000;
const cleanCreativeAudits=()=>{const now=Date.now();for(const[id,session]of creativeAuditSessions)if(session.expires_at<now)creativeAuditSessions.delete(id);for(let index=creativeAuditJobs.length-1;index>=0;index--)if(!creativeAuditSessions.has(creativeAuditJobs[index].session_id))creativeAuditJobs.splice(index,1)};
setInterval(cleanCreativeAudits,5*60*1000).unref();
const alertDataDir = process.env.META_ALERT_DATA_DIR || (process.platform === 'win32' ? path.join(root,'.alert-data') : '/opt/meta-ads-cli/data/alerts');
const creativeSearchSettingsFile=path.join(alertDataDir,'creative-search.json');
const readJsonFile = (file,fallback={}) => { try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback} };
const writeJsonFile = (file,value) => { fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=`${file}.tmp`;fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{encoding:'utf8',mode:0o600});fs.renameSync(temporary,file) };
const readBody = (req,callback) => {let body='';req.on('data',chunk=>{body+=chunk;if(body.length>512*1024)req.destroy()});req.on('end',()=>{try{callback(null,JSON.parse(body||'{}'))}catch(error){callback(error)}})};
const readLargeBody = (req,callback) => {let body='';req.on('data',chunk=>{body+=chunk;if(body.length>8*1024*1024)req.destroy()});req.on('end',()=>{try{callback(null,JSON.parse(body||'{}'))}catch(error){callback(error)}})};
const jsonResponse = (res,status,payload) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,PUT,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});res.end(JSON.stringify(payload))};
const authFile=process.env.API_AUTH_FILE||'/opt/meta-ads-cli/secrets/analytics-api-basic.env';
const authConfig=()=>{const values={};try{fs.readFileSync(authFile,'utf8').split(/\r?\n/).forEach(line=>{const index=line.indexOf('=');if(index>0)values[line.slice(0,index)]=line.slice(index+1)})}catch{}return values};
const supabaseAuthCredentials=()=>{
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const secretFile=process.env.SUPABASE_SECRET_KEY__FILE;let fileKey='';if(secretFile){try{fileKey=fs.readFileSync(secretFile,'utf8').trim()}catch{}}
  return{base,key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||fileKey};
};
const supabaseAuthRequest=async(route,{method='POST',body,accessToken}={})=>{
  const{base,key}=supabaseAuthCredentials();if(!base||!key)throw new Error('Autenticação por e-mail não configurada.');
  const response=await fetch(`${base}/auth/v1/${route}`,{method,headers:{apikey:key,Authorization:`Bearer ${accessToken||key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();let payload={};try{payload=text?JSON.parse(text):{}}catch{payload={message:text}}
  if(!response.ok){const error=new Error(payload?.msg||payload?.message||payload?.error_description||payload?.error||'Falha na autenticação.');error.status=response.status;throw error}
  return payload;
};
const authPublicUrl=()=>String(process.env.ANALYTICS_PUBLIC_URL||'https://analytics.hurtzcompany.com').replace(/\/$/,'');
const safeEqual=(left,right)=>{const a=Buffer.from(String(left||'')),b=Buffer.from(String(right||''));return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const loginAttempts=new Map();
const clientIp=req=>String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
const runMonitorCommand = (command,options,callback) => {
  if (process.platform === 'win32') {
    const key = path.join(process.env.USERPROFILE, '.ssh', 'id_ed25519_contabo_monitor');
    return execFile('ssh',['-i',key,'-o','IdentitiesOnly=yes','-o','BatchMode=yes','root@161.97.148.99',command],options,callback);
  }
  return execFile('/bin/bash',['-lc',command],options,callback);
};
const supabaseRequest = async (resource, options={}) => {
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const secretFile=process.env.SUPABASE_SECRET_KEY__FILE;
  let fileKey='';if(secretFile){try{fileKey=fs.readFileSync(secretFile,'utf8').trim()}catch{}}
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||fileKey;
  if(!base||!key)throw new Error('Banco de tarefas não configurado');
  const response=await fetch(`${base}/rest/v1/${resource}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation',...(options.headers||{})}});
  const text=await response.text();let payload=null;try{payload=text?JSON.parse(text):null}catch{payload={error:text}}
  if(!response.ok)throw new Error(payload?.message||payload?.error||'Falha no banco de tarefas');
  if((options.method||'GET').toUpperCase()!=='GET'&&/^(tasks|task_)/.test(resource)){taskDataCache.payload=null;taskDataCache.expiresAt=0}
  return payload;
};
const taskActivity=(taskId,action,details={})=>supabaseRequest('task_activities',{method:'POST',body:JSON.stringify({task_id:taskId||null,action,details})}).catch(()=>null);
const cleanUuid=value=>/^[0-9a-f-]{36}$/i.test(String(value||''))?String(value):null;
const taskStorageRequest=async(pathname,options={})=>{
  const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const secretFile=process.env.SUPABASE_SECRET_KEY__FILE;let fileKey='';if(secretFile){try{fileKey=fs.readFileSync(secretFile,'utf8').trim()}catch{}}
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||fileKey;
  if(!base||!key)throw new Error('Armazenamento não configurado');
  const response=await fetch(`${base}/storage/v1/${pathname}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,...(options.headers||{})}});
  if(!response.ok){const text=await response.text();throw new Error(text||'Falha no armazenamento')}
  return response;
};
const cleanupExpiredTasks=async()=>{
  try{
    const expired=await supabaseRequest(`tasks?expires_at=lt.${encodeURIComponent(new Date().toISOString())}&select=id`);
    if(!expired?.length)return 0;
    const ids=expired.map(item=>item.id),filter=ids.map(id=>`task_id.eq.${id}`).join(',');
    const files=await supabaseRequest(`task_attachments?or=(${filter})&select=storage_path`);
    if(files?.length)await taskStorageRequest('object/task-attachments',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:files.map(file=>file.storage_path)})});
    await supabaseRequest(`tasks?id=in.(${ids.join(',')})`,{method:'DELETE'});
    return ids.length;
  }catch(error){console.error('Falha na limpeza de tarefas:',error.message);return 0}
};
setTimeout(cleanupExpiredTasks,1500).unref();
setInterval(cleanupExpiredTasks,15*60*1000).unref();

http.createServer((req,res)=>{
  const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const isCreativeAgentRoute=requestUrl.pathname.startsWith('/api/creative-audit/agent');
  if(requestUrl.pathname.startsWith('/api/')){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    res.setHeader('Vary','Origin');
  }
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,PUT,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});return res.end()}
  if(isCreativeAgentRoute){
    const configured=secretValue('CREATIVE_AGENT_TOKEN','CREATIVE_AGENT_TOKEN__FILE'),submitted=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!configured||!safeEqual(submitted,configured))return jsonResponse(res,401,{error:'Agente local não autorizado.'});
  }
  if(requestUrl.pathname.startsWith('/api/auth/')&&req.method==='POST')return readBody(req,(error,payload)=>{
    if(error)return jsonResponse(res,400,{error:'Dados de autenticação inválidos.'});
    const action=requestUrl.pathname.slice('/api/auth/'.length),email=String(payload?.email||'').trim().toLowerCase(),password=String(payload?.password||''),config=authConfig();
    if(action==='login'){
      if(!email||!password)return jsonResponse(res,400,{error:'Informe e-mail e senha.'});
      return supabaseAuthRequest('token?grant_type=password',{body:{email,password}}).then(result=>jsonResponse(res,200,{ok:true,token:config.API_SESSION_TOKEN,user:{email:result.user?.email||email}})).catch(authError=>jsonResponse(res,authError.status===400?401:authError.status||502,{error:authError.message}));
    }
    if(action==='signup'){
      if(!/^\S+@\S+\.\S+$/.test(email))return jsonResponse(res,400,{error:'Informe um e-mail válido.'});
      if(password.length<8)return jsonResponse(res,400,{error:'A senha deve ter pelo menos 8 caracteres.'});
      const redirectTo=`${authPublicUrl()}/?auth=confirmed`;
      return supabaseAuthRequest(`signup?redirect_to=${encodeURIComponent(redirectTo)}`,{body:{email,password}}).then(result=>jsonResponse(res,201,{ok:true,confirmed:Boolean(result.access_token),message:result.access_token?'Conta criada e conectada.':'Conta criada. Confirme o e-mail antes de entrar.',token:result.access_token?config.API_SESSION_TOKEN:undefined})).catch(authError=>jsonResponse(res,authError.status||502,{error:authError.message}));
    }
    if(action==='recover'){
      if(!/^\S+@\S+\.\S+$/.test(email))return jsonResponse(res,400,{error:'Informe um e-mail válido.'});
      const redirectTo=`${authPublicUrl()}/?auth=recovery`;
      return supabaseAuthRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`,{body:{email}}).then(()=>jsonResponse(res,200,{ok:true,message:'Se o e-mail estiver cadastrado, você receberá o link para redefinir a senha.'})).catch(authError=>jsonResponse(res,authError.status||502,{error:authError.message}));
    }
    if(action==='update-password'){
      const recoveryToken=String(payload?.access_token||'');
      if(password.length<8)return jsonResponse(res,400,{error:'A nova senha deve ter pelo menos 8 caracteres.'});
      if(!recoveryToken)return jsonResponse(res,401,{error:'O link de recuperação é inválido ou expirou.'});
      return supabaseAuthRequest('user',{method:'PUT',accessToken:recoveryToken,body:{password}}).then(()=>jsonResponse(res,200,{ok:true,message:'Senha atualizada. Entre com a nova senha.'})).catch(authError=>jsonResponse(res,authError.status||502,{error:authError.message}));
    }
    if(action==='exchange'){
      const accessToken=String(payload?.access_token||'');if(!accessToken)return jsonResponse(res,401,{error:'Confirmação inválida ou expirada.'});
      return supabaseAuthRequest('user',{method:'GET',accessToken}).then(user=>jsonResponse(res,200,{ok:true,token:config.API_SESSION_TOKEN,user:{email:user.email}})).catch(authError=>jsonResponse(res,authError.status||502,{error:authError.message}));
    }
    return jsonResponse(res,404,{error:'Operação de autenticação não encontrada.'});
  });
  if(!isCreativeAgentRoute&&process.env.API_AUTH_REQUIRED==='1'&&requestUrl.pathname.startsWith('/api/')){
    if(requestUrl.pathname==='/api/session'&&req.method==='POST')return readBody(req,(error,payload)=>{
      const ip=clientIp(req),now=Date.now(),attempt=(loginAttempts.get(ip)||{count:0,until:0});
      if(attempt.until>now)return jsonResponse(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
      const config=authConfig(),valid=!error&&safeEqual(payload.username,config.API_USER)&&safeEqual(payload.password,config.API_PASSWORD);
      if(!valid){attempt.count+=1;if(attempt.count>=5){attempt.until=now+15*60*1000;attempt.count=0}loginAttempts.set(ip,attempt);return jsonResponse(res,401,{error:'Usuário ou senha incorretos.'})}
      loginAttempts.delete(ip);return jsonResponse(res,200,{ok:true,token:config.API_SESSION_TOKEN});
    });
    const config=authConfig(),token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!config.API_SESSION_TOKEN||!safeEqual(token,config.API_SESSION_TOKEN))return jsonResponse(res,401,{error:'Sessão não autorizada.'});
    if(requestUrl.pathname==='/api/session')return jsonResponse(res,200,{ok:true});
  }
  if (requestUrl.pathname === '/api/alert-plans') {
    const file=path.join(alertDataDir,'plans.json');
    if(req.method==='GET')return jsonResponse(res,200,readJsonFile(file,{plans:{}}));
    if(req.method==='PUT')return readBody(req,(error,payload)=>{
      if(error||!payload?.plans||typeof payload.plans!=='object')return jsonResponse(res,400,{error:'Planejamentos inválidos'});
      const plans={};
      for(const [id,plan] of Object.entries(payload.plans)){
        if(!/^act_\d+$/.test(id))continue;
        plans[id]={paymentType:plan.paymentType==='credit'?'credit':'prepaid',deposit:Number(plan.deposit)||0,depositDate:String(plan.depositDate||''),depositTime:String(plan.depositTime||'00:00'),plannedDays:Math.max(1,Number(plan.plannedDays)||1),dailyLimit:Number(plan.dailyLimit)||0,weeklyLimit:Number(plan.weeklyLimit)||0,weekStartDay:Number(plan.weekStartDay)===0?0:1};
      }
      try{writeJsonFile(file,{updated_at:new Date().toISOString(),plans});jsonResponse(res,200,{ok:true,count:Object.keys(plans).length})}catch{return jsonResponse(res,500,{error:'Falha ao salvar planejamentos'})}
    });
  }
  if (requestUrl.pathname === '/api/tasks') {
    if(req.method==='GET'){
      if(taskDataCache.payload&&taskDataCache.expiresAt>Date.now())return jsonResponse(res,200,taskDataCache.payload);
      cleanupExpiredTasks();
      return Promise.all([
      supabaseRequest('task_columns?select=id,title,position,role&order=position.asc'),
      supabaseRequest('tasks?select=id,column_id,project_id,module_id,cycle_id,title,description,assignee,priority,due_date,labels,estimate_minutes,completed_at,expires_at,position,created_at,updated_at&order=position.asc'),
      supabaseRequest('task_projects?select=id,title,color,is_active&order=title.asc'),
      supabaseRequest('task_modules?select=id,project_id,title&order=title.asc'),
      supabaseRequest('task_cycles?select=id,project_id,title,starts_on,ends_on&order=starts_on.desc'),
      supabaseRequest('task_subtasks?select=id,task_id,title,is_done,position&order=position.asc'),
      supabaseRequest('task_comments?select=id,task_id,author,body,created_at&order=created_at.asc'),
      supabaseRequest('task_attachments?select=id,task_id,file_name,mime_type,size_bytes,created_at&order=created_at.asc'),
      supabaseRequest('task_activities?select=id,task_id,action,details,actor,created_at&order=created_at.desc&limit=500'),
      supabaseRequest('task_notifications?select=id,task_id,recipient_name,is_read,created_at&order=created_at.desc&limit=500')
    ]).then(([columns,tasks,projects,modules,cycles,subtasks,comments,attachments,activities,notifications])=>{const payload={columns,tasks,projects,modules,cycles,subtasks,comments,attachments,activities,notifications};taskDataCache.payload=payload;taskDataCache.expiresAt=Date.now()+TASK_CACHE_TTL;jsonResponse(res,200,payload)}).catch(error=>jsonResponse(res,502,{error:error.message}));
    }
    if(req.method==='POST')return readBody(req,(error,payload)=>{
      if(error||!String(payload?.title||'').trim()||!payload?.column_id)return jsonResponse(res,400,{error:'Preencha o título e a etapa'});
      const row={title:String(payload.title).trim().slice(0,180),description:String(payload.description||'').trim().slice(0,2000),assignee:String(payload.assignee||'').trim().slice(0,100),priority:['low','medium','high'].includes(payload.priority)?payload.priority:'medium',due_date:payload.due_date||null,labels:Array.isArray(payload.labels)?payload.labels.map(item=>String(item).trim().slice(0,40)).filter(Boolean).slice(0,8):[],column_id:String(payload.column_id),project_id:cleanUuid(payload.project_id),module_id:cleanUuid(payload.module_id),cycle_id:cleanUuid(payload.cycle_id),estimate_minutes:Math.max(0,Number(payload.estimate_minutes)||0)||null,position:Number(payload.position)||0};
      supabaseRequest('tasks',{method:'POST',body:JSON.stringify(row)}).then(async data=>{const created=data?.[0]||row;await taskActivity(created.id,'task_created',{title:created.title});jsonResponse(res,201,created)}).catch(dbError=>jsonResponse(res,502,{error:dbError.message}));
    });
    if(req.method==='PUT')return readBody(req,(error,payload)=>{
      const id=String(payload?.id||'');if(error||!/^[0-9a-f-]{36}$/i.test(id))return jsonResponse(res,400,{error:'Tarefa inválida'});
      const row={};for(const key of ['title','description','assignee','priority','due_date','labels','column_id','project_id','module_id','cycle_id','estimate_minutes','completed_at','position'])if(Object.hasOwn(payload,key))row[key]=payload[key]||(['description','assignee'].includes(key)?'':key==='labels'?[]:null);
      if(row.title!==undefined)row.title=String(row.title).trim().slice(0,180);
      if(row.description!==undefined)row.description=String(row.description).trim().slice(0,2000);
      if(row.assignee!==undefined)row.assignee=String(row.assignee).trim().slice(0,100);
      if(row.labels!==undefined)row.labels=Array.isArray(row.labels)?row.labels.map(item=>String(item).trim().slice(0,40)).filter(Boolean).slice(0,8):[];
      for(const key of ['project_id','module_id','cycle_id'])if(row[key]!==undefined)row[key]=cleanUuid(row[key]);
      if(row.estimate_minutes!==undefined)row.estimate_minutes=Math.max(0,Number(row.estimate_minutes)||0)||null;
      supabaseRequest(`tasks?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(row)}).then(async data=>{await taskActivity(id,'task_updated',{fields:Object.keys(row)});jsonResponse(res,200,data?.[0]||row)}).catch(dbError=>jsonResponse(res,502,{error:dbError.message}));
    });
    if(req.method==='DELETE'){
      const id=requestUrl.searchParams.get('id')||'';if(!/^[0-9a-f-]{36}$/i.test(id))return jsonResponse(res,400,{error:'Tarefa inválida'});
      return supabaseRequest(`task_attachments?task_id=eq.${encodeURIComponent(id)}&select=storage_path`).then(async files=>{if(files?.length)await taskStorageRequest('object/task-attachments',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:files.map(file=>file.storage_path)})});return supabaseRequest(`tasks?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'})}).then(()=>jsonResponse(res,200,{ok:true})).catch(error=>jsonResponse(res,502,{error:error.message}));
    }
    return jsonResponse(res,405,{error:'Método não permitido'});
  }
  if(requestUrl.pathname==='/api/creative-videos'){
    if(req.method==='GET')return supabaseRequest('creative_videos?select=*&order=created_at.desc&limit=500').then(rows=>jsonResponse(res,200,{videos:rows||[]})).catch(error=>jsonResponse(res,502,{error:error.message}));
    if(req.method==='POST')return readLargeBody(req,(error,payload)=>{
      const videos=Array.isArray(payload?.videos)?payload.videos.slice(0,50):[];
      if(error||!videos.length)return jsonResponse(res,400,{error:'Nenhum vídeo válido foi recebido.'});
      const rows=videos.map(item=>({platform:'tiktok',video_url:String(item.video_url||'').slice(0,1000),creator_url:String(item.creator_url||'').slice(0,1000)||null,thumbnail_url:String(item.thumbnail_url||'').slice(0,1500)||null,title:String(item.title||'').slice(0,500)||null,creator_name:String(item.creator_name||'').slice(0,200)||null,search_term:String(payload.search_term||item.search_term||'').slice(0,150)||null,product:String(payload.product||item.product||'').slice(0,100)||null,view_count:Number.isFinite(Number(item.view_count))?Number(item.view_count):null,like_count:Number.isFinite(Number(item.like_count))?Number(item.like_count):null,comment_count:Number.isFinite(Number(item.comment_count))?Number(item.comment_count):null,metadata:{source:'hurtz-browser-extension',collected_at:new Date().toISOString()}})).filter(item=>/^https:\/\/(www\.)?tiktok\.com\/@[^/]+\/video\/\d+/i.test(item.video_url));
      if(!rows.length)return jsonResponse(res,400,{error:'Os resultados não continham links públicos de vídeos do TikTok.'});
      supabaseRequest('creative_videos?on_conflict=video_url',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(rows)}).then(data=>jsonResponse(res,201,{saved:data?.length||rows.length,videos:data||rows})).catch(dbError=>jsonResponse(res,502,{error:dbError.message}));
    });
    if(req.method==='PUT')return readBody(req,(error,payload)=>{const id=cleanUuid(payload?.id);if(error||!id)return jsonResponse(res,400,{error:'Vídeo inválido'});const row={};for(const field of ['title','product','notes','search_term'])if(Object.hasOwn(payload,field))row[field]=String(payload[field]||'').slice(0,field==='notes'?2000:500)||null;supabaseRequest(`creative_videos?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({...row,updated_at:new Date().toISOString()})}).then(data=>jsonResponse(res,200,data?.[0]||row)).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
    if(req.method==='DELETE'){const id=cleanUuid(requestUrl.searchParams.get('id'));if(!id)return jsonResponse(res,400,{error:'Vídeo inválido'});return supabaseRequest(`creative_videos?id=eq.${id}`,{method:'DELETE'}).then(()=>jsonResponse(res,200,{ok:true})).catch(error=>jsonResponse(res,502,{error:error.message}))}
  }
  if(requestUrl.pathname==='/api/creative-search-settings'){
    if(req.method==='GET'){const settings=readJsonFile(creativeSearchSettingsFile,{presets:[],history:{}});return jsonResponse(res,200,{presets:Array.isArray(settings.presets)?settings.presets:[]})}
    if(req.method==='POST')return readBody(req,(error,payload)=>{const id=String(payload?.id||''),name=String(payload?.name||'').trim().slice(0,80),terms=[...new Set((Array.isArray(payload?.terms)?payload.terms:[]).map(value=>String(value||'').trim()).filter(Boolean))].slice(0,10);if(error||!name||!terms.length)return jsonResponse(res,400,{error:'Informe um nome e pelo menos um termo.'});const settings=readJsonFile(creativeSearchSettingsFile,{presets:[],history:{}}),existing=(Array.isArray(settings.presets)?settings.presets:[]).find(item=>item.id===id),preset={id:existing?.id||crypto.randomUUID(),name,terms,created_at:existing?.created_at||new Date().toISOString(),updated_at:new Date().toISOString()};settings.presets=[...(Array.isArray(settings.presets)?settings.presets:[]).filter(item=>item.id!==preset.id&&item.name.toLowerCase()!==name.toLowerCase()),preset].slice(-50);settings.history=settings.history&&typeof settings.history==='object'?settings.history:{};try{writeJsonFile(creativeSearchSettingsFile,settings);return jsonResponse(res,existing?200:201,preset)}catch{return jsonResponse(res,500,{error:'Não foi possível salvar os termos.'})}});
    if(req.method==='DELETE'){const id=requestUrl.searchParams.get('id'),removeAll=requestUrl.searchParams.get('all')==='1',settings=readJsonFile(creativeSearchSettingsFile,{presets:[],history:{}});settings.presets=removeAll?[]:(Array.isArray(settings.presets)?settings.presets:[]).filter(item=>item.id!==id);try{writeJsonFile(creativeSearchSettingsFile,settings);return jsonResponse(res,200,{ok:true,removed_all:removeAll})}catch{return jsonResponse(res,500,{error:'Não foi possível excluir os termos.'})}}
    return jsonResponse(res,405,{error:'Método não permitido'});
  }
  if(requestUrl.pathname==='/api/creative-audit/agent/claim'&&req.method==='POST'){
    creativeAgentLastSeen=Date.now();cleanCreativeAudits();const now=Date.now(),job=creativeAuditJobs.find(item=>item.status==='pending'||(item.status==='claimed'&&now-item.claimed_at>CREATIVE_CLAIM_TTL));
    if(!job)return jsonResponse(res,200,{job:null});job.status='claimed';job.claimed_at=now;job.attempts=(job.attempts||0)+1;return jsonResponse(res,200,{job:{id:job.id,expected_type:job.expected_type,title:job.video.title,media_url:`/api/creative-audit/agent/media?id=${encodeURIComponent(job.id)}`}});
  }
  if(requestUrl.pathname==='/api/creative-audit/agent/heartbeat'&&req.method==='POST'){creativeAgentLastSeen=Date.now();return jsonResponse(res,200,{ok:true})}
  if(requestUrl.pathname==='/api/creative-audit/agent/result'&&req.method==='POST')return readBody(req,(error,payload)=>{
    creativeAgentLastSeen=Date.now();const job=creativeAuditJobs.find(item=>item.id===String(payload?.job_id||''));if(error||!job)return jsonResponse(res,404,{error:'Trabalho não encontrado ou expirado.'});const session=creativeAuditSessions.get(job.session_id);if(!session)return jsonResponse(res,410,{error:'Pesquisa expirada.'});
    const detected=['car','property'].includes(payload.detected_type)?payload.detected_type:'other',relevant=payload.relevant===true&&detected===job.expected_type;job.status='done';job.finished_at=Date.now();session.results.set(job.video.id,{relevant,detected_type:detected,confidence:Math.max(0,Math.min(1,Number(payload.confidence)||0)),reason:String(payload.reason||'').slice(0,300)});return jsonResponse(res,200,{ok:true});
  });
  if(requestUrl.pathname==='/api/creative-audit/agent/media'&&req.method==='GET'){
    creativeAgentLastSeen=Date.now();const job=creativeAuditJobs.find(item=>item.id===requestUrl.searchParams.get('id'));if(!job)return jsonResponse(res,404,{error:'Vídeo temporário não encontrado.'});const token=secretValue('APIFY_TOKEN','APIFY_TOKEN__FILE');
    return fetch(job.video.download_url,{headers:job.video.download_url.includes('api.apify.com')?{Authorization:`Bearer ${token}`}:{}}).then(response=>{if(!response.ok||!response.body)throw new Error(`Download indisponível (${response.status})`);const headers={'Content-Type':response.headers.get('content-type')||'video/mp4','Cache-Control':'no-store'},length=response.headers.get('content-length');if(length)headers['Content-Length']=length;res.writeHead(200,headers);Readable.fromWeb(response.body).pipe(res)}).catch(error=>{if(!res.headersSent)jsonResponse(res,502,{error:error.message});else res.destroy(error)});
  }
  if(requestUrl.pathname==='/api/creative-audit/download'&&req.method==='GET'){
    cleanCreativeAudits();const session=creativeAuditSessions.get(requestUrl.searchParams.get('session')),video=session?.candidates.find(item=>item.id===requestUrl.searchParams.get('video')),audit=video&&session.results.get(video.id);
    if(!session||!video||(session.audit_enabled&&video.expected_type!=='any'&&!audit?.relevant))return jsonResponse(res,404,{error:'Vídeo não encontrado ou pesquisa expirada.'});const token=secretValue('APIFY_TOKEN','APIFY_TOKEN__FILE');
    const resolveDownload=video.download_url?Promise.resolve(video.download_url):fetch('https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?timeout=120',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({postURLs:[video.video_url],resultsPerPage:1,scrapeRelatedVideos:false,shouldDownloadVideos:true,shouldDownloadCovers:false,shouldDownloadSlideshowImages:false,downloadSubtitlesOptions:'NEVER_DOWNLOAD_SUBTITLES',commentsPerPost:0})}).then(async response=>{const text=await response.text();let rows=[];try{rows=text?JSON.parse(text):[]}catch{}if(!response.ok)throw new Error(rows?.error?.message||'O download não foi preparado.');const url=rows?.[0]?.mediaUrls?.[0];if(!url)throw new Error('O TikTok não disponibilizou este vídeo para download.');video.download_url=url;return url});
    return resolveDownload.then(url=>fetch(url,{headers:url.includes('api.apify.com')?{Authorization:`Bearer ${token}`}:{}})).then(response=>{if(!response.ok||!response.body)throw new Error(`Download indisponível (${response.status})`);const headers={'Content-Type':response.headers.get('content-type')||'video/mp4','Content-Disposition':`attachment; filename="${video.platform||'video'}-${video.id}.mp4"`,'Cache-Control':'no-store'},length=response.headers.get('content-length');if(length)headers['Content-Length']=length;res.writeHead(200,headers);Readable.fromWeb(response.body).pipe(res)}).catch(error=>{if(!res.headersSent)jsonResponse(res,502,{error:error.message});else res.destroy(error)});
  }
  if(requestUrl.pathname==='/api/creative-thumbnail'&&req.method==='GET'){
    cleanCreativeAudits();const session=creativeAuditSessions.get(requestUrl.searchParams.get('session')),platform=requestUrl.searchParams.get('platform')||'',video=session?.candidates.find(item=>item.id===requestUrl.searchParams.get('video')&&(!platform||item.platform===platform));
    if(!session||!video?.thumbnail_url)return jsonResponse(res,404,{error:'Capa não encontrada ou pesquisa expirada.'});
    return fetch(video.thumbnail_url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'}}).then(response=>{if(!response.ok||!response.body)throw new Error(`Capa indisponível (${response.status})`);const headers={'Content-Type':response.headers.get('content-type')||'image/jpeg','Cache-Control':'private, no-store'},length=response.headers.get('content-length');if(length)headers['Content-Length']=length;res.writeHead(200,headers);Readable.fromWeb(response.body).pipe(res)}).catch(error=>{if(!res.headersSent)jsonResponse(res,502,{error:error.message});else res.destroy(error)});
  }
  if(requestUrl.pathname==='/api/creative-audit/status'&&req.method==='GET'){
    cleanCreativeAudits();const session=creativeAuditSessions.get(requestUrl.searchParams.get('id'));if(!session)return jsonResponse(res,404,{error:'Pesquisa temporária não encontrada ou expirada.'});const completed=session.results.size,total=session.candidates.filter(video=>video.expected_type!=='any').length,done=completed>=total;
    const approved=session.candidates.filter(video=>{if(video.expected_type==='any')return true;const result=session.results.get(video.id);if(!result?.relevant)return false;video.visual_verified=true;video.detected_type=result.detected_type;video.visual_reason=result.reason;video.visual_confidence=result.confidence;return true}),counts=new Map(),limited=approved.filter(video=>{const key=`${video.platform||'tiktok'}:${video.search_term}`,count=counts.get(key)||0;if(count>=session.per_term)return false;counts.set(key,count+1);return true});
    const downloadable=done?limited.map(video=>({...video,thumbnail_proxy_url:video.thumbnail_url?`/api/creative-thumbnail?session=${encodeURIComponent(session.id)}&platform=${encodeURIComponent(video.platform||'tiktok')}&video=${encodeURIComponent(video.id)}`:'',download_url:video.download_url?`/api/creative-audit/download?session=${encodeURIComponent(session.id)}&video=${encodeURIComponent(video.id)}`:''})):[];
    return jsonResponse(res,200,{id:session.id,status:done?'complete':'processing',processed:completed,total,approved:downloadable,rejected:done?total-approved.filter(video=>video.expected_type!=='any').length:0,agent_online:Date.now()-creativeAgentLastSeen<45000,expires_at:new Date(session.expires_at).toISOString()});
  }
  if(requestUrl.pathname==='/api/creative-search'&&req.method==='POST')return readBody(req,async(error,payload)=>{
    const terms=Array.isArray(payload?.terms)?[...new Set(payload.terms.map(value=>String(value||'').trim()).filter(Boolean))].slice(0,10):[];
    const perTerm=Math.min(30,Math.max(1,Number(payload?.limit)||10)),platform=['both','tiktok','instagram'].includes(payload?.platform)?payload.platform:'both',contentType=['auto','car','property','any'].includes(payload?.content_type)?payload.content_type:'auto',sorting=['MOST_RELEVANT','MOST_LIKED','LATEST'].includes(payload?.sorting)?payload.sorting:'MOST_RELEVANT',period=['ALL_TIME','PAST_24_HOURS','PAST_WEEK','PAST_MONTH','LAST_3_MONTHS','LAST_6_MONTHS'].includes(payload?.period)?payload.period:'ALL_TIME';
    if(error||!terms.length)return jsonResponse(res,400,{error:'Informe pelo menos um termo de pesquisa.'});
    if(terms.length*perTerm>150)return jsonResponse(res,400,{error:'O limite por busca é de 150 vídeos. Reduza os termos ou a quantidade por termo.'});
    const token=secretValue('APIFY_TOKEN','APIFY_TOKEN__FILE');if(!token)return jsonResponse(res,503,{error:'A integração com a Apify ainda não está configurada.'});
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),365000);
    try{
      const items=[],instagramItems=[],failures=[];let nextTerm=0,nextInstagramTerm=0;const worker=async()=>{while(nextTerm<terms.length){const term=terms[nextTerm++],actorInput={searchQueries:[term],resultsPerPage:Math.min(30,CREATIVE_VISUAL_AUDIT_ENABLED?perTerm*2:perTerm),searchSection:'/video',videoSearchSorting:sorting,videoSearchDateFilter:period,shouldDownloadVideos:CREATIVE_VISUAL_AUDIT_ENABLED,shouldDownloadCovers:false,shouldDownloadSlideshowImages:false,downloadSubtitlesOptions:'NEVER_DOWNLOAD_SUBTITLES',commentsPerPost:0,topLevelCommentsPerPost:0,maxRepliesPerComment:0,maxFollowersPerProfile:0,maxFollowingPerProfile:0,scrapeRelatedSearchWords:false};try{const response=await fetch('https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?timeout=175',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(actorInput),signal:controller.signal}),text=await response.text();let rows=[];try{rows=text?JSON.parse(text):[]}catch{}if(!response.ok)throw new Error(rows?.error?.message||'Busca externa não concluída.');items.push(...(Array.isArray(rows)?rows:[]).map(item=>({...item,_hurtzSearchTerm:term})))}catch(termError){failures.push({platform:'tiktok',term,error:termError.message})}}};
      const instagramWorker=async()=>{while(nextInstagramTerm<terms.length){const term=terms[nextInstagramTerm++];try{const response=await fetch('https://api.apify.com/v2/acts/apify~instagram-search-scraper/run-sync-get-dataset-items?timeout=150',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({search:term,searchType:'popular',searchLimit:perTerm,liveSearch:false}),signal:controller.signal}),text=await response.text();let rows=[];try{rows=text?JSON.parse(text):[]}catch{}if(!response.ok)throw new Error(rows?.error?.message||'Busca do Instagram não concluída.');instagramItems.push(...(Array.isArray(rows)?rows:[]).map(item=>({...item,_hurtzSearchTerm:term})))}catch(termError){failures.push({platform:'instagram',term,error:termError.message})}}};
      const searches=[];if(platform!=='instagram')searches.push(...Array.from({length:Math.min(4,terms.length)},worker));if(platform!=='tiktok')searches.push(...Array.from({length:Math.min(2,terms.length)},instagramWorker));await Promise.all(searches);if(!items.length&&!instagramItems.length)throw new Error(failures[0]?.error||'Nenhum termo de pesquisa foi concluído.');
      const unique=new Map();for(const item of items){if(item?.errorCode||!item?.webVideoUrl)continue;const id=String(item.id||item.webVideoUrl.match(/\/video\/(\d+)/)?.[1]||''),searchTerm=item._hurtzSearchTerm||item.searchQuery||terms[0]||'',key=`tiktok:${id}`;if(!id||unique.has(key))continue;unique.set(key,{id,platform:'tiktok',title:String(item.text||'Vídeo do TikTok').slice(0,1000),video_url:item.webVideoUrl,embed_url:`https://www.tiktok.com/player/v1/${id}`,thumbnail_url:item.videoMeta?.coverUrl||item.videoMeta?.originalCoverUrl||'',download_url:Array.isArray(item.mediaUrls)?item.mediaUrls[0]||'':'',creator_name:item.authorMeta?.name||item.authorMeta?.nickName||'',creator_url:item.authorMeta?.name?`https://www.tiktok.com/@${item.authorMeta.name}`:'',view_count:Number(item.playCount)||0,like_count:Number(item.diggCount)||0,comment_count:Number(item.commentCount)||0,share_count:Number(item.shareCount)||0,duration:Number(item.videoMeta?.duration)||0,created_time:Number(item.createTime)||0,search_term:searchTerm,expected_type:creativeExpectedType(searchTerm,contentType)})}
      for(const item of instagramItems){if(!item?.url||!item?.videoUrl)continue;const id=String(item.shortCode||item.id||''),searchTerm=item._hurtzSearchTerm||terms[0]||'',key=`instagram:${id}`;if(!id||unique.has(key))continue;unique.set(key,{id,platform:'instagram',title:String(item.caption||item.alt||'Reel do Instagram').slice(0,1000),video_url:item.url,embed_url:`https://www.instagram.com/p/${encodeURIComponent(id)}/embed`,thumbnail_url:item.displayUrl||item.images?.[0]||'',download_url:item.videoUrl||'',creator_name:item.ownerFullName||item.ownerUsername||'',creator_url:item.ownerUsername?`https://www.instagram.com/${item.ownerUsername}/`:'',view_count:Number(item.videoViewCount||item.videoPlayCount)||0,like_count:Number(item.likesCount)||0,comment_count:Number(item.commentsCount)||0,share_count:0,duration:Number(item.videoDuration)||0,created_time:Math.floor(Date.parse(item.timestamp||'')/1000)||0,search_term:searchTerm,expected_type:creativeExpectedType(searchTerm,contentType)})}
      const periodSeconds={PAST_24_HOURS:86400,PAST_WEEK:604800,PAST_MONTH:2592000,LAST_3_MONTHS:7776000,LAST_6_MONTHS:15552000}[period]||0,cutoff=periodSeconds?Math.floor(Date.now()/1000)-periodSeconds:0,candidates=[...unique.values()].filter(video=>!cutoff||video.platform!=='instagram'||!video.created_time||video.created_time>=cutoff);if(sorting==='MOST_LIKED')candidates.sort((a,b)=>b.like_count-a.like_count);if(sorting==='LATEST')candidates.sort((a,b)=>b.created_time-a.created_time);const sessionId=crypto.randomUUID(),session={id:sessionId,candidates,results:new Map(),per_term:perTerm,audit_enabled:CREATIVE_VISUAL_AUDIT_ENABLED,created_at:Date.now(),expires_at:Date.now()+CREATIVE_AUDIT_TTL};creativeAuditSessions.set(sessionId,session);
      if(!CREATIVE_VISUAL_AUDIT_ENABLED){const counts=new Map(),limited=candidates.filter(video=>{const key=`${video.platform||'tiktok'}:${video.search_term}`,count=counts.get(key)||0;if(count>=perTerm)return false;counts.set(key,count+1);return true}).map(video=>({...video,thumbnail_proxy_url:video.thumbnail_url?`/api/creative-thumbnail?session=${encodeURIComponent(sessionId)}&platform=${encodeURIComponent(video.platform||'tiktok')}&video=${encodeURIComponent(video.id)}`:'',download_url:`/api/creative-audit/download?session=${encodeURIComponent(sessionId)}&video=${encodeURIComponent(video.id)}`}));return jsonResponse(res,200,{id:sessionId,status:'complete',total:0,approved:limited,rejected:0,failed_terms:failures,visual_audit_enabled:false,temporary:true})}
      candidates.filter(video=>video.expected_type!=='any').forEach(video=>{if(!video.download_url){session.results.set(video.id,{relevant:false,detected_type:'other',confidence:0,reason:'Download temporário indisponível'});return}creativeAuditJobs.push({id:crypto.randomUUID(),session_id:sessionId,video,expected_type:video.expected_type,status:'pending',created_at:Date.now(),attempts:0})});
      jsonResponse(res,202,{id:sessionId,status:candidates.some(video=>video.expected_type!=='any')?'processing':'complete',total:candidates.filter(video=>video.expected_type!=='any').length,agent_online:Date.now()-creativeAgentLastSeen<45000,temporary:true});
    }catch(searchError){jsonResponse(res,searchError.name==='AbortError'?504:502,{error:searchError.name==='AbortError'?'A pesquisa excedeu o tempo máximo. Reduza a quantidade e tente novamente.':searchError.message})}finally{clearTimeout(timeout)}
  });
  if(requestUrl.pathname==='/api/task-columns'){
    if(req.method==='POST')return readBody(req,(error,payload)=>{const title=String(payload?.title||'').trim(),role=['standard','in_progress','review','blocked','completed'].includes(payload?.role)?payload.role:'standard';if(error||!title)return jsonResponse(res,400,{error:'Digite o nome da etapa'});supabaseRequest('task_columns',{method:'POST',body:JSON.stringify({title:title.slice(0,80),position:Number(payload.position)||0,role})}).then(data=>jsonResponse(res,201,data?.[0])).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
    if(req.method==='PUT')return readBody(req,(error,payload)=>{const id=cleanUuid(payload?.id),title=String(payload?.title||'').trim(),role=['standard','in_progress','review','blocked','completed'].includes(payload?.role)?payload.role:'standard';if(error||!id||!title)return jsonResponse(res,400,{error:'Etapa inválida'});supabaseRequest(`task_columns?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({title:title.slice(0,80),position:Number(payload.position)||0,role})}).then(data=>jsonResponse(res,200,data?.[0])).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
    if(req.method==='DELETE'){const id=cleanUuid(requestUrl.searchParams.get('id'));if(!id)return jsonResponse(res,400,{error:'Etapa inválida'});return supabaseRequest(`tasks?column_id=eq.${id}&select=id&limit=1`).then(rows=>{if(rows?.length)throw new Error('Mova as tarefas antes de excluir esta etapa.');return supabaseRequest(`task_columns?id=eq.${id}`,{method:'DELETE'})}).then(()=>jsonResponse(res,200,{ok:true})).catch(error=>jsonResponse(res,409,{error:error.message}))}
  }
  if(requestUrl.pathname==='/api/task-order'&&req.method==='PUT')return readBody(req,async(error,payload)=>{const rows=Array.isArray(payload?.items)?payload.items.slice(0,500):[];if(error||!rows.length||rows.some(row=>!cleanUuid(row.id)||!cleanUuid(row.column_id)))return jsonResponse(res,400,{error:'Ordem das tarefas inválida'});try{for(const row of rows)await supabaseRequest(`tasks?id=eq.${cleanUuid(row.id)}`,{method:'PATCH',body:JSON.stringify({column_id:cleanUuid(row.column_id),position:Math.max(0,Number(row.position)||0),completed_at:row.completed_at||null})});jsonResponse(res,200,{ok:true,updated:rows.length})}catch(dbError){jsonResponse(res,502,{error:dbError.message})}});
  if(requestUrl.pathname==='/api/task-notifications'&&req.method==='POST')return readBody(req,(error,payload)=>{const taskId=cleanUuid(payload?.task_id),recipients=Array.isArray(payload?.recipients)?[...new Set(payload.recipients.map(value=>String(value).trim()).filter(Boolean))].slice(0,20):[];if(error||!taskId||!recipients.length)return jsonResponse(res,400,{error:'Menção inválida'});supabaseRequest('task_notifications?on_conflict=task_id,recipient_name',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(recipients.map(recipient_name=>({task_id:taskId,recipient_name}))) }).then(data=>jsonResponse(res,201,{created:data?.length||0})).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
  if(['/api/task-projects','/api/task-modules','/api/task-cycles'].includes(requestUrl.pathname)){
    const table=requestUrl.pathname==='/api/task-projects'?'task_projects':requestUrl.pathname==='/api/task-modules'?'task_modules':'task_cycles';
    if(req.method==='POST')return readBody(req,(error,payload)=>{
      if(error||!String(payload?.title||'').trim())return jsonResponse(res,400,{error:'Digite um nome'});
      const row={title:String(payload.title).trim().slice(0,100)};
      if(table==='task_projects')row.color=/^#[0-9a-f]{6}$/i.test(payload.color||'')?payload.color:'#ef7618';
      if(table!=='task_projects'){row.project_id=cleanUuid(payload.project_id);if(!row.project_id)return jsonResponse(res,400,{error:'Selecione um projeto'})}
      if(table==='task_cycles'){row.starts_on=payload.starts_on;row.ends_on=payload.ends_on;if(!/^\d{4}-\d{2}-\d{2}$/.test(row.starts_on||'')||!/^\d{4}-\d{2}-\d{2}$/.test(row.ends_on||''))return jsonResponse(res,400,{error:'Período inválido'})}
      supabaseRequest(table,{method:'POST',body:JSON.stringify(row)}).then(data=>jsonResponse(res,201,data?.[0]||row)).catch(dbError=>jsonResponse(res,502,{error:dbError.message}));
    });
    if(req.method==='PUT')return readBody(req,(error,payload)=>{const id=cleanUuid(payload?.id),title=String(payload?.title||'').trim();if(error||!id||!title)return jsonResponse(res,400,{error:'Item inválido'});supabaseRequest(`${table}?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({title:title.slice(0,100)})}).then(data=>jsonResponse(res,200,data?.[0])).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
    if(req.method==='DELETE'){const id=cleanUuid(requestUrl.searchParams.get('id'));if(!id)return jsonResponse(res,400,{error:'Item inválido'});return supabaseRequest(`${table}?id=eq.${id}`,{method:'DELETE'}).then(()=>jsonResponse(res,200,{ok:true})).catch(error=>jsonResponse(res,502,{error:error.message}))}
  }
  if(requestUrl.pathname==='/api/task-subtasks'){
    if(req.method==='POST')return readBody(req,(error,payload)=>{const taskId=cleanUuid(payload?.task_id),title=String(payload?.title||'').trim();if(error||!taskId||!title)return jsonResponse(res,400,{error:'Subtarefa inválida'});supabaseRequest('task_subtasks',{method:'POST',body:JSON.stringify({task_id:taskId,title:title.slice(0,180),position:Number(payload.position)||0})}).then(async data=>{await taskActivity(taskId,'subtask_created',{title});jsonResponse(res,201,data?.[0])}).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
    if(req.method==='PUT')return readBody(req,(error,payload)=>{const id=cleanUuid(payload?.id),taskId=cleanUuid(payload?.task_id);if(error||!id||!taskId)return jsonResponse(res,400,{error:'Subtarefa inválida'});const row={};if(Object.hasOwn(payload,'title'))row.title=String(payload.title).trim().slice(0,180);if(Object.hasOwn(payload,'is_done'))row.is_done=Boolean(payload.is_done);supabaseRequest(`task_subtasks?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(row)}).then(async data=>{await taskActivity(taskId,'subtask_updated',row);jsonResponse(res,200,data?.[0])}).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
    if(req.method==='DELETE'){const id=cleanUuid(requestUrl.searchParams.get('id')),taskId=cleanUuid(requestUrl.searchParams.get('task_id'));if(!id||!taskId)return jsonResponse(res,400,{error:'Subtarefa inválida'});return supabaseRequest(`task_subtasks?id=eq.${id}`,{method:'DELETE'}).then(async()=>{await taskActivity(taskId,'subtask_deleted');jsonResponse(res,200,{ok:true})}).catch(error=>jsonResponse(res,502,{error:error.message}))}
  }
  if(requestUrl.pathname==='/api/task-comments'&&req.method==='POST')return readBody(req,(error,payload)=>{const taskId=cleanUuid(payload?.task_id),body=String(payload?.body||'').trim(),author=String(payload?.author||'Equipe Hurtz').trim().slice(0,100);if(error||!taskId||!body)return jsonResponse(res,400,{error:'Comentário inválido'});supabaseRequest('task_comments',{method:'POST',body:JSON.stringify({task_id:taskId,body:body.slice(0,3000),author})}).then(async data=>{await taskActivity(taskId,'comment_created',{author});jsonResponse(res,201,data?.[0])}).catch(dbError=>jsonResponse(res,502,{error:dbError.message}))});
  if(requestUrl.pathname==='/api/task-attachments'){
    if(req.method==='POST')return readLargeBody(req,(error,payload)=>{
      const taskId=cleanUuid(payload?.task_id),fileName=path.basename(String(payload?.file_name||'arquivo')).slice(0,180),mime=String(payload?.mime_type||'application/octet-stream').slice(0,120);let bytes;try{bytes=Buffer.from(String(payload?.data||''),'base64')}catch{}
      if(error||!taskId||!bytes?.length||bytes.length>5*1024*1024)return jsonResponse(res,400,{error:'Anexo inválido ou maior que 5 MB'});
      const storagePath=`${taskId}/${crypto.randomUUID()}-${fileName.replace(/[^\w.\-]+/g,'_')}`;
      taskStorageRequest(`object/task-attachments/${storagePath}`,{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false'},body:bytes}).then(()=>supabaseRequest('task_attachments',{method:'POST',body:JSON.stringify({task_id:taskId,file_name:fileName,storage_path:storagePath,mime_type:mime,size_bytes:bytes.length})})).then(async data=>{await taskActivity(taskId,'attachment_added',{file_name:fileName});jsonResponse(res,201,data?.[0])}).catch(storageError=>jsonResponse(res,502,{error:storageError.message}));
    });
    if(req.method==='GET'){const id=cleanUuid(requestUrl.searchParams.get('id'));if(!id)return jsonResponse(res,400,{error:'Anexo inválido'});return supabaseRequest(`task_attachments?id=eq.${id}&select=*`).then(async rows=>{const file=rows?.[0];if(!file)throw new Error('Anexo não encontrado');const response=await taskStorageRequest(`object/task-attachments/${file.storage_path}`);const buffer=Buffer.from(await response.arrayBuffer());res.writeHead(200,{'Content-Type':file.mime_type,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,'Content-Length':buffer.length});res.end(buffer)}).catch(error=>jsonResponse(res,404,{error:error.message}))}
    if(req.method==='DELETE'){const id=cleanUuid(requestUrl.searchParams.get('id'));if(!id)return jsonResponse(res,400,{error:'Anexo inválido'});return supabaseRequest(`task_attachments?id=eq.${id}&select=*`).then(async rows=>{const file=rows?.[0];if(!file)throw new Error('Anexo não encontrado');await taskStorageRequest('object/task-attachments',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[file.storage_path]})});await supabaseRequest(`task_attachments?id=eq.${id}`,{method:'DELETE'});await taskActivity(file.task_id,'attachment_deleted',{file_name:file.file_name});jsonResponse(res,200,{ok:true})}).catch(error=>jsonResponse(res,502,{error:error.message}))}
  }
  if (requestUrl.pathname === '/api/alerts') {
    const remote = `set -a; . /opt/meta-ads-cli/secrets/.env; set +a; META_ALERT_DATA_DIR=/opt/meta-ads-cli/data/alerts python3 /opt/meta-ads-cli/monitor/alert_status.py`;
    return runMonitorCommand(remote,{timeout:30000,maxBuffer:2*1024*1024},(error,stdout,stderr)=>{
      if(error)return jsonResponse(res,502,{error:'Falha ao consultar alertas',detail:stderr.trim()});
      try{return jsonResponse(res,200,JSON.parse(stdout))}catch{return jsonResponse(res,502,{error:'Resposta inválida dos alertas'})}
    });
  }
  if (requestUrl.pathname === '/api/evolution/phone') {
    const phone=(requestUrl.searchParams.get('phone')||'').replace(/\D/g,'');
    if(phone.length<10||phone.length>15)return jsonResponse(res,400,{error:'Digite o número completo com DDI e DDD'});
    const remote=`set -a; . /opt/meta-ads-cli/secrets/.env; set +a; export EVOLUTION_API_URL='${process.env.EVOLUTION_API_URL||'http://127.0.0.1:8080'}'; python3 /opt/meta-ads-cli/monitor/evolution_catalog.py --phone ${phone}`;
    return runMonitorCommand(remote,{timeout:60000,maxBuffer:2*1024*1024},(error,stdout,stderr)=>{try{const payload=JSON.parse(stdout);return jsonResponse(res,error?502:200,payload)}catch{return jsonResponse(res,502,{error:'Resposta inválida da Evolution API'})}});
  }
  if (requestUrl.pathname === '/api/evolution/groups') {
    const instance=requestUrl.searchParams.get('instance')||'';
    if(!/^[\w .-]{1,100}$/.test(instance))return jsonResponse(res,400,{error:'Instância inválida'});
    const remote=`set -a; . /opt/meta-ads-cli/secrets/.env; set +a; export EVOLUTION_API_URL='${process.env.EVOLUTION_API_URL||'http://127.0.0.1:8080'}'; python3 /opt/meta-ads-cli/monitor/evolution_catalog.py --groups '${instance}'`;
    return runMonitorCommand(remote,{timeout:60000,maxBuffer:5*1024*1024},(error,stdout,stderr)=>{try{const payload=JSON.parse(stdout);return jsonResponse(res,error?502:200,payload)}catch{return jsonResponse(res,502,{error:'Resposta inválida da Evolution API'})}});
  }
  if(requestUrl.pathname==='/api/evolution/instance'&&req.method==='POST'){
    return readBody(req,(error,payload)=>{if(error)return jsonResponse(res,400,{error:'Dados inválidos'});const label=String(payload?.label||'Alertas Hurtz').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'alertas-hurtz',instance=`analytics-${label}-${crypto.randomBytes(3).toString('hex')}`,remote=`set -a; . /opt/meta-ads-cli/secrets/.env; set +a; export EVOLUTION_API_URL='${process.env.EVOLUTION_API_URL||'http://127.0.0.1:8080'}'; python3 /opt/meta-ads-cli/monitor/evolution_qr.py --create '${instance}'`;runMonitorCommand(remote,{timeout:60000,maxBuffer:3*1024*1024},(commandError,stdout)=>{try{const result=JSON.parse(stdout||'{}');return jsonResponse(res,commandError?502:201,result)}catch{return jsonResponse(res,502,{error:'Resposta inválida da Evolution API'})}})});
  }
  if((requestUrl.pathname==='/api/evolution/qr'||requestUrl.pathname==='/api/evolution/status')&&req.method==='GET'){
    const instance=requestUrl.searchParams.get('instance')||'';if(!/^[a-zA-Z0-9_-]{1,100}$/.test(instance))return jsonResponse(res,400,{error:'Instância inválida'});const action=requestUrl.pathname.endsWith('/qr')?'qr':'status',remote=`set -a; . /opt/meta-ads-cli/secrets/.env; set +a; export EVOLUTION_API_URL='${process.env.EVOLUTION_API_URL||'http://127.0.0.1:8080'}'; python3 /opt/meta-ads-cli/monitor/evolution_qr.py --${action} '${instance}'`;return runMonitorCommand(remote,{timeout:60000,maxBuffer:3*1024*1024},(commandError,stdout)=>{try{const result=JSON.parse(stdout||'{}');return jsonResponse(res,commandError?502:200,result)}catch{return jsonResponse(res,502,{error:'Resposta inválida da Evolution API'})}})
  }
  if (requestUrl.pathname === '/api/alerts/config' && req.method === 'PUT') {
    return readBody(req,(error,payload)=>{
      if(error)return jsonResponse(res,400,{error:'Configuração inválida'});
      const thresholds=(payload.thresholds||[]).map(Number).filter(value=>value>=1&&value<=300).slice(0,8);
      const config={enabled:Boolean(payload.enabled),dry_run:Boolean(payload.dry_run),thresholds:thresholds.length?thresholds:[75,90,100,120],balance_thresholds:[50,75,90,100],quiet_start:String(payload.quiet_start||'21:00'),quiet_end:String(payload.quiet_end||'07:00'),daily_summary_time:String(payload.daily_summary_time||'19:30'),balance_report_enabled:Boolean(payload.balance_report_enabled),performance_report_enabled:Boolean(payload.performance_report_enabled),performance_report_time:String(payload.performance_report_time||'08:30'),velocity_enabled:Boolean(payload.velocity_enabled),velocity_window_minutes:Math.max(15,Math.min(1440,Number(payload.velocity_window_minutes)||60)),velocity_percent:Math.max(1,Math.min(300,Number(payload.velocity_percent)||100)),recommendations_enabled:Boolean(payload.recommendations_enabled),evolution_phone:String(payload.evolution_phone||'').replace(/\D/g,'').slice(0,15),evolution_instance:String(payload.evolution_instance||'').slice(0,100),evolution_group_jid:String(payload.evolution_group_jid||'').slice(0,120),evolution_group_name:String(payload.evolution_group_name||'').slice(0,160)};
      const encoded=Buffer.from(JSON.stringify(config,null,2)).toString('base64');
      const remote=`mkdir -p /opt/meta-ads-cli/data/alerts && echo ${encoded} | base64 -d > /opt/meta-ads-cli/data/alerts/config.json && chmod 600 /opt/meta-ads-cli/data/alerts/config.json`;
      return runMonitorCommand(remote,{timeout:30000},(commandError,stdout,stderr)=>commandError?jsonResponse(res,502,{error:'Falha ao salvar configuração',detail:stderr.trim()}):jsonResponse(res,200,{ok:true,config}));
    });
  }
  if (requestUrl.pathname === '/api/alerts/test' && req.method === 'POST') {
    return readBody(req,(bodyError,payload)=>{
      const message=String(payload?.message||'').trim();
      if(bodyError||!message||message.length>2000)return jsonResponse(res,400,{error:'Mensagem de teste inválida'});
      const encoded=Buffer.from(message,'utf8').toString('base64');
      const remote=`set -a; . /opt/meta-ads-cli/secrets/.env; set +a; export EVOLUTION_API_URL='${process.env.EVOLUTION_API_URL||'http://127.0.0.1:8080'}'; python3 /opt/meta-ads-cli/monitor/alert_engine.py --mode test --force-send --message-base64 ${encoded}`;
      return runMonitorCommand(remote,{timeout:60000,maxBuffer:1024*1024},(error,stdout,stderr)=>{
        if(error)return jsonResponse(res,502,{error:'Falha ao enviar teste',detail:stderr.trim()});
        try{return jsonResponse(res,200,JSON.parse(stdout))}catch{return jsonResponse(res,502,{error:'Resposta inválida do teste'})}
      });
    });
  }
  if (requestUrl.pathname === '/api/meta-monitor-config/sync' && req.method === 'POST') {
    let body='';
    req.on('data',chunk=>{body+=chunk;if(body.length>256*1024)req.destroy()});
    return req.on('end',()=>{
      let submitted;
      try{submitted=JSON.parse(body).accounts}catch{return res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Lista de contas inválida'}))}
      if(!Array.isArray(submitted)||!submitted.length||submitted.some(item=>!/^act_\d+$/.test(item?.id||''))){res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Contas inválidas para monitoramento'}))}
      const configPath=path.resolve(root,'..','Meta Ads Monitor','monitored_accounts.json'),temporaryPath=`${configPath}.tmp`;
      let current={accounts:[]};try{current=JSON.parse(fs.readFileSync(configPath,'utf8'))}catch{}
      const merged=new Map((current.accounts||[]).map(item=>[item.id,item]));
      submitted.forEach(item=>merged.set(item.id,{id:item.id,name:String(item.name||item.id).trim().slice(0,160)}));
      const output=JSON.stringify({accounts:[...merged.values()]},null,2)+'\n';
      fs.writeFile(temporaryPath,output,'utf8',error=>{
        if(error){res.writeHead(500,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Falha ao registrar contas monitoradas'}))}
        fs.rename(temporaryPath,configPath,renameError=>{
          if(renameError){res.writeHead(500,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Falha ao ativar contas monitoradas'}))}
          res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(output);
        });
      });
    });
  }
  if (requestUrl.pathname === '/api/meta-monitor-config') {
    const config = path.resolve(root, '..', 'Meta Ads Monitor', 'monitored_accounts.json');
    return fs.readFile(config, (error,data)=>{
      if(error){res.writeHead(500,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Configuração monitorada indisponível'}))}
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(data);
    });
  }
  if (requestUrl.pathname === '/api/meta-spend') {
    const from = requestUrl.searchParams.get('from');
    const to = requestUrl.searchParams.get('to');
    const accountIds = (requestUrl.searchParams.get('accounts') || '').split(',').filter(Boolean);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
      res.writeHead(400, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Período inválido'}));
    }
    if (accountIds.some(id=>!/^act_\d+$/.test(id))) {
      res.writeHead(400, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Conta inválida'}));
    }
    const remote = `set -a; . /opt/meta-ads-cli/secrets/.env; set +a; python3 /opt/meta-ads-cli/monitor/dashboard_spend.py ${from} ${to}${accountIds.length?` ${accountIds.join(' ')}`:''}`;
    return runMonitorCommand(remote,{timeout:120000,maxBuffer:5*1024*1024},(error,stdout,stderr)=>{
      if(error){res.writeHead(502,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Falha na auditoria Meta',detail:stderr.trim()}))}
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(stdout);
    });
  }
  if (requestUrl.pathname === '/api/meta-accounts') {
    const remote = `python3 /opt/meta-ads-cli/monitor/diagnose_access.py --sample-accounts 0 --output /tmp/dashboard-meta-accounts.json >/dev/null && cat /tmp/dashboard-meta-accounts.json`;
    return runMonitorCommand(remote,{timeout:120000,maxBuffer:5*1024*1024},(error,stdout,stderr)=>{
      if(error){res.writeHead(502,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Falha ao buscar contas na Meta',detail:stderr.trim()}))}
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(stdout);
    });
  }
  if (requestUrl.pathname === '/api/meta-analysis') {
    const from = requestUrl.searchParams.get('from');
    const to = requestUrl.searchParams.get('to');
    const accountIds = (requestUrl.searchParams.get('accounts') || '').split(',').filter(Boolean);
    const configPath = path.resolve(root, '..', 'Meta Ads Monitor', 'monitored_accounts.json');
    let allowed=[];try{allowed=JSON.parse(fs.readFileSync(configPath,'utf8')).accounts.map(item=>item.id)}catch{}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '') || !accountIds.length || accountIds.some(id=>!/^act_\d+$/.test(id)||!allowed.includes(id))) {
      res.writeHead(400, {'Content-Type':'application/json'}); return res.end(JSON.stringify({error:'Parâmetros de análise inválidos'}));
    }
    const cacheKey = `${from}|${to}|${[...accountIds].sort().join(',')}`;
    const cached = analysisResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < ANALYSIS_CACHE_TTL) {
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Analysis-Cache':'HIT'});return res.end(cached.body);
    }
    const remote = `set -a; . /opt/meta-ads-cli/secrets/.env; set +a; python3 /opt/meta-ads-cli/monitor/analysis_breakdowns.py ${from} ${to} ${accountIds.join(' ')}`;
    return runMonitorCommand(remote,{timeout:180000,maxBuffer:12*1024*1024},(error,stdout,stderr)=>{
      if(error){res.writeHead(502,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Falha na análise Meta',detail:stderr.trim()}))}
      try{JSON.parse(stdout)}catch{res.writeHead(502,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Resposta inválida da análise Meta'}))}
      analysisResponseCache.set(cacheKey,{createdAt:Date.now(),body:stdout});
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Analysis-Cache':'MISS'});res.end(stdout);
    });
  }
  const clean = decodeURIComponent(req.url.split('?')[0]);
  const target = path.resolve(root, clean === '/' ? 'index.html' : `.${clean}`);
  if (!target.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  });
}).listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Dashboard Meta Ads: http://${process.env.HOST||'127.0.0.1'}:${port}`));
