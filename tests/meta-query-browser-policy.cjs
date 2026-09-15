const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/app.js'),'utf8');
function fixture(fetcher){
 let notice=null;
 const context=vm.createContext({Response,URL,DOMException,Date,Map,Set,Promise,setTimeout,location:{origin:'https://example.test'},monitorApiFetch:fetcher,fetch:fetcher,
 document:{querySelector:selector=>selector==='#metaQueryNotice'?notice:selector==='main'?{prepend:node=>{notice=node}}:null,createElement:()=>({style:{},setAttribute(){}})}});
 vm.runInContext(source.slice(source.indexOf('const pendingReportRequests=new Map();'),source.indexOf('window.fetch=(input'))+source.slice(source.indexOf('const wait=milliseconds'),source.indexOf('const buttonLoadingState=')),context);
 return {context,notice:()=>notice};
}
test('queued browser queries stop at 429 and show a recovery time',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return new Response(JSON.stringify({retry_after:240}),{status:429})});
 const results=await vm.runInContext("Promise.all([limitedReportRequest('/one',{}),limitedReportRequest('/two',{})])",f.context);
 assert.equal(calls,1);assert.ok(results.every(x=>x.status===429));assert.equal(f.notice().hidden,false);assert.ok(f.notice().textContent.includes('Tente atualizar'));
});
test('retry helper never retries rate limits or permission errors',async()=>{
 for(const status of [401,403,409,429]){
  let calls=0;const f=fixture(async()=>{calls++;return new Response('{"error":"blocked"}',{status})});
  await assert.rejects(vm.runInContext("fetchJsonWithRetry('/report',{attempts:3,delay:1})",f.context));assert.equal(calls,1);
 }
});
test('equivalent account selections share a single browser request',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return new Response('{"accounts":{}}')});
 const results=await vm.runInContext("Promise.all([personalReportFetch('/api/meta-spend?accounts=act_2,act_1&from=2026-09-01',{}),personalReportFetch('/api/meta-spend?from=2026-09-01&accounts=act_1,act_2',{})])",f.context);
 assert.equal(calls,1);assert.equal(results.length,2);
});
