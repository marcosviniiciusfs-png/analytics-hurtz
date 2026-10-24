const {test}=require('node:test'),assert=require('node:assert/strict');
const {analyzeCampaignVideo,normalize}=require('../Dashboard Meta Ads/video-campaign-analysis');
const {readVisualEvidence}=require('../Dashboard Meta Ads/video-visual-evidence');
const frame=Buffer.alloc(300,42).toString('base64'),file={type:'video/mp4',data:Buffer.from('video')};

test('unreadable OCR is recovered from frames before city and interests are derived',async()=>{
 const calls=[];
 const result=await analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter'},extract:async()=>({visibleText:[],images:[frame],audio:''}),fetchImpl:async(url,request)=>{
  const body=JSON.parse(request.body);calls.push({url,body});
  if(url.endsWith('/chat/completions'))return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({visibleText:['ESCRITÓRIO: ITAJAÍ - SC','CRÉDITO PARA IMÓVEL']})}}]})};
  return {ok:true,text:async()=>JSON.stringify({answers:{}})};
 }});
 assert.equal(calls[0].body.model,'openrouter/free');assert.match(calls[0].body.messages[1].content[0].image_url.url,/^data:image\/jpeg;base64,/);
 assert.match(calls[1].body.state.evidence,/ITAJAI - SC/);
 assert.equal(result.location,'ITAJAI - SC');assert.equal(result.offer,'Crédito para imóvel');assert.ok(result.interestQueries.includes('Imóveis'));
});

test('fully unreadable media fails instead of returning a successful empty draft',async()=>{
 await assert.rejects(analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter'},extract:async()=>({visibleText:[],images:[frame],audio:''}),fetchImpl:async()=>({ok:false,status:429})}),error=>error.status===422&&/ler a fala/.test(error.message));
});

test('good OCR avoids the visual provider, while missing city can be recovered independently of product',async()=>{
 let visualCalls=0;
 const fetchImpl=async(url)=>{
  if(url.endsWith('/chat/completions')){visualCalls++;return {ok:true,json:async()=>({choices:[{message:{content:'{"visibleText":["ESCRITORIO: ITAJAI - SC"]}'}}]})}}
  return {ok:true,text:async()=>JSON.stringify({answers:{}})};
 };
 for(const cityKnown of [true,false]){
  const result=await analyzeCampaignVideo(file,{config:{key:'private',provider:'openrouter'},extract:async()=>({visibleText:['CRÉDITO PARA IMÓVEL',...(cityKnown?['ESCRITÓRIO: ITAJAÍ - SC']:[])],images:[frame],audio:''}),fetchImpl});
  assert.equal(result.location,'ITAJAI - SC');
 }
 assert.equal(visualCalls,1);
});

test('normalization preserves a city beyond the compact preview and visual provider output is bounded',async()=>{
 assert.equal(normalize({visibleText:[...Array(15).fill('Oferta'),'ESCRITÓRIO: ITAJAÍ - SC']}).location,'ITAJAI - SC');
 let body;
 const text=await readVisualEvidence(Array(10).fill(frame),{key:'private',fetchImpl:async(_url,request)=>{body=JSON.parse(request.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({visibleText:Array(30).fill('texto')})}}]})}}});
 assert.equal(body.messages[1].content.length,6);assert.equal(text.length,12);
});
