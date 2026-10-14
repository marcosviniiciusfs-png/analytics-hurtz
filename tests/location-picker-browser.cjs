const {chromium}=require('../dev/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const root=path.join(__dirname,'../Dashboard Meta Ads');
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>Object.defineProperty(HTMLScriptElement.prototype,'integrity',{configurable:true,get(){return ''},set(){}}));
  await page.route('https://location-picker.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1);if(file==='location-picker.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,file))});return route.fulfill({contentType:'text/html',body:'<style>.cm-location-map{display:block;width:700px;height:280px}</style><main id="host"></main><script type="module">import {createLocationPicker} from "./location-picker.js";window.picker=createLocationPicker({searchLocations:async()=>({items:[]})});document.querySelector("#host").append(window.picker.element);</script>'})});
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({contentType:'text/css',body:'.leaflet-container{background:#ddd}.leaflet-tile{display:block;width:256px;height:256px}'}));
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({contentType:'text/javascript',body:`window.__invalidateCalls=0;window.L={map(el){el.classList.add('leaflet-container');return {setView(){return this},invalidateSize(){window.__invalidateCalls++;return this},on(){return this},remove(){},getCenter(){return {lat:-6.07,lng:-49.90}},fitBounds(){}}},tileLayer(){return {addTo(){return this}}},featureGroup(){return {getBounds(){return {}}}},marker(){return {addTo(){return this},on(){return this},remove(){}}},circle(){return {addTo(){return this},on(){return this},remove(){}}},divIcon(value){return value}};`}));
  await page.goto('https://location-picker.test/');
  await page.locator('.cm-location-map').waitFor();
  await page.waitForFunction(()=>window.__invalidateCalls>0);
  await page.locator('[data-location-add-pin]').click();
  assert.equal(await page.locator('.cm-location-list li').count(),1);
  assert.ok(await page.evaluate(()=>window.__invalidateCalls)>=1);
  assert.deepEqual(errors,[]);
  console.log('Location picker: Leaflet map receives a post-layout resize and accepts a pin.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
