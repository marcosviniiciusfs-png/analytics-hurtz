const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseLocationQuery,searchLocations,resolveLocation}=require('../Dashboard Meta Ads/meta-location-search');
const city={key:'meta-itajai-sc',type:'city',name:'Itajaí',country_code:'BR',region:'Santa Catarina'};

test('Meta city search separates Brazilian state names and codes from the query',async()=>{
 for(const query of ['Itajaí - SC','Itajaí, Santa Catarina','Itajaí / SC','Itajaí (SC)','Escritório: Itajaí — SC','Itajaí SC']){
  const result=await resolveLocation(async(token,edge,params)=>{
   assert.equal(token,'personal-token');assert.equal(edge,'search');assert.equal(params.q,'Itajaí');assert.equal(params.country_code,'BR');assert.deepEqual(JSON.parse(params.location_types),['city']);return {data:[city]};
  },'personal-token',query);
  assert.equal(result.key,city.key);assert.equal(result.region,'Santa Catarina');
 }
 assert.equal(parseLocationQuery('Cidade Ocidental - GO').city,'Cidade Ocidental');
});

test('city resolution uses both the requested city and state, never the first name match',async()=>{
 const wrongState={...city,key:'wrong-state',region:'São Paulo'},wrongCountry={...city,key:'wrong-country',country_code:'US'};
 const result=await resolveLocation(async()=>({data:[wrongState,wrongCountry,city]}),'token','ITAJAÍ - SC');assert.equal(result.key,city.key);
 for(const items of [[wrongState],[wrongCountry],[{...city,region:''}],[{...city,name:'Itajubá'}]])await assert.rejects(resolveLocation(async()=>({data:items}),'token','Itajaí - SC'),/não confirmou/);
});

test('manual location search uses the same city/state normalization and filter',async()=>{
 const result=await searchLocations(async(_,__,params)=>{assert.equal(params.q,'Itajaí');return {data:[{...city,region:'Paraná'},city]};},'token','Itajaí, SC');
 assert.deepEqual(result.items,[city]);
});

test('ambiguous city names need a state instead of selecting an arbitrary Meta result',async()=>{
 await assert.rejects(resolveLocation(async()=>({data:[{...city,name:'Santa Maria',region:'Rio Grande do Sul'},{...city,key:'other',name:'Santa Maria',region:'Pará'}]}),'token','Santa Maria'),/não confirmou/);
});

test('the existing single-character OCR tolerance is constrained by state',async()=>{
 assert.equal((await resolveLocation(async()=>({data:[city]}),'token','ITAJAl - SC')).key,city.key);
 await assert.rejects(resolveLocation(async()=>({data:[city]}),'token','ITAJAl - SP'),/não confirmou/);
});
