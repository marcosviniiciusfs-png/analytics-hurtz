const {test}=require('node:test'),assert=require('node:assert/strict');
const {analyzeCampaignVideo,analysisDescription}=require('../Dashboard Meta Ads/video-campaign-analysis');
const file={type:'video/mp4',data:Buffer.from('00000018667479706d703432','hex')};
test('video analysis uses only OpenRouter free and returns structured campaign hints',async()=>{
 let body;
 const response={transcript:'Clique no WhatsApp em Rio Branco',visibleText:['Crédito imobiliário'],location:'Rio Branco, Acre',destination:'whatsapp',audience:{gender:'all',ageMin:20,ageMax:45},offer:'Crédito para imóvel',cta:'Fale no WhatsApp',confidence:'high'};
 const fetchImpl=async(url,request)=>{body=JSON.parse(request.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(response)}}]})}};
 const result=await analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter-free',model:'openrouter/free'},extract:async()=>({images:['image'],audio:''}),fetchImpl});
 assert.equal(body.model,'openrouter/free');assert.equal(result.destination,'whatsapp');assert.match(analysisDescription(result),/Rio Branco/);assert.match(analysisDescription(result),/WhatsApp/);
});
test('video analysis rejects non-free configuration before any external request',async()=>{
 const options={config:{key:'private',provider:'openrouter-free',model:'paid/model'},extract:async()=>({images:['image']}),fetchImpl:async()=>{throw Error('must not call')}};
 await assert.rejects(analyzeCampaignVideo(file,options),/modelo gratuito/);
});
