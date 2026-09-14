const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/app.js'),'utf8');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
test('PNG and ZIP data follow each account, period and user without losing earlier edits',()=>{
 const sandbox=vm.createContext({personalIdentity:{user:{id:'a'}},localIso:d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,num:String,brl:n=>'R$ '+n});
 vm.runInContext(slice('let currentReportContext=null','const reportMetric='),sandbox);
 const first={from:new Date(2026,8,1,12),to:new Date(2026,8,7,12)},second={from:new Date(2026,8,8,12),to:new Date(2026,8,14,12)};
 const make=(account,context,total)=>sandbox.pngReportEdit(account,account,{spend:total},[{name:'Grupo',complete:true,results:total/10,spend:total}],{totalResults:total/10,overallCpl:10,good:'Bom '+total,improve:'Melhorar '+total},context);
 for(const account of ['act_1','act_2','act_3','act_4','act_5','act_6','act_7']){
  const old=make(account,first,100);old.summaryText='Texto editado '+account;old.groupWidth=40;
  const next=make(account,second,250);assert.notEqual(next,old);assert.equal(next.spendValue,'R$ 250');assert.equal(next.leadsValue,'25');assert.match(next.period,/08.*14/);assert.match(next.summaryText,/08\/09\/2026.*14\/09\/2026/);assert.equal(make(account,first,100).summaryText,'Texto editado '+account);assert.equal(make(account,first,100).groupWidth,40);
 }
 sandbox.personalIdentity={user:{id:'b'}};assert.equal(make('act_1',first,90).spendValue,'R$ 90');assert.notEqual(make('act_1',first,90).summaryText,'Texto editado act_1');
});
test('every report batch uses the requested calendar dates and rejects a mismatched period',async()=>{
 const calls=[],sandbox=vm.createContext({AbortController,setTimeout,clearTimeout,localIso:d=>d.date,fetch:async input=>{const u=new URL(input,'https://test');calls.push(u);const since=u.searchParams.get('from'),until=u.searchParams.get('to');return {ok:true,json:async()=>({since,until,accounts:Object.fromEntries(u.searchParams.get('accounts').split(',').map(id=>[id,{reconciled:true}]))})}}});
 vm.runInContext(slice('async function fetchReportBatch(','async function createReportInBatches('),sandbox);
 for(const [from,to] of [['2026-09-01','2026-09-07'],['2026-09-08','2026-09-14']])for(const batch of [['act_1','act_2','act_3'],['act_4','act_5','act_6'],['act_7']])await sandbox.fetchReportBatch(batch,{date:from},{date:to});
 assert.equal(calls.length,12);for(let i=0;i<calls.length;i++){assert.equal(calls[i].searchParams.get('from'),i<6?'2026-09-01':'2026-09-08');assert.equal(calls[i].searchParams.get('to'),i<6?'2026-09-07':'2026-09-14')}
 sandbox.fetch=async()=>({ok:true,json:async()=>({since:'2026-08-01',until:'2026-08-07',accounts:{act_1:{reconciled:true}}})});await assert.rejects(sandbox.fetchReportBatch(['act_1'],{date:'2026-09-01'},{date:'2026-09-07'}),/período diferente/);
});
