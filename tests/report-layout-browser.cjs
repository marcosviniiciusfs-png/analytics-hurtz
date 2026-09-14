const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../dev/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/app.js'),'utf8');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try{
    const page=await browser.newPage({viewport:{width:1640,height:1000}});
    await page.setContent('<div id="pngReportFields"></div><canvas id="pngReportCanvas" width="1600" height="900"></canvas>');
    await page.addScriptTag({content:`
      const edit={leadsLabel:'RESULTADOS',leadsValue:'153',cplLabel:'CUSTO POR RESULTADO',cplValue:'R$ 11,32',spendLabel:'VALOR GASTO',spendValue:'R$ 1.731,73',groupTitle:'DESEMPENHO POR GRUPO DE CAMPANHA',confirmedLabel:'TOTAL CONFIRMADO',confirmedValue:'153',confirmedUnit:'resultados',investmentText:'Investimento total de R$ 1.731,73 no período analisado.',groups:[{name:'NÃO IDENTIFICADO - MENSAGEM - PARAUAPEBAS',results:'153',cpl:'R$ 11,32'}],extraMetrics:[],lowerCards:[{title:'Resumo',text:'Resumo de teste',icon:'document'},{title:'Bom',text:'Texto positivo',icon:'clipboard'},{title:'Melhorar',text:'Texto de melhoria',icon:'trend'}]};
      const currentPngAccountId='test';const currentPngEdit=()=>edit;
      const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
      const drawPngReport=()=>drawEditableReportBlocks(document.querySelector('canvas').getContext('2d'),edit);
      ${slice('function roundRect(', 'const loadCanvasImage=')}
      ${slice('function pngReportLayout(', 'const drawPngReportWithReferenceLayout=')}
      ${slice('function pngMetricIconControl(', "document.querySelector('#resetPngReportEdits').onclick")}
      renderPngReportFields();drawPngReport();
    `});
    const header=await page.evaluate(()=>{
      const ctx=document.querySelector('canvas').getContext('2d');
      const cleanRegion=(x,w)=>{const data=ctx.getImageData(x,213,w,48).data;for(let i=0;i<data.length;i+=4)if(data[i]!==248||data[i+1]!==249||data[i+2]!==252||data[i+3]!==255)return false;return true};
      // Reproduce the old unbounded base layer, then clear the edited field.
      ctx.font='800 10px Arial';ctx.fillStyle='#ff4b22';ctx.fillText('Campanha original muito longa ? '.repeat(50),578,245);
      drawReportProducts(ctx,'');const empty=cleanRegion(578,1022);
      drawReportProducts(ctx,'Campanha original muito longa ? '.repeat(50));const bounded=cleanRegion(1204,396),visible=!cleanRegion(578,625);
      drawReportProducts(ctx,'Curto');const shortened=cleanRegion(700,900);
      drawReportProducts(ctx,'');return {empty,bounded,visible,shortened,clearedAgain:cleanRegion(578,1022)};
    });
    assert.deepEqual(header,{empty:true,bounded:true,visible:true,shortened:true,clearedAgain:true},'Header must erase old names and keep long names inside its bounds');
    assert.equal(await page.locator('[data-png-metric-index]').count(),0);
    const originalIcon=await page.locator('canvas').evaluate(c=>c.toDataURL());
    await page.locator('[data-png-field="leadsIcon"]').selectOption('bank');await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>edit.leadsIcon),'bank');
    assert.notEqual(await page.locator('canvas').evaluate(c=>c.toDataURL()),originalIcon);
    await page.locator('[data-add-png-metric]').click();
    await page.locator('[data-png-metric-field="icon"]').selectOption('calendar');await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>edit.extraMetrics[0].icon),'calendar');
    await page.evaluate(()=>renderPngReportFields());
    assert.equal(await page.locator('[data-png-field="leadsIcon"]').inputValue(),'bank');
    assert.equal(await page.locator('[data-png-metric-field="icon"]').inputValue(),'calendar');
    await page.locator('[data-png-field="leadsIcon"]').selectOption('eye');
    assert.equal(await page.evaluate(()=>edit.leadsIcon),'eye');
    assert.equal(await page.getByText('Card “Total confirmado”',{exact:true}).count(),1);
    const totalBefore=await page.locator('canvas').evaluate(c=>c.toDataURL());
    await page.locator('[data-png-field="confirmedLabel"]').fill('LEADS QUALIFICADOS');
    await page.locator('[data-png-field="confirmedValue"]').fill('200');
    await page.locator('[data-png-field="confirmedUnit"]').fill('contatos');
    await page.locator('[data-png-field="investmentText"]').fill('Texto do card total confirmado.');
    await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(()=>[edit.confirmedLabel,edit.confirmedValue,edit.confirmedUnit,edit.investmentText]),['LEADS QUALIFICADOS','200','contatos','Texto do card total confirmado.']);
    assert.notEqual(await page.locator('canvas').evaluate(c=>c.toDataURL()),totalBefore);
    assert.equal(await page.locator('[data-png-lower-card-index]').count(),9);
    await page.locator('[data-add-png-lower-card]').click();
    assert.equal(await page.evaluate(()=>edit.lowerCards.length),4);
    await page.locator('[data-png-lower-card-index="3"][data-png-lower-card-field="title"]').fill('Novo destaque');
    await page.locator('[data-png-lower-card-index="3"][data-png-lower-card-field="icon"]').selectOption('eye');
    await page.locator('[data-remove-png-lower-card="1"]').click();
    assert.deepEqual(await page.evaluate(()=>edit.lowerCards.map(card=>card.title)),['Resumo','Melhorar','Novo destaque']);
    for(let i=0;i<3;i++)await page.locator('[data-remove-png-lower-card="0"]').click();
    assert.equal(await page.evaluate(()=>edit.lowerCards.length),0);
    await page.locator('[data-add-png-lower-card]').click();
    assert.equal(await page.evaluate(()=>edit.lowerCards.length),1);
    await page.locator('[data-png-field="groupIcon"]').selectOption('eye');
    assert.equal(await page.evaluate(()=>edit.groupIcon),'eye');
    await page.locator('[data-png-metric-field="label"]').fill('IMPRESSÕES');
    await page.locator('[data-png-metric-field="value"]').fill('25.000');
    await page.locator('[data-png-field="groupWidth"]').fill('40');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#pngGroupWidthValue').textContent(),'40%');
    assert.equal(await page.evaluate(()=>edit.extraMetrics[0].value),'25.000');
    const topBefore=await page.locator('canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(40,276,500,250).data));
    const lowerBefore=await page.locator('canvas').evaluate(c=>c.toDataURL());
    await page.locator('[data-png-field="leadsBottomIcon"]').selectOption('donut');
    await page.locator('[data-png-metric-field="bottomIcon"]').selectOption('people');await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>edit.leadsBottomIcon),'donut');assert.equal(await page.evaluate(()=>edit.extraMetrics[0].bottomIcon),'people');
    assert.notEqual(await page.locator('canvas').evaluate(c=>c.toDataURL()),lowerBefore);
    assert.deepEqual(await page.locator('canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(40,276,500,250).data)),topBefore,'Lower icon changes must leave the upper icon and metric value intact');
    await page.evaluate(()=>renderPngReportFields());assert.equal(await page.locator('[data-png-field="leadsBottomIcon"]').inputValue(),'donut');
    const clean=await page.locator('canvas').evaluate(c=>c.toDataURL());
    const repainted=await page.evaluate(()=>{const c=document.querySelector('canvas'),ctx=c.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,270,1600,390);drawPngReport();return c.toDataURL()});
    assert.equal(repainted,clean,'Redraw must erase all previous letters and table overflow');
    for(let i=0;i<2;i++)await page.locator('[data-add-png-metric]').click();
    assert.equal(await page.locator('[data-add-png-metric]').isDisabled(),true);
    await page.locator('[data-png-field="groupWidth"]').fill('60');
    await page.waitForTimeout(250);
    assert.ok(await page.evaluate(()=>pngReportLayout(edit).cardW>0));
    await page.locator('[data-remove-png-metric="0"]').click();
    assert.equal(await page.locator('[data-add-png-metric]').isEnabled(),true);
    await page.evaluate(()=>{edit.extraMetrics=[{label:'IMPRESSÕES',value:'25.000'}];edit.groupWidth=40;drawPngReport();document.querySelector('#pngReportFields').hidden=true});
    const output=path.join(__dirname,'../.codex-tmp/report-layout.png');fs.mkdirSync(path.dirname(output),{recursive:true});await page.locator('canvas').screenshot({path:output});
    console.log('Report layout: metric editing, width, removal, limit and clean redraw passed.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
