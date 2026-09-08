const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {createPersonalMeta}=require('../Dashboard Meta Ads/personal-meta');
test('server search ignores legacy shared analyzer settings and completes for two isolated users',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hurtz-shared-')),vault=createPersonalMeta({directory:dir});
 const worker='la_service_test',other='la_other_service';
 for(const [token,id] of [[worker,'worker-a'],[other,'worker-b']])vault.write('local-access',token,{id,scope:'platform_agent',expires:Date.now()+60000});
 const child=spawn(process.execPath,['--require',path.join(__dirname,'local-providers.cjs'),path.resolve(__dirname,'../dev/local-server.cjs')],{env:{...process.env,PORT:'8096',LOCAL_DATA_DIR:dir,ANALYTICS_SHARED_ANALYZER:'1'},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{child.kill();await new Promise(r=>child.once('close',r));fs.rmSync(dir,{recursive:true,force:true})});
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject)});
 const req=async(token,route,method='GET',data)=>{const r=await fetch('http://127.0.0.1:8096'+route,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,body:await r.json()}};
 const a=(await req('','/api/auth/signup','POST',{email:'a@example.test',password:'test-password'})).body.token;
 const b=(await req('','/api/auth/signup','POST',{email:'b@example.test',password:'test-password'})).body.token;
 for(const user of [a,b]){
  const c=await req(user,'/api/local/settings','PUT',{visualAudit:true,apifyToken:'test-apify'});
  assert.equal(c.body.visualAudit,false);assert.equal(c.body.sharedAnalyzer,false);
  const result=await req(user,'/api/creative-search','POST',{terms:['HB20'],platform:'tiktok',limit:1});
  assert.equal(result.status,200);assert.equal(result.body.status,'complete');assert.equal(result.body.approved.length,1);
  const resumed=await req(user,'/api/creative-audit/status?id='+result.body.id);
  assert.equal(resumed.body.status,'complete');assert.equal(resumed.body.approved.length,1);assert.equal(resumed.body.visual_audit_enabled,false);
  assert.equal((await req(user===a?b:a,'/api/creative-audit/status?id='+result.body.id)).status,404);
 }
 assert.equal((await req(worker,'/api/creative-audit/agent/claim','POST',{})).status,403);
});
