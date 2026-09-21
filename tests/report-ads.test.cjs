const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/app.js'),'utf8');
const line=source.split('\n').find(value=>value.startsWith('function reportAdsForAccount('));

test('individual report keeps audited campaigns when Meta returns no ad-level rows',()=>{
 const report={analysis:{accounts:{act_1:{ads:[]}}},payload:{accounts:{act_1:{campaigns:[{campaign_id:'c2',campaign_name:'Zeta',spend:0,results:4,objective_label:'Lead (Meta)',effective_status:'ACTIVE'},{campaign_id:'c1',campaign_name:'Alfa',spend:32.5,results:2,objective_label:'Mensagem',effective_status:'PAUSED'}]}}}};
 const context=vm.createContext({currentReportContext:report});
 vm.runInContext(line,context);
 const rows=context.reportAdsForAccount('act_1');
 assert.deepEqual(JSON.parse(JSON.stringify(rows.map(row=>({id:row.ad_id,name:row.ad_name,format:row.format,spend:row.spend,results:row.results,source:row.report_source})))),[{id:'campaign:c1',name:'Alfa',format:'Campanha',spend:32.5,results:2,source:'campaign'},{id:'campaign:c2',name:'Zeta',format:'Campanha',spend:0,results:4,source:'campaign'}]);
});

test('individual report prefers ad-level rows when Meta returns them',()=>{
 const report={analysis:{accounts:{act_1:{ads:[{ad_id:'a2',ad_name:'Peça B',campaign_name:'Zeta',spend:2},{ad_id:'a1',ad_name:'Peça A',campaign_name:'Alfa',spend:1}]}}},payload:{accounts:{act_1:{campaigns:[{campaign_id:'c1',campaign_name:'Não deve aparecer'}]}}}};
 const context=vm.createContext({currentReportContext:report});
 vm.runInContext(line,context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.reportAdsForAccount('act_1').map(row=>row.ad_id))),['a1','a2']);
});
