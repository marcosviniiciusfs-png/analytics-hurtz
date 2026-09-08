const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/app.js'),'utf8');
const functionLine=name=>source.split('\n').find(line=>line.startsWith('function '+name+'('));
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
