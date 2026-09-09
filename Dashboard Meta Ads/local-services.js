'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');
const {fail}=require('./local-store');
function createServices({vault,store,folder,body,fetchImpl=fetch}){
 const ownInstances=()=>store.get('instances',[]);
 const checkInstance=name=>{if(!ownInstances().includes(name))throw fail(403,'Esta instância não pertence ao seu espaço local.');return encodeURIComponent(name)};
 async function evolution(route,method='GET',payload){const c=store.get('integrations',{});if(!c.evolutionUrl||!c.evolutionKey)throw fail(409,'Configure a Evolution em Configurações.');const response=await fetchImpl(c.evolutionUrl.replace(/\/$/,'')+route,{method,headers:{apikey:c.evolutionKey,'Content-Type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal:AbortSignal.timeout(60000)});const data=await response.json();if(!response.ok)throw fail(502,`A Evolution recusou a operação (HTTP ${response.status}).`);return data}
 async function groups(instance){const rows=await evolution('/group/fetchAllGroups/'+checkInstance(instance)+'?getParticipants=false');return (Array.isArray(rows)?rows:rows.data||[]).map(r=>({id:r.id||r.jid,name:r.subject||r.name||r.id})).filter(r=>r.id)}
 function readFile(name,fallback){try{return JSON.parse(fs.readFileSync(path.join(folder(),name),'utf8'))}catch{return fallback}}
 function writeFile(name,value){const target=path.join(folder(),name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value),{mode:0o600})}
 function config(){return readFile('alerts/config.json',{enabled:false,dry_run:true,thresholds:[75,90,100,120]})}
 function history(){try{return fs.readFileSync(path.join(folder(),'alerts/history.jsonl'),'utf8').trim().split('\n').filter(Boolean).slice(-100).map(x=>JSON.parse(x)).reverse()}catch{return []}}
 function python(script,args,env,input){return new Promise((resolve,reject)=>{const child=execFile(process.env.META_PYTHON||(process.platform==='win32'?'python':'python3'),[path.resolve(__dirname,'../Meta Ads Monitor',script),...args],{env:{...process.env,...env,PYTHONIOENCODING:'utf-8'},timeout:300000,maxBuffer:16*1024*1024},(error,stdout)=>{if(error)return reject(fail(502,'O processamento local não foi concluído. Confira Python e as permissões da integração.'));try{resolve(JSON.parse(stdout))}catch{reject(fail(502,'Resposta inválida do processamento local.'))}});child.stdin.on('error',()=>{});child.stdin.end(input?JSON.stringify(input):'')})}
 const running=new Map();
 async function runAlerts({testMessage,forceSend=false}={}){
  const u=store.user();if(running.has(u.id))throw fail(409,'Uma verificação deste usuário já está em andamento.');running.set(u.id,true);
  try{
   const c=config(),integration=store.get('integrations',{}),dir=folder();
   if(forceSend){checkInstance(c.evolution_instance);if(!(await groups(c.evolution_instance)).some(g=>g.id===c.evolution_group_jid))throw fail(403,'O grupo não está disponível nesta instância.');}
   const env={META_ALERT_DATA_DIR:path.join(dir,'alerts'),META_AUDIT_DATA_DIR:path.join(dir,'audits'),META_MONITORED_ACCOUNTS:path.join(dir,'monitored.json'),EVOLUTION_API_URL:integration.evolutionUrl||'',EVOLUTION_API_KEY:integration.evolutionKey||'',META_ACCESS_TOKEN:'',META_USER_ACCESS_TOKEN:''};
   let conn;
   if(!testMessage){
    if(!c.enabled)return {ok:true,enabled:false,message:'Ative os alertas para executar a verificação.'};
    if(!c.dry_run)checkInstance(c.evolution_instance);
    const catalog=await vault.catalog(u);conn=catalog.conn;const settings=vault.read('settings',u.id)||{},allowed=new Set(catalog.accounts.map(a=>a.id));
    const planned=Object.keys(settings.plans?.plans||{}).filter(id=>allowed.has(id));if(!planned.length)throw fail(409,'Configure o planejamento de pelo menos uma conta autorizada.');
    writeFile('monitored.json',{accounts:catalog.accounts.filter(a=>planned.includes(a.id)).map(({id,name})=>({id,name}))});writeFile('alerts/plans.json',{plans:Object.fromEntries(planned.map(id=>[id,settings.plans.plans[id]]))});
    const last=readFile('alerts/revision.json',{});if(last.revision!==conn.revision){writeFile('alerts/state.json',{sent:{}});writeFile('alerts/revision.json',{revision:conn.revision})}
    // Pending deliveries are revalidated against the current account list.
    const state=readFile('alerts/state.json',{});state.pending=Object.fromEntries(Object.entries(state.pending||{}).filter(([,item])=>!item.account||planned.includes(item.account.id)));writeFile('alerts/state.json',state);
    env.META_ACCESS_TOKEN=conn.token;env.META_USER_ACCESS_TOKEN=conn.token;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
    const report=await vault.report(u,'spend',new URL('http://local/?from='+today+'&to='+today+'&accounts='+planned.join(',')));writeFile('audits/today-latest.json',report);
    if(c.recommendations_enabled){const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-89);const data=await vault.report(u,'spend',new URL('http://local/?from='+start.toISOString().slice(0,10)+'&to='+today+'&accounts='+planned.join(',')));writeFile('audits/90d-latest.json',data)}
   }
   const args=testMessage?['--mode','test','--message-base64',Buffer.from(testMessage).toString('base64'),...(forceSend?['--force-send']:[])]:['--mode','all'];
   if(conn&&vault.connection(u).revision!==conn.revision)throw fail(409,'A conexão mudou. Execute novamente.');
   const result=await python('alert_engine.py',args,env);store.put('monitor-status',{ok:true,at:new Date().toISOString()});return result;
  }finally{running.delete(u.id)}
 }
 const commentPermissions=['pages_show_list','pages_read_engagement','pages_read_user_content','pages_manage_engagement'];
 async function commentPermissionStatus(conn){const rows=await vault.rows(conn.token,'me/permissions'),granted=new Set(rows.filter(p=>p.status==='granted').map(p=>p.permission));return {permissions:[...granted],missingPermissions:commentPermissions.filter(p=>!granted.has(p))}}
 async function commentPages(){
  const u=store.user(),conn=vault.connection(u),access=await commentPermissionStatus(conn),pages=new Map(),warnings=[];
  const collect=async(route)=>{try{for(const p of await vault.rows(conn.token,route,{fields:'id,name'}))pages.set(p.id,{id:p.id,name:p.name})}catch(e){warnings.push({source:route,message:e.message})}};
  await collect('me/accounts');
  if(access.permissions.includes('business_management')){try{const businesses=await vault.rows(conn.token,'me/businesses',{fields:'id'});let next=0;const worker=async()=>{while(next<businesses.length){const b=businesses[next++];await Promise.all([collect(b.id+'/owned_pages'),collect(b.id+'/client_pages')])}};await Promise.all(Array.from({length:Math.min(3,businesses.length)},worker))}catch(e){warnings.push({source:'businesses',message:e.message})}}
  if(vault.connection(u).revision!==conn.revision)throw fail(409,'A conexão mudou. Atualize a consulta.');return {pages:[...pages.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),...access,warnings};
 }
 async function comments(req,url){
  const u=store.user(),permissionConnection=vault.connection(u),access=await commentPermissionStatus(permissionConnection);
  const required=req.method==='GET'?['pages_read_engagement','pages_read_user_content']:['pages_manage_engagement'],missing=required.filter(p=>!access.permissions.includes(p));
  if(missing.length)throw fail(403,'A conexão não recebeu '+missing.join(', ')+'. Se você já autorizou novamente, o administrador do Tryv CRM precisa verificar a liberação dessas permissões para usuários em produção. Atualizar a lista de páginas não concede permissões.');
  if(req.method==='GET'){
   const ids=(url.searchParams.get('accounts')||'').split(',').filter(Boolean),status=url.searchParams.get('status')||'active',days=url.searchParams.get('days')||'30';
   if(!['active','inactive','all'].includes(status)||!['7','30','90','all'].includes(days))throw fail(400,'Filtros inválidos.');
   const pageId=url.searchParams.get('page');
   if(pageId&&!(await commentPages()).pages.some(p=>p.id===pageId))throw fail(403,'Esta página não está autorizada para seu Facebook.');
   const {conn,accounts}=pageId?await vault.catalog(u):await vault.authorizeAccounts(u,ids),output=[],warnings=[],observed={};
   if(pageId)ids.splice(0,ids.length,...accounts.map(a=>a.id));
   let nextAccount=0;const worker=async()=>{while(nextAccount<ids.length){const id=ids[nextAccount++];try{const ads=await vault.rows(conn.token,id+'/ads',{fields:'id,name,created_time,effective_status,campaign{name},adset{name},creative{effective_object_story_id,object_story_id,thumbnail_url}'});
    for(const ad of ads.filter(a=>status==='all'||(status==='active')===(a.effective_status==='ACTIVE'))){
     const post=ad.creative?.effective_object_story_id||ad.creative?.object_story_id;if(!post||(pageId&&post.split('_')[0]!==pageId))continue;
     try{const page=post.split('_')[0],pageToken=(await vault.graph(conn.token,page,{fields:'access_token'})).access_token||conn.token;
      const rows=await vault.rows(pageToken,post+'/comments',{fields:'id,message,created_time,like_count,comment_count,from{id,name},is_hidden,permalink_url',filter:'stream',...(days==='all'?{}:{since:Math.floor(Date.now()/1000)-Number(days)*86400})});
      let publishedTime=null;if(rows.length){try{publishedTime=(await vault.graph(pageToken,post,{fields:'created_time'})).created_time||null}catch{}}
      rows.forEach(c=>observed[c.id]={account:id,page,revision:conn.revision,expires:Date.now()+3600000});
      if(rows.length)output.push({platform:'facebook',account_id:id,account_name:accounts.find(a=>a.id===id)?.name,ad:{id:ad.id,name:ad.name,created_time:ad.created_time||null,published_time:publishedTime,effective_status:ad.effective_status,campaign_name:ad.campaign?.name,adset_name:ad.adset?.name,post_id:post,thumbnail_url:ad.creative?.thumbnail_url||''},comments:rows.map(comment=>({...comment,platform:'facebook'}))});
     }catch(e){warnings.push({account_id:id,ad_id:ad.id,message:e.message})}
    }
   }catch(e){warnings.push({account_id:id,message:e.message})}}};await Promise.all(Array.from({length:Math.min(4,ids.length)},worker));
   if(vault.connection(u).revision!==conn.revision)throw fail(409,'Conexão alterada durante a busca.');store.put('comment-observations',observed);
   return {ads:output,warnings,accounts:ids.length,comments:output.reduce((n,row)=>n+row.comments.length,0)};
  }
  if(req.method!=='POST')throw fail(405,'Método não permitido.');
  const p=await body(req),ids=[...new Set(p.comment_ids||[])],seen=store.get('comment-observations',{}),conn=vault.connection(u);
  if(!['hide','unhide','delete'].includes(p.action)||!ids.length||ids.length>100||ids.some(id=>!seen[id]||seen[id].expires<Date.now()||seen[id].revision!==conn.revision))throw fail(403,'Busque os comentários novamente antes de moderar.');
  await vault.authorizeAccounts(u,[...new Set(ids.map(id=>seen[id].account))]);const results=[];
  for(const id of ids){try{const token=(await vault.graph(conn.token,seen[id].page,{fields:'access_token'})).access_token||conn.token;const r=await fetchImpl('https://graph.facebook.com/v25.0/'+encodeURIComponent(id),{method:p.action==='delete'?'DELETE':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/x-www-form-urlencoded'},...(p.action==='delete'?{}:{body:new URLSearchParams({is_hidden:String(p.action==='hide')})}),signal:AbortSignal.timeout(45000)});const data=await r.json();results.push({id,ok:r.ok&&(data===true||data?.success===true),...(!r.ok||!(data===true||data?.success===true)?{error:'A Meta não autorizou a moderação deste comentário.'}:{})})}catch{results.push({id,ok:false,error:'Falha na resposta da Meta.'})}}
  const result={action:p.action,results,success:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length};store.put('comment-history',[{id:crypto.randomUUID(),created_at:new Date().toISOString(),action:p.action,comment_ids:ids,success:result.success,failed:result.failed},...store.get('comment-history',[])].slice(0,500));return result;
 }
 async function handle(req,url){const route=url.pathname;
  if(route==='/api/meta-comment-pages'&&req.method==='GET')return commentPages();
  if(route==='/api/meta-comments')return comments(req,url);
  if(route==='/api/meta-comment-history')return {events:store.get('comment-history',[])};
  if(route==='/api/alerts')return {config:config(),history:history(),last_run:readFile('alerts/state.json',{}).last_run,monitor_error:store.get('monitor-status',{})?.error,evolution_configured:Boolean(store.get('integrations',{}).evolutionKey&&config().evolution_instance)};
  if(route==='/api/alerts/config'&&req.method==='PUT'){
   const p=await body(req),c={};for(const k of ['enabled','dry_run','velocity_enabled','recommendations_enabled','balance_report_enabled','performance_report_enabled'])c[k]=Boolean(p[k]);
   c.dry_run=p.dry_run!==false;for(const k of ['quiet_start','quiet_end','daily_summary_time','performance_report_time']){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p[k]||''))throw fail(400,'Horário inválido.');c[k]=p[k]}
   c.thresholds=(p.thresholds||[]).map(Number).filter(n=>Number.isFinite(n)&&n>=1&&n<=300).slice(0,8);c.balance_thresholds=[50,75,90,100];c.velocity_window_minutes=Math.max(15,Math.min(1440,Number(p.velocity_window_minutes)||60));c.velocity_percent=Math.max(1,Math.min(300,Number(p.velocity_percent)||100));
   for(const k of ['evolution_instance','evolution_group_jid','evolution_group_name','evolution_phone'])c[k]=String(p[k]||'').slice(0,160);
   if(c.evolution_instance){checkInstance(c.evolution_instance);if(c.evolution_group_jid&&!(await groups(c.evolution_instance)).some(g=>g.id===c.evolution_group_jid))throw fail(403,'Grupo não autorizado nesta instância.')}
   if(c.enabled&&!c.dry_run&&(!c.evolution_instance||!c.evolution_group_jid))throw fail(400,'Configure instância e grupo antes de ativar envios.');
   writeFile('alerts/config.json',c);return {ok:true,config:c};
  }
  if(route==='/api/alerts/run'&&req.method==='POST')return runAlerts();
  if(route==='/api/alerts/test'&&req.method==='POST'){const p=await body(req);if(typeof p.message!=='string'||!p.message.trim()||p.message.length>2000)throw fail(400,'Mensagem inválida.');return runAlerts({testMessage:p.message,forceSend:true})}
  if(route==='/api/evolution/instance'&&req.method==='POST'){const p=await body(req),name='local-'+crypto.createHash('sha256').update(store.user().id).digest('hex').slice(0,10)+'-'+crypto.randomBytes(5).toString('hex');const r=await evolution('/instance/create','POST',{instanceName:name,qrcode:true,integration:'WHATSAPP-BAILEYS'});store.put('instances',[...ownInstances(),name]);return {instance:name,state:r.instance?.status||'connecting',qr:r.qrcode?.base64}}
  if(route==='/api/evolution/phone'){const wanted=(url.searchParams.get('phone')||'').replace(/\D/g,'');if(wanted.length<10)throw fail(400,'Informe o telefone completo.');const rows=await evolution('/instance/fetchInstances');const instances=(Array.isArray(rows)?rows:[]).map(r=>({instance:r.name||r.instance?.instanceName,phone:String(r.ownerJid||r.instance?.owner||'').split('@')[0].split(':')[0],connected:(r.connectionStatus||r.instance?.status)==='open'})).filter(r=>ownInstances().includes(r.instance)&&r.phone===wanted);return {found:!!instances.length,instances}}
  if(route==='/api/evolution/groups')return {groups:await groups(url.searchParams.get('instance'))};
  if(['/api/evolution/qr','/api/evolution/status'].includes(route)){const name=url.searchParams.get('instance'),safe=checkInstance(name);if(route.endsWith('qr')){const r=await evolution('/instance/connect/'+safe);return {instance:name,qr:r.base64||r.qrcode?.base64,pairing_code:r.pairingCode}}const r=await evolution('/instance/connectionState/'+safe),state=r.instance?.state||r.state||'unknown';return {instance:name,state,connected:['open','connected'].includes(state),phone:''}}
  return undefined;
 }
 return {handle,runAlerts,config,python};
}
module.exports={createServices};
