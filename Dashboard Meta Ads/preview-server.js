const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const root = __dirname;
const port = Number(process.env.PORT || 8091);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const analysisResponseCache = new Map();
const ANALYSIS_CACHE_TTL = 15 * 60 * 1000;
const alertDataDir = process.env.META_ALERT_DATA_DIR || (process.platform === 'win32' ? path.join(root,'.alert-data') : '/opt/meta-ads-cli/data/alerts');
const readJsonFile = (file,fallback={}) => { try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback} };
const writeJsonFile = (file,value) => { fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=`${file}.tmp`;fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{encoding:'utf8',mode:0o600});fs.renameSync(temporary,file) };
const readBody = (req,callback) => {let body='';req.on('data',chunk=>{body+=chunk;if(body.length>512*1024)req.destroy()});req.on('end',()=>{try{callback(null,JSON.parse(body||'{}'))}catch(error){callback(error)}})};
const jsonResponse = (res,status,payload) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://analytics.hurtzcompany.com','Access-Control-Allow-Methods':'GET,PUT,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});res.end(JSON.stringify(payload))};
const authFile=process.env.API_AUTH_FILE||'/opt/meta-ads-cli/secrets/analytics-api-basic.env';
const authConfig=()=>{const values={};try{fs.readFileSync(authFile,'utf8').split(/\r?\n/).forEach(line=>{const index=line.indexOf('=');if(index>0)values[line.slice(0,index)]=line.slice(index+1)})}catch{}return values};
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

http.createServer((req,res)=>{
  const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'https://analytics.hurtzcompany.com','Access-Control-Allow-Methods':'GET,PUT,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});return res.end()}
  if(process.env.API_AUTH_REQUIRED==='1'&&requestUrl.pathname.startsWith('/api/')){
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
        plans[id]={deposit:Number(plan.deposit)||0,depositDate:String(plan.depositDate||''),depositTime:String(plan.depositTime||'00:00'),plannedDays:Math.max(1,Number(plan.plannedDays)||1),dailyLimit:Number(plan.dailyLimit)||0};
      }
      try{writeJsonFile(file,{updated_at:new Date().toISOString(),plans});jsonResponse(res,200,{ok:true,count:Object.keys(plans).length})}catch{return jsonResponse(res,500,{error:'Falha ao salvar planejamentos'})}
    });
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
  if (requestUrl.pathname === '/api/alerts/config' && req.method === 'PUT') {
    return readBody(req,(error,payload)=>{
      if(error)return jsonResponse(res,400,{error:'Configuração inválida'});
      const thresholds=(payload.thresholds||[]).map(Number).filter(value=>value>=1&&value<=300).slice(0,8);
      const config={enabled:Boolean(payload.enabled),dry_run:Boolean(payload.dry_run),thresholds:thresholds.length?thresholds:[75,90,100,120],balance_thresholds:[50,75,90,100],quiet_start:String(payload.quiet_start||'21:00'),quiet_end:String(payload.quiet_end||'07:00'),daily_summary_time:String(payload.daily_summary_time||'19:30'),velocity_enabled:Boolean(payload.velocity_enabled),velocity_window_minutes:Math.max(15,Math.min(1440,Number(payload.velocity_window_minutes)||60)),velocity_percent:Math.max(1,Math.min(300,Number(payload.velocity_percent)||100)),recommendations_enabled:Boolean(payload.recommendations_enabled),evolution_phone:String(payload.evolution_phone||'').replace(/\D/g,'').slice(0,15),evolution_instance:String(payload.evolution_instance||'').slice(0,100),evolution_group_jid:String(payload.evolution_group_jid||'').slice(0,120),evolution_group_name:String(payload.evolution_group_name||'').slice(0,160)};
      const encoded=Buffer.from(JSON.stringify(config,null,2)).toString('base64');
      const remote=`mkdir -p /opt/meta-ads-cli/data/alerts && echo ${encoded} | base64 -d > /opt/meta-ads-cli/data/alerts/config.json && chmod 600 /opt/meta-ads-cli/data/alerts/config.json`;
      return runMonitorCommand(remote,{timeout:30000},(commandError,stdout,stderr)=>commandError?jsonResponse(res,502,{error:'Falha ao salvar configuração',detail:stderr.trim()}):jsonResponse(res,200,{ok:true,config}));
    });
  }
  if (requestUrl.pathname === '/api/alerts/test' && req.method === 'POST') {
    const remote=`set -a; . /opt/meta-ads-cli/secrets/.env; set +a; python3 /opt/meta-ads-cli/monitor/alert_engine.py --mode test`;
    return runMonitorCommand(remote,{timeout:60000,maxBuffer:1024*1024},(error,stdout,stderr)=>{
      if(error)return jsonResponse(res,502,{error:'Falha ao enviar teste',detail:stderr.trim()});
      try{return jsonResponse(res,200,JSON.parse(stdout))}catch{return jsonResponse(res,502,{error:'Resposta inválida do teste'})}
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
