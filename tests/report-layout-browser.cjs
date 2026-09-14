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
      const edit={leadsLabel:'RESULTADOS',leadsValue:'153',cplLabel:'CUSTO POR RESULTADO',cplValue:'R$ 11,32',spendLabel:'VALOR GASTO',spendValue:'R$ 1.731,73',groupTitle:'DESEMPENHO POR GRUPO DE CAMPANHA',confirmedLabel:'TOTAL CONFIRMADO',confirmedValue:'153',confirmedUnit:'resultados',investmentText:'Investimento total de R$ 1.731,73 no período analisado.',groups:[{name:'NÃO IDENTIFICADO - MENSAGEM - PARAUAPEBAS',results:'153',cpl:'R$ 11,32'}],extraMetrics:[]};
      const currentPngAccountId='test';const currentPngEdit=()=>edit;
      const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
      const drawPngReport=()=>drawEditableReportBlocks(document.querySelector('canvas').getContext('2d'),edit);
      ${slice('function roundRect(', 'const loadCanvasImage=')}
      ${slice('function pngReportLayout(', 'const drawPngReportWithReferenceLayout=')}
      ${slice('function pngEditorControl(', "document.querySelector('#resetPngReportEdits').onclick")}
      renderPngReportFields();drawPngReport();
    `});
    assert.equal(await page.locator('[data-png-metric-index]').count(),0);
    await page.locator('[data-add-png-metric]').click();
    await page.locator('[data-png-metric-field="label"]').fill('IMPRESSÕES');
    await page.locator('[data-png-metric-field="value"]').fill('25.000');
    await page.locator('[data-png-field="groupWidth"]').fill('40');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#pngGroupWidthValue').textContent(),'40%');
    assert.equal(await page.evaluate(()=>edit.extraMetrics[0].value),'25.000');
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
