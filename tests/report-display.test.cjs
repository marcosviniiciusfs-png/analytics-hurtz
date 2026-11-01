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
const reportGroupingSource=()=>[functionSource('reportChannel'),functionSource('reportGroupName'),sourceLine('const reportConfiguredProduct='),sourceLine('const reportIsUnidentified='),functionSource('reportGroupsForRow'),'globalThis.reportProductRules=[];'].join('\n');
const inferredProductSource=()=>[sourceLine('const normalizedCampaignText='),sourceLine('const inferredProduct=')].join('\n');
test('recognizes the report product aliases',()=>{
 const context=vm.createContext({});
 const inferredProduct=vm.runInContext([inferredProductSource(),'inferredProduct'].join('\n'),context);
 assert.equal(inferredProduct('RD Scurpi setembro'),'RD Sculpt');
 assert.equal(inferredProduct('[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24'),'RD Sculpt');
 assert.equal(inferredProduct('[RD SCULPT] Rafael Dias | Público Quente | Peba+Canaã | 27/08'),'RD Sculpt');
 assert.equal(inferredProduct('Campanha Blefaroplastia'),'Blefaro');
 assert.equal(inferredProduct('Imovel - formulario'),'Imóvel');
});
test('unifies RD Sculpt campaign variants into one product group',()=>{
 const context=vm.createContext({});
 vm.runInContext([inferredProductSource(),reportGroupingSource()].join('\n'),context);
 const groups=context.reportGroupsForRow({campaigns:[
  {campaign_name:'[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24',spend:138.56,results:8},
  {campaign_name:'[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24 — Cópia',spend:174.12,results:12},
  {campaign_name:'[RD SCULPT] Rafael Dias | Público Quente | Peba+Canaã | 27/08',spend:172.64,results:13},
 ]});
 assert.equal(groups.length,1);assert.equal(groups[0].name,'RD SCULPT');assert.equal(groups[0].results,33);assert.equal(groups[0].spend,485.32);assert.equal(groups[0].spend/groups[0].results,14.706666666666667);
});
test('unifies any niche using a saved product rule',()=>{
 const context=vm.createContext({});
 vm.runInContext([inferredProductSource(),reportGroupingSource()].join('\n'),context);
 context.reportProductRules=[{match:'New Medic',label:'New Medic'}];
 const groups=context.reportGroupsForRow({campaigns:[{campaign_name:'[WA] New Medic Pro | Público frio',spend:100,results:5},{campaign_name:'NEW MEDIC | Remarketing | Cópia',spend:80,results:8}]});
 assert.equal(groups.length,1);assert.equal(groups[0].name,'NEW MEDIC');assert.equal(groups[0].results,13);assert.equal(groups[0].spend,180);
});
test('same product splits into one group for Formulário and one for WhatsApp',()=>{
 const context=vm.createContext({});
 vm.runInContext([inferredProductSource(),reportGroupingSource()].join('\n'),context);
 const groups=context.reportGroupsForRow({campaigns:[
  {campaign_name:'Imovel - Canaã - Formulário',objective_label:'Formulário',spend:40,results:4},
  {campaign_name:'Imóvel | Parauapebas | Lead',objective_label:'Lead (Meta)',spend:60,results:6},
  {campaign_name:'Imóvel - Conversas',objective_label:'Mensagem',spend:30,results:3},
  {campaign_name:'IMÓVEL | WhatsApp Público frio',objective_label:'Mensagem',spend:20,results:1},
 ]});
 assert.deepEqual(JSON.parse(JSON.stringify(groups.map(group=>[group.name,group.spend,group.results]))),[['IMÓVEL - FORMULÁRIO',100,10],['IMÓVEL - WHATSAPP',50,4]]);
});
test('long campaign names keep their beginning and fit the available width',()=>{const context=vm.createContext({});vm.runInContext(functionSource('reportFittedName'),context);const canvas={measureText:text=>({width:Array.from(text).length*10})};assert.equal(context.reportFittedName(canvas,'Oferta curta',200),'Oferta curta');assert.equal(context.reportFittedName(canvas,'Oferta Procedimento | Canaã - Campanha de setembro',200),'Oferta Procedimento…');assert.equal(context.reportFittedName(canvas,'😀😀😀😀😀',30),'😀😀…');});
test('only unidentified report campaigns use their full original names',()=>{
 const context=vm.createContext({inferredProduct:name=>name.includes('Imóvel')?'Imóvel':'Não identificado'});
 vm.runInContext([sourceLine('const normalizedCampaignText='),functionSource('reportChannel'),functionSource('reportGroupName'),'const reportConfiguredProduct=inferredProduct;',sourceLine('const reportIsUnidentified='),functionSource('reportGroupsForRow')].join('\n'),context);
 const original='Oferta Procedimento - Peba+Canaã';
 const groups=context.reportGroupsForRow({campaigns:[{campaign_name:original,objective_label:'Mensagem',spend:10,results:2},{campaign_name:'Antes e Depois | Parauapebas',objective_label:'Mensagem',spend:20,results:3},{campaign_name:'Imóvel - Canaã',objective_label:'Mensagem',spend:30,results:4}]});
 assert.equal(groups[0].name,`${original} - WHATSAPP`);assert.equal(groups[0].productLabel,`${original} - WHATSAPP`);assert.equal(groups[1].name,'Antes e Depois | Parauapebas - WHATSAPP');assert.equal(groups[2].name,'IMÓVEL - WHATSAPP');assert.equal(groups[2].productLabel,'IMÓVEL');assert.equal(groups.reduce((sum,g)=>sum+g.spend,0),60);
 assert.equal(context.reportGroupName({name:'Nome original via campo name'}),'Nome original via campo name');
});
test('leads share the Formulário group, WhatsApp stays apart, undelivered campaigns get their own group',()=>{
 const context=vm.createContext({inferredProduct:()=> 'Produto'});
 vm.runInContext([sourceLine('const normalizedCampaignText='),functionSource('reportChannel'),functionSource('reportGroupName'),'const reportConfiguredProduct=inferredProduct;',sourceLine('const reportIsUnidentified='),functionSource('reportGroupsForRow')].join('\n'),context);
 const groups=context.reportGroupsForRow({campaigns:[
  {campaign_name:'WhatsApp antigo',objective_label:'Formulário',spend:0,results:8},
  {campaign_name:'Form ativo',objective_label:'Lead (Meta)',spend:50,results:10},
  {campaign_name:'Conversas',objective_label:'Mensagem',spend:30,results:4},
  {campaign_name:'Form sem entrega',no_delivery_in_period:true,spend:0,results:0},
 ]});
 assert.equal(groups.length,3);
 assert.equal(groups[0].name,'PRODUTO - FORMULÁRIO');assert.equal(groups[0].results,18);assert.equal(groups[0].spend,50);
 assert.equal(groups[1].name,'PRODUTO - WHATSAPP');assert.equal(groups[1].results,4);
 assert.match(groups[2].name,/SEM VEICULAÇÃO/);
});
