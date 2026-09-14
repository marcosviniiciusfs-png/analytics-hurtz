const {test}=require('node:test'),assert=require('node:assert/strict');
const {exchange}=require('../Dashboard Meta Ads/facebook-token');
test('exchange refuses missing or mismatched app credentials without a network call',async()=>{let calls=0;const fetchImpl=async()=>{calls++;throw Error('unexpected')};assert.equal(await exchange('user-token',{config:null,fetchImpl}),null);assert.equal(await exchange('user-token',{config:{appId:'wrong',secret:'secret'},fetchImpl}),null);assert.equal(calls,0)});
test('exchange uses the documented server-side GET and only Meta returned expiry',async()=>{const before=Date.now();const result=await exchange('original-token',{config:{appId:'2093320124537661',secret:'server-secret'},fetchImpl:async(url,options)=>{assert.equal(options.method,'GET');assert.equal(url.searchParams.get('fb_exchange_token'),'original-token');assert.equal(url.searchParams.get('client_secret'),'server-secret');return {ok:true,json:async()=>({access_token:'replacement-token-000000000',expires_in:3600000})}}});assert.equal(result.longLived,true);assert.ok(result.expiresAt>=before+3600000000);assert.ok(result.expiresAt<=Date.now()+3600000000)});
test('network failure, Meta refusal and missing expiry do not manufacture a persistent token',async()=>{for(const fetchImpl of [async()=>{throw Error('offline')},async()=>({ok:false,json:async()=>({error:{message:'denied'}})}),async()=>({ok:true,json:async()=>({access_token:'token-with-unknown-duration'})})])assert.equal(await exchange('original-token',{config:{appId:'2093320124537661',secret:'secret'},fetchImpl}),null)});

const config={appId:'2093320124537661',secret:'server-secret'};
test('successful exchange without expiry resolves actual USER token metadata',async()=>{
 const expiry=Math.floor(Date.now()/1000)+5184000,dataExpiry=expiry+86400;let calls=0;
 const result=await exchange('short-user-token',{config,facebookId:'fb-user',fetchImpl:async(url,options)=>{
  calls++;if(url.pathname.endsWith('/oauth/access_token'))return {ok:true,json:async()=>({access_token:'exchanged-user-token-0000000'})};
  assert.equal(url.pathname,'/v25.0/debug_token');assert.equal(url.searchParams.get('input_token'),'exchanged-user-token-0000000');assert.equal(options.headers.Authorization,'Bearer '+config.appId+'|'+config.secret);
  return {ok:true,json:async()=>({data:{is_valid:true,type:'USER',app_id:config.appId,user_id:'fb-user',expires_at:expiry,data_access_expires_at:dataExpiry}})};
 }});
 assert.equal(calls,2);assert.equal(result.expiresAt,expiry*1000);assert.equal(result.dataExpiresAt,dataExpiry*1000);assert.equal(result.longLived,true);
});
test('metadata fallback rejects wrong identity, app tokens, unknown and expired lifetimes',async()=>{
 const valid={is_valid:true,type:'USER',app_id:config.appId,user_id:'fb-user',expires_at:Math.floor(Date.now()/1000)+5184000};
 for(const changes of [{is_valid:false},{type:'APP'},{app_id:'wrong'},{user_id:'another'},{expires_at:null},{expires_at:1},{expires_at:undefined},{data_access_expires_at:1}]){
  assert.equal(await exchange('short-token',{config,facebookId:'fb-user',fetchImpl:async url=>({ok:true,json:async()=>url.pathname.endsWith('/oauth/access_token')?{access_token:'exchanged-user-token-0000000'}:{data:{...valid,...changes}}})}),null);
 }
});
test('only a validated explicit zero expiry represents a token without a fixed expiration',async()=>{
 const result=await exchange('short-token',{config,facebookId:'fb-user',fetchImpl:async url=>({ok:true,json:async()=>url.pathname.endsWith('/oauth/access_token')?{access_token:'exchanged-user-token-0000000'}:{data:{is_valid:true,type:'USER',app_id:config.appId,user_id:'fb-user',expires_at:0,data_access_expires_at:Math.floor(Date.now()/1000)+7776000}}})});
 assert.equal(result.expiresAt,0);assert.equal(result.noFixedExpiry,true);assert.equal(result.longLived,true);assert.ok(result.dataExpiresAt>Date.now());
});
test('transport exceptions never log credentials or request URLs',async()=>{
 const messages=[],original=console.warn;console.warn=value=>messages.push(value);
 try{await exchange('private-user-token',{config,fetchImpl:async()=>{throw Error('private-user-token server-secret https://secret-url')}})}finally{console.warn=original}
 assert.ok(messages.length);assert.doesNotMatch(messages.join(' '),/private-user-token|server-secret|https:\/\//);
});
