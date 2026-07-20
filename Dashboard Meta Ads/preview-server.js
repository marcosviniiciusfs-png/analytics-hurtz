const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const root = __dirname;
const port = Number(process.env.PORT || 8091);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const analysisResponseCache = new Map();
const ANALYSIS_CACHE_TTL = 15 * 60 * 1000;

http.createServer((req,res)=>{
  const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
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
    const key = path.join(process.env.USERPROFILE, '.ssh', 'id_ed25519_contabo_monitor');
    const remote = `set -a; . /opt/meta-ads-cli/secrets/.env; set +a; python3 /opt/meta-ads-cli/monitor/dashboard_spend.py ${from} ${to}${accountIds.length?` ${accountIds.join(' ')}`:''}`;
    return execFile('ssh', ['-i', key, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', 'root@161.97.148.99', remote], {timeout:120000,maxBuffer:5*1024*1024}, (error,stdout,stderr)=>{
      if(error){res.writeHead(502,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Falha na auditoria Meta',detail:stderr.trim()}))}
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(stdout);
    });
  }
  if (requestUrl.pathname === '/api/meta-accounts') {
    const key = path.join(process.env.USERPROFILE, '.ssh', 'id_ed25519_contabo_monitor');
    const remote = `python3 /opt/meta-ads-cli/monitor/diagnose_access.py --sample-accounts 0 --output /tmp/dashboard-meta-accounts.json >/dev/null && cat /tmp/dashboard-meta-accounts.json`;
    return execFile('ssh', ['-i', key, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', 'root@161.97.148.99', remote], {timeout:120000,maxBuffer:5*1024*1024}, (error,stdout,stderr)=>{
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
    const key = path.join(process.env.USERPROFILE, '.ssh', 'id_ed25519_contabo_monitor');
    const cacheKey = `${from}|${to}|${[...accountIds].sort().join(',')}`;
    const cached = analysisResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < ANALYSIS_CACHE_TTL) {
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Analysis-Cache':'HIT'});return res.end(cached.body);
    }
    const remote = `set -a; . /opt/meta-ads-cli/secrets/.env; set +a; python3 /opt/meta-ads-cli/monitor/analysis_breakdowns.py ${from} ${to} ${accountIds.join(' ')}`;
    return execFile('ssh', ['-i', key, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', 'root@161.97.148.99', remote], {timeout:180000,maxBuffer:12*1024*1024}, (error,stdout,stderr)=>{
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
}).listen(port,'127.0.0.1',()=>console.log(`Dashboard Meta Ads: http://127.0.0.1:${port}`));
