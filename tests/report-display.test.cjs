const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/app.js'),'utf8');
const sourceLine=prefix=>source.split('\n').find(line=>line.startsWith(prefix));
// Extrai uma função inteira, da linha de declaração até fechar as chaves.
const functionSource=name=>{
 const lines=source.split('\n'),start=lines.findIndex(line=>line.startsWith('function '+name+'('));
 let depth=0,end=start;
 for(let index=start;index<lines.length;index++){
  for(const char of lines[index]){if(char==='{')depth++;if(char==='}')depth--}
  if(depth===0){end=index;break}
 }
 return lines.slice(start,end+1).join('\n');
};
// Carrega o agrupamento real do relatório, com o reconhecimento de produto do app.
const loadReportGrouping=()=>{
 const context=vm.createContext({});
 vm.runInContext([
  sourceLine('const normalizedCampaignText='),
  sourceLine('const inferredProduct='),
  sourceLine('const REPORT_CHANNELS='),
  functionSource('reportChannel'),
  sourceLine('const reportHasDelivery='),
  sourceLine('const reportConfiguredProduct='),
  sourceLine('const reportIsUnidentified='),
  functionSource('reportGroupFor'),
  functionSource('reportGroupsForRow'),
  'globalThis.reportProductRules=[];',
 ].join('\n'),context);
 return context;
};
test('recognizes the report product aliases',()=>{
 const context=vm.createContext({});
 const inferredProduct=vm.runInContext([sourceLine('const normalizedCampaignText='),sourceLine('const inferredProduct='),'inferredProduct'].join('\n'),context);
 assert.equal(inferredProduct('RD Scurpi setembro'),'RD Sculpt');
 assert.equal(inferredProduct('[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24'),'RD Sculpt');
 assert.equal(inferredProduct('[RD SCULPT] Rafael Dias | Público Quente | Peba+Canaã | 27/08'),'RD Sculpt');
 assert.equal(inferredProduct('Campanha Blefaroplastia'),'Blefaro');
 assert.equal(inferredProduct('Imovel - formulario'),'Imóvel');
});
test('unifies RD Sculpt campaign variants into one product group',()=>{
 const groups=loadReportGrouping().reportGroupsForRow({campaigns:[
  {campaign_name:'[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24',spend:138.56,results:8},
  {campaign_name:'[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24 — Cópia',spend:174.12,results:12},
  {campaign_name:'[RD SCULPT] Rafael Dias | Público Quente | Peba+Canaã | 27/08',spend:172.64,results:13},
 ]});
 assert.equal(groups.length,1);assert.equal(groups[0].name,'RD SCULPT');assert.equal(groups[0].results,33);assert.equal(groups[0].spend,485.32);assert.equal(groups[0].spend/groups[0].results,14.706666666666667);
});
test('unifies any niche using a saved product rule',()=>{
 const context=loadReportGrouping();
 context.reportProductRules=[{match:'New Medic',label:'New Medic'}];
 const groups=context.reportGroupsForRow({campaigns:[{campaign_name:'[WA] New Medic Pro | Público frio',spend:100,results:5},{campaign_name:'NEW MEDIC | Remarketing | Cópia',spend:80,results:8}]});
 assert.equal(groups.length,1);assert.equal(groups[0].name,'NEW MEDIC');assert.equal(groups[0].results,13);assert.equal(groups[0].spend,180);
});
test('the same product splits into Formulário, Site and WhatsApp groups',()=>{
 const groups=loadReportGrouping().reportGroupsForRow({campaigns:[
  {campaign_name:'Imovel - Canaã - Formulário',objective_label:'Formulário',spend:40,results:4},
  {campaign_name:'Imóvel | Parauapebas | Lead',objective_label:'Lead (Meta)',spend:60,results:6},
  {campaign_name:'Imóvel | Site Canaã',objective_label:'Lead no site',spend:25,results:2},
  {campaign_name:'Imóvel - Conversas',objective_label:'Mensagem',spend:30,results:3},
  {campaign_name:'IMÓVEL | WhatsApp Público frio',objective_label:'Mensagem',spend:20,results:1},
 ]});
 assert.deepEqual(JSON.parse(JSON.stringify(groups.map(group=>[group.name,group.spend,group.results]))),[
  ['IMÓVEL - FORMULÁRIO',100,10],['IMÓVEL - SITE',25,2],['IMÓVEL - WHATSAPP',50,4]]);
 assert.equal(groups[0].productLabel,'IMÓVEL');
});
test('campaigns without delivery in the period stay out of the report',()=>{
 const groups=loadReportGrouping().reportGroupsForRow({campaigns:[
  {campaign_name:'Imóvel - Formulário',objective_label:'Formulário',spend:40,results:4},
  {campaign_name:'Imóvel - Formulário antiga',objective_label:'Formulário',spend:0,results:0},
  {campaign_name:'Imóvel - WhatsApp parada',objective_label:'Mensagem',spend:0,results:0,no_delivery_in_period:true},
 ]});
 assert.equal(groups.length,1);
 assert.equal(groups[0].name,'IMÓVEL - FORMULÁRIO');
 assert.equal(groups[0].spend,40);
});
test('unidentified campaigns keep their full original names, and the channel is added',()=>{
 const groups=loadReportGrouping().reportGroupsForRow({campaigns:[
  {campaign_name:'Oferta Procedimento - Peba+Canaã',objective_label:'Mensagem',spend:10,results:2},
  {campaign_name:'Antes e Depois | Parauapebas',objective_label:'Mensagem',spend:20,results:3},
 ]});
 assert.equal(groups[0].name,'Oferta Procedimento - Peba+Canaã - WHATSAPP');
 assert.equal(groups[0].productLabel,'Oferta Procedimento - Peba+Canaã');
 assert.equal(groups[1].name,'Antes e Depois | Parauapebas - WHATSAPP');
});
test('a campaign without a known objective is grouped by product alone',()=>{
 const groups=loadReportGrouping().reportGroupsForRow({campaigns:[
  {campaign_name:'[RD SCULPT] Público frio',spend:50,results:5},
  {campaign_name:'RD Sculpt - Remarketing',objective_label:'Mensagem',spend:30,results:3},
 ]});
 assert.equal(groups.length,2);
 assert.equal(groups[0].name,'RD SCULPT');
 assert.equal(groups[1].name,'RD SCULPT - WHATSAPP');
});
