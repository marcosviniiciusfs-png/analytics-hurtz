const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/app.js'),'utf8');
const functionLine=name=>source.split('\n').find(line=>line.startsWith('function '+name+'('));
const sourceLine=prefix=>source.split('\n').find(line=>line.startsWith(prefix));
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
 const context=vm.createContext({});
 vm.runInContext([sourceLine('const normalizedCampaignText='),sourceLine('const inferredProduct='),functionLine('reportGroupName'),sourceLine('reportGroupName=function'),functionLine('reportGroupsForRow')].join('\n'),context);
 const groups=context.reportGroupsForRow({campaigns:[
  {campaign_name:'[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24',spend:138.56,results:8},
  {campaign_name:'[WA] Rafael Dias | RD SCULPT-Elleva Max | Canaã | 2026-08-24 — Cópia',spend:174.12,results:12},
  {campaign_name:'[RD SCULPT] Rafael Dias | Público Quente | Peba+Canaã | 27/08',spend:172.64,results:13},
 ]});
 assert.equal(groups.length,1);assert.equal(groups[0].name,'RD SCULPT');assert.equal(groups[0].results,33);assert.equal(groups[0].spend,485.32);assert.equal(groups[0].spend/groups[0].results,14.706666666666667);
});
test('long campaign names keep their beginning and fit the available width',()=>{const context=vm.createContext({});vm.runInContext(functionLine('reportFittedName'),context);const canvas={measureText:text=>({width:Array.from(text).length*10})};assert.equal(context.reportFittedName(canvas,'Oferta curta',200),'Oferta curta');assert.equal(context.reportFittedName(canvas,'Oferta Procedimento | Canaã - Campanha de setembro',200),'Oferta Procedimento…');assert.equal(context.reportFittedName(canvas,'😀😀😀😀😀',30),'😀😀…');});
test('only unidentified report campaigns use their full original names',()=>{
 const context=vm.createContext({inferredProduct:name=>name.includes('Imóvel')?'Imóvel':'Não identificado'});
 vm.runInContext(source.slice(source.indexOf('function reportGroupName('),source.indexOf('let currentReportContext=null')),context);
 const original='Oferta Procedimento - Peba+Canaã';
 const groups=context.reportGroupsForRow({campaigns:[{campaign_name:original,objective_label:'Mensagem',spend:10,results:2},{campaign_name:'Antes e Depois | Parauapebas',objective_label:'Mensagem',spend:20,results:3},{campaign_name:'Imóvel - Canaã',objective_label:'Mensagem',spend:30,results:4}]});
 assert.equal(groups[0].name,original);assert.equal(groups[0].productLabel,original);assert.equal(groups[1].name,'Antes e Depois | Parauapebas');assert.equal(groups[2].name,'IMÓVEL');assert.equal(groups[2].productLabel,'IMÓVEL');assert.equal(groups.reduce((sum,g)=>sum+g.spend,0),60);
 assert.equal(context.reportGroupName({name:'Nome original via campo name'}),'Nome original via campo name');
});
test('report includes zero-spend leads and does not infer channel from campaign name',()=>{
 const context=vm.createContext({inferredProduct:()=> 'Produto'});
 vm.runInContext([functionLine('reportGroupName'),functionLine('reportGroupsForRow')].join('\n'),context);
 const groups=context.reportGroupsForRow({campaigns:[
  {campaign_name:'WhatsApp antigo',objective_label:'Formulário',spend:0,results:8},
  {campaign_name:'Form ativo',objective_label:'Lead (Meta)',spend:50,results:10},
  {campaign_name:'Form sem entrega',no_delivery_in_period:true,spend:0,results:0},
 ]});
 assert.equal(groups.length,3);assert.equal(groups[0].results,8);assert.match(groups[0].name,/FORMULÁRIO/);assert.ok(!groups[0].name.includes('WHATSAPP'));
 assert.match(groups[2].name,/SEM VEICULAÇÃO/);
});
