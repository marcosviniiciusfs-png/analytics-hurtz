'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {AsyncResource}=require('node:async_hooks');
const {createStore,fail}=require('./local-store');
const {createServices}=require('./local-services');
function createRuntime(vault,{production=false}={}){
 const store=createStore(vault),root=path.resolve(vault.directory,'workspaces');
 const defaults=production?require('./integration-config').defaults():{};
 const sharedAnalyzer=process.env.ANALYTICS_SHARED_ANALYZER==='1';
 const isPlatformWorker=()=>store.context.getStore()?.scope==='platform_agent';
 const ownGet=store.get;store.get=(kind,fallback)=>kind==='integrations'?{...defaults,...ownGet(kind,fallback),...(sharedAnalyzer?{visualAudit:true}:{})}:ownGet(kind,fallback);
 function folder(){const dir=path.join(root,crypto.createHash('sha256').update(store.user().id).digest('hex'));fs.mkdirSync(dir,{recursive:true,mode:0o700});return dir}
 function body(req){return new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>8*1024*1024){reject(fail(413,'Dados acima do limite.'));req.destroy()}else chunks.push(c)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString()||'{}'))}catch{reject(fail(400,'JSON inválido.'))}});});}
 const services=createServices({vault,store,folder,body});
 const registry=()=>vault.read('local-users','registry')||[];
 function register(id,email){const rows=registry();if(!rows.some(r=>r.id===id))vault.write('local-users','registry',[...rows,{id,email}])}
 const tries=new Map();
 async function auth(req,route){
  const p=await body(req),email=String(p.email||'').trim().toLowerCase(),password=String(p.password||'');
  if(!['login','signup'].includes(route))throw fail(400,'No ambiente local, use o cadastro e o login locais. A recuperação por e-mail exige configurar um provedor.');
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>256)throw fail(400,'Informe um e-mail e uma senha de 8 a 256 caracteres.');
  const attempts=tries.get(email)||{count:0,until:Date.now()+60000};if(attempts.until<Date.now()){attempts.count=0;attempts.until=Date.now()+60000}if(++attempts.count>10)throw fail(429,'Aguarde um minuto antes de tentar novamente.');tries.set(email,attempts);
  let saved=vault.read('local-login',email);
  const derive=(secret,salt)=>new Promise((resolve,reject)=>crypto.scrypt(secret,salt,64,(e,key)=>e?reject(e):resolve(key)));
  if(route==='signup'){
   if(saved)throw fail(409,'Este e-mail já está cadastrado localmente.');const salt=crypto.randomBytes(16).toString('hex'),digest=(await derive(password,salt)).toString('hex');
   if(vault.read('local-login',email))throw fail(409,'Este e-mail já está cadastrado.');saved={id:crypto.randomUUID(),email,salt,digest};vault.write('local-login',email,saved);register(saved.id,email);
  }else{const actual=await derive(password,saved?.salt||'unknown-account');if(!saved||!crypto.timingSafeEqual(actual,Buffer.from(saved.digest,'hex')))throw fail(401,'E-mail ou senha incorretos.');}
  return {ok:true,confirmed:true,token:vault.issueSession(saved),user:{id:saved.id,email},message:'Conta local conectada.'};
 }
 function scopedMap(){const map=new Map();return {set(k,v){v.localOwner=store.user().id;map.set(k,v);return this},get(k){const v=map.get(k),u=store.context.getStore();return !u||isPlatformWorker()||v?.localOwner===u.id?v:undefined},has(k){return !!this.get(k)},allHas(k){return map.has(k)},delete(k){if(this.has(k))return map.delete(k);return false},[Symbol.iterator](){return map[Symbol.iterator]()}}}
 async function dispatch(req,res,url,send,legacy){
  const host=req.headers.host||'';if(!production&&!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))return send(res,403,{error:'Este servidor aceita somente localhost.'});
  const origin=req.headers.origin;const extension=origin?.startsWith('chrome-extension://');
  if(origin&&!extension){let ok=false;try{ok=production?origin===new URL(process.env.ANALYTICS_PUBLIC_URL||'https://analytics.hurtzcompany.com').origin:['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname)}catch{}if(!ok)return send(res,403,{error:'Origem não autorizada no ambiente local.'});}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':origin||'http://localhost:8091','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization,X-Local-Client','Access-Control-Allow-Private-Network':'true'});return res.end()}
  try{
   if(url.pathname==='/api/local/session'&&production)throw fail(404,'Recurso indisponível.');
   if(url.pathname==='/api/local/session'&&req.method==='POST'){
    if(extension||req.headers['x-local-client']!=='1')throw fail(403,'Abra o aplicativo no localhost.');
    const user={id:'local-owner',email:'local@hurtz.dev'};register(user.id,user.email);return send(res,200,{token:vault.issueSession(user)});
   }
   if(url.pathname.startsWith('/api/auth/')){if(production)throw fail(404,'Recurso indisponível.');return send(res,200,await auth(req,url.pathname.slice(10)));}
   if(!url.pathname.startsWith('/api/'))return legacy();
   const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');let user=vault.session(bearer);
   if(!user&&/^la_[\w-]+$/.test(bearer)){const access=vault.read('local-access',bearer);if(access?.expires>Date.now())user=access;}
   if(!user)throw fail(401,'Entre no seu espaço local.');
   if(user.scope==='platform_agent'&&(!sharedAnalyzer||!['/api/creative-audit/agent/heartbeat','/api/creative-audit/agent/claim','/api/creative-audit/agent/media','/api/creative-audit/agent/result'].includes(url.pathname)))throw fail(403,'Credencial exclusiva do serviço de análise.');
   if(user.scope==='agent'&&!url.pathname.startsWith('/api/creative-audit/agent/'))throw fail(403,'Credencial exclusiva do analisador.');
   if(user.scope==='extension'&&url.pathname!=='/api/creative-videos')throw fail(403,'Credencial exclusiva da biblioteca.');
   if(extension&&user.scope!=='extension')throw fail(403,'Gere uma conexão para a extensão em Configurações.');
   if(user.scope!=='platform_agent')register(user.id,user.email);
   return await store.context.run(user,async()=>{
    if(url.pathname==='/api/session'&&req.method==='GET')return send(res,200,{ok:true,personal:true,tools:true,user:{id:user.id,email:user.email}});
    if(url.pathname==='/api/local/settings'){
     if(req.method==='PUT'){
      const p=await body(req),saved=ownGet('integrations',{});
      for(const key of ['apifyToken','evolutionKey'])if(Object.hasOwn(p,key)){if(typeof p[key]!=='string'||p[key].length>4096)throw fail(400,'Credencial inválida.');saved[key]=p[key].trim();}
      if(Object.hasOwn(p,'evolutionUrl')){const value=String(p.evolutionUrl||'').trim();if(production&&value.replace(/\/$/,'')!==String(defaults.evolutionUrl||'').replace(/\/$/,''))throw fail(400,'Use o endereço da Evolution configurado pelo Analytics.');if(value){const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw fail(400,'URL da Evolution inválida.');}saved.evolutionUrl=value.replace(/\/$/,'');}
      if(Object.hasOwn(p,'visualAudit'))saved.visualAudit=Boolean(p.visualAudit);
      store.put('integrations',saved);
     }
     const c=store.get('integrations',{});return send(res,200,{local:!production,user:{id:user.id,email:user.email},apifyConfigured:!!c.apifyToken,evolutionConfigured:!!(c.evolutionUrl&&c.evolutionKey),evolutionUrl:c.evolutionUrl||'',visualAudit:!!c.visualAudit,sharedAnalyzer,analyzerOnline:Date.now()-agentSeen()<45000});
    }
    if(url.pathname==='/api/local/access'&&req.method==='POST'){
     const p=await body(req);if(!['agent','extension'].includes(p.scope))throw fail(400,'Tipo de conexão inválido.');
     const token='la_'+crypto.randomBytes(32).toString('base64url');vault.write('local-access',token,{id:user.id,email:user.email,scope:p.scope,expires:Date.now()+7*86400000});
     return send(res,200,{token,api_url:production?(process.env.ANALYTICS_API_PUBLIC_URL||'https://analytics-api.161-97-148-99.sslip.io'):'http://localhost:'+host.split(':').pop(),expiresInDays:7});
    }
    if(url.pathname==='/api/local/diagnostics'&&req.method==='POST'){
     const checks=[{name:'Armazenamento individual',ok:true}];const c=store.get('integrations',{});
     for(const provider of [{name:'Apify',ready:!!c.apifyToken,url:'https://api.apify.com/v2/acts/clockworks~tiktok-scraper',headers:{Authorization:'Bearer '+c.apifyToken}},{name:'Evolution',ready:!!(c.evolutionUrl&&c.evolutionKey),url:c.evolutionUrl+'/instance/fetchInstances',headers:{apikey:c.evolutionKey}}]){
      if(!provider.ready){checks.push({name:provider.name,ok:false,detail:'Configure a integração.'});continue}
      try{const response=await fetch(provider.url,{headers:provider.headers,signal:AbortSignal.timeout(15000)});checks.push({name:provider.name,ok:response.ok,detail:response.ok?'Conexão validada sem executar buscas ou enviar mensagens.':'A integração recusou a consulta (HTTP '+response.status+').'});await response.body?.cancel()}catch{checks.push({name:provider.name,ok:false,detail:'O provedor não respondeu.'})}
     }
     try{const {accounts}=await vault.catalog(user);checks.push({name:'Facebook',ok:true,detail:accounts.length+' contas autorizadas.'})}catch(e){checks.push({name:'Facebook',ok:false,detail:e.message})}
     return send(res,200,{checks,externalMessagesSent:0});
    }
    const service=await services.handle(req,url);if(service!==undefined)return send(res,200,service);
    if(/^\/api\/(tasks|task-[\w-]+|creative-videos|creative-search-settings|creative-search|creative-thumbnail|creative-audit\/.*)$/.test(url.pathname))return legacy();
    return vault.handle(req,res,user,url,send);
   });
  }catch(e){if(!res.headersSent)return send(res,e.status||500,{error:e.status?e.message:'Não foi possível concluir a operação local.'});res.destroy()}
 }
 function secret(name){const c=store.get('integrations',{});return name==='APIFY_TOKEN'?c.apifyToken||'':''}
 function inject(file,buffer){if(file==='index.html'&&!production)return buffer.toString('utf8').replace('<head>','<head><script>window.HURTZ_LOCAL=true;</script>');return buffer}
 const timer=setInterval(async()=>{for(const u of registry()){await store.context.run(u,async()=>{if(!services.config().enabled)return;try{await services.runAlerts()}catch(e){store.put('monitor-status',{error:e.message,at:new Date().toISOString()})}})}},15*60000);timer.unref();
 let platformHeartbeat=0;const agentTimes=new Map();function agentSeen(time){const id=store.user().id;if(isPlatformWorker()){if(time)platformHeartbeat=time;return platformHeartbeat}if(time)agentTimes.set(id,time);return Math.max(agentTimes.get(id)||0,sharedAnalyzer?platformHeartbeat:0)}
 function mediaToken(owner){if(!isPlatformWorker())return secret('APIFY_TOKEN');return store.context.run({id:owner},()=>secret('APIFY_TOKEN'))}
 function canFinish(job){return !isPlatformWorker()||job.claimedBy===store.user().id}
 return {dispatch,store,folder,secret,mediaToken,canFinish,scopedMap,inject,services,agentSeen,bind:fn=>AsyncResource.bind(fn),visualAudit:()=>!!store.get('integrations',{}).visualAudit};
}
module.exports={createRuntime};
