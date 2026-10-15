const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('../dev/node_modules/playwright');

test('saved HTTP to Sheets flow opens without default cards and mapping scrolls',async()=>{
  const root=path.resolve(__dirname,'../Dashboard Meta Ads');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const section=html.match(/<section class="flow-view" id="flow" hidden>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(section);
  const server=http.createServer((req,res)=>{
    if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(`<html><head><link rel="stylesheet" href="/fluxo.css"></head><body><section class="flow-view" id="flow">${section}</section><script>window.HURTZ_API_BASE='http://127.0.0.1:${server.address().port}';window.HURTZ_API_ROUTER_READY=true</script><script src="/flow-builder.js"></script></body></html>`)}
    const file=req.url==='/fluxo.css'?'fluxo.css':req.url==='/flow-builder.js'?'flow-builder.js':null;
    if(!file){res.writeHead(404);return res.end()}
    res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(root,file)));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const id='1cd16dbb-722b-4add-ae0a-d6346b728ae5';
    const headers=['Nome','Telefone','Interesse',...Array.from({length:12},(_,i)=>`Campo ${i+1}`)];
    const flow={id,name:'Ribeiro Peba',enabled:true,source:'http',destination:'google-sheets',http:{endpoint:`/api/flow/inbound/${id}/secret`},googleSheets:{spreadsheetId:'sheet-id',sheetName:'Cadastro dos Leads',headers,mapping:{Nome:'Nome Completo',Telefone:'WhatsApp',Interesse:'Interesse'}},facebook:{},whatsapp:{}};
    let savedPayload=null;
    await page.route('**/api/**',route=>{
      const pathname=new URL(route.request().url()).pathname;
      let payload={};
      if(pathname==='/api/flows')payload={flows:[flow]};
      else if(pathname===`/api/flows/${id}`){if(route.request().method()==='PUT'){savedPayload=route.request().postDataJSON();Object.assign(flow,savedPayload)}payload=flow;}
      else if(pathname==='/api/flow/meta/catalog')payload={connected:true,accounts:[],pages:[]};
      else if(pathname==='/api/flow/google/status')payload={connected:true,email:'teste@example.com'};
      else if(pathname==='/api/flow/google/spreadsheets')payload={spreadsheets:[{id:'sheet-id',name:'Planilha de leads'}]};
      else if(pathname==='/api/flow/google/spreadsheets/sheet-id/sheets')payload={sheets:[{name:'Cadastro dos Leads',headers}]};
      else if(pathname===`/api/flows/${id}/http-sample`)payload={sample:{payload:{'Nome Completo':'Maria',WhatsApp:'5500000000000',Interesse:'Veículo'}}};
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('[data-flow-id]').click();
    await page.locator('#flowBuilder').waitFor({state:'visible'});
    assert.equal(await page.locator('#flowSource').inputValue(),'http');
    assert.equal(await page.locator('#flowDestination').inputValue(),'google-sheets');
    assert.equal(await page.locator('.flow-facebook').isVisible(),false);
    assert.equal(await page.locator('.flow-whatsapp').isVisible(),false);
    assert.equal(await page.locator('#flowToggleConnection').count(),0);
    assert.equal(await page.locator('[data-sheet-header]').count(),headers.length);
    const dimensions=await page.locator('.flow-mapping-scroll').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,display:getComputedStyle(el).display,card:el.closest('.flow-mapping-section').clientWidth}));
    assert.equal(dimensions.scroll>dimensions.client,true,JSON.stringify(dimensions));
    assert.equal(await page.locator('[data-sheet-header="Nome"]').inputValue(),'Nome Completo');
    assert.equal(await page.locator('.flow-google-advanced').evaluate(el=>el.open),false);
    await page.locator('.flow-endpoint-advanced summary').click();
    assert.equal(await page.locator('#flowSendHttpSample').isVisible(),true);
    await page.locator('[data-sheet-header="Campo 12"]').selectOption('Nome Completo');
    await page.waitForFunction(()=>document.querySelector('#flowStatus').textContent.includes('Fluxo ativo'));
    assert.equal(savedPayload.googleSheets.mapping['Campo 12'],'Nome Completo');
    await page.screenshot({path:path.join(__dirname,'../.codex-tmp/flow-layout-desktop.png')});
    await page.reload();
    await page.locator('#flowBuilder').waitFor({state:'visible'});
    assert.equal(await page.locator('#flowSource').inputValue(),'http');
    assert.equal(await page.locator('.flow-facebook').isVisible(),false);
    await page.waitForFunction(()=>document.querySelector('[data-sheet-header="Campo 12"]')?.value==='Nome Completo');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('.flow-mapping-scroll').evaluate(el=>el.scrollWidth>el.clientWidth),true);
    await page.screenshot({path:path.join(__dirname,'../.codex-tmp/flow-layout-mobile.png')});
    assert.deepEqual(errors,[]);
  }finally{await browser.close();server.close()}
});
