const {test}=require('node:test'),assert=require('node:assert/strict');
const {analyzeCampaignVideo,analysisDescription}=require('../Dashboard Meta Ads/video-campaign-analysis');
const file={type:'video/mp4',data:Buffer.from('00000018667479706d703432','hex')};

test('video analysis sends extracted evidence to Jev and returns structured campaign hints',async()=>{
 let body;
 const answers={destination:{type:'choice',choice:'whatsapp',confidence:.9},product:{type:'choice',choice:'housing_credit',confidence:.9},audience:{type:'choice',choice:'all',confidence:.9},illustrative:{type:'noul',noul:.9},cta:{type:'choice',choice:'whatsapp',confidence:.9}};
 const fetchImpl=async(url,request)=>{assert.match(url,/\/api\/alpha\/decisions$/);body=JSON.parse(request.body);return {ok:true,text:async()=>JSON.stringify({answers})}};
 const result=await analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter'},extract:async()=>({images:['image'],visibleText:['RIO BRANCO - AC','Crédito para imóvel'],audio:''}),fetchImpl});
 assert.equal(body.model,'typesafe/jev-1.13');
 assert.equal(body.state.evidence.includes('RIO BRANCO - AC'),true);
 assert.equal(result.destination,'whatsapp');
 assert.equal(result.offer,'Crédito para imóvel');
 assert.equal(result.location,'RIO BRANCO - AC');
 assert.match(analysisDescription(result),/WhatsApp/);
});

test('video analysis rejects a non-OpenRouter configuration before any external request',async()=>{
 const options={config:{key:'private',provider:'groq'},extract:async()=>({images:['image']}),fetchImpl:async()=>{throw Error('must not call')}};
 await assert.rejects(analyzeCampaignVideo(file,options),/chave OpenRouter/);
});

test('video context drives the product copy and interest queries',async()=>{
 const answers={destination:{type:'choice',choice:'site',confidence:.9},product:{type:'choice',choice:'general_credit',confidence:.9},audience:{type:'choice',choice:'all',confidence:.9},illustrative:{type:'noul',noul:0},cta:{type:'choice',choice:'learn_more',confidence:.9}};
 const fetchImpl=async()=>({ok:true,text:async()=>JSON.stringify({answers})});
 const result=await analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter'},extract:async()=>({images:[],visibleText:['Oferta especial de MacBook para estudantes'],audio:''}),fetchImpl});
 assert.equal(result.offer,'MacBook');assert.equal(result.requiresInterests,true);assert.deepEqual(result.interestQueries,['MacBook','Apple Inc.','macOS','iPhone','Computadores portáteis']);
});

test('an app campaign has mandatory product interests',async()=>{
 const answers={destination:{type:'choice',choice:'site',confidence:.9},product:{type:'choice',choice:'other',confidence:.9},audience:{type:'choice',choice:'all',confidence:.9},illustrative:{type:'noul',noul:0},cta:{type:'choice',choice:'learn_more',confidence:.9}};
 const result=await analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter'},extract:async()=>({images:[],visibleText:['Conheça nosso aplicativo de gestão'],audio:''}),fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({answers})})});
 assert.equal(result.offer,'Aplicativo');assert.equal(result.requiresInterests,true);assert.ok(result.interestQueries.length>0);
});

test('video analysis gives a clear retry error when Jev is temporarily limited',async()=>{
 const result=analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter'},extract:async()=>({images:[],visibleText:['OFERTA'],audio:''}),fetchImpl:async()=>({ok:false,status:429,text:async()=>JSON.stringify({error:{message:'rate limited'}})})});
 await assert.rejects(result,/limitou o Jev/);
});
