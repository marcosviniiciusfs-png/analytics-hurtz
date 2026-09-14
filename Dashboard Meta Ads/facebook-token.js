'use strict';
const fs=require('node:fs');
const APP_ID='2093320124537661';
function configuration(){
 let values={};try{values=Object.fromEntries(fs.readFileSync(process.env.META_OAUTH_FILE||'/opt/meta-ads-cli/secrets/tryv-oauth.env','utf8').split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}))}catch{}
 const appId=process.env.META_OAUTH_APP_ID||values.META_OAUTH_APP_ID,secret=process.env.META_OAUTH_APP_SECRET||values.META_OAUTH_APP_SECRET;
 return appId===APP_ID&&secret?{appId,secret}:null;
}
async function exchange(token,{fetchImpl=fetch,config=configuration(),facebookId}={}){
 if(!config||config.appId!==APP_ID||!config.secret)return null;
 // OAuth requests stay server-side. Never log request URLs, response tokens or errors containing URLs.
 try{
  const url=new URL('https://graph.facebook.com/v25.0/oauth/access_token');
  url.search=new URLSearchParams({grant_type:'fb_exchange_token',client_id:APP_ID,client_secret:config.secret,fb_exchange_token:token});
  const response=await fetchImpl(url,{method:'GET',signal:AbortSignal.timeout(20000)}),data=await response.json();
  if(!response.ok||data.error||typeof data.access_token!=='string'||data.access_token.length<20){console.warn(JSON.stringify({event:'meta_token_exchange_refused',status:response.status,code:data.error?.code,subcode:data.error?.error_subcode,reason:'exchange_response'}));return null}
  let expiresAt=0,dataExpiresAt=0,noFixedExpiry=false;const seconds=Number(data.expires_in??data.expires);
  if(Number.isFinite(seconds)&&seconds>0)expiresAt=Date.now()+seconds*1000;
  else{
   // Meta can return a valid exchanged token without expires_in. Ask Meta for its actual lifetime.
   const debugUrl=new URL('https://graph.facebook.com/v25.0/debug_token');debugUrl.searchParams.set('input_token',data.access_token);
   const debugResponse=await fetchImpl(debugUrl,{headers:{Authorization:`Bearer ${APP_ID}|${config.secret}`},signal:AbortSignal.timeout(20000)}),debug=await debugResponse.json(),metadata=debug.data;
   if(!debugResponse.ok||!metadata?.is_valid||String(metadata.app_id)!==APP_ID||metadata.type!=='USER'||(facebookId&&String(metadata.user_id)!==String(facebookId))){console.warn(JSON.stringify({event:'meta_token_exchange_refused',status:debugResponse.status,code:debug.error?.code,reason:'invalid_metadata'}));return null}
   noFixedExpiry=metadata.expires_at===0;
   expiresAt=typeof metadata.expires_at==='number'?metadata.expires_at*1000:NaN;
   dataExpiresAt=Number(metadata.data_access_expires_at??0)*1000;
  }
  if(!Number.isFinite(expiresAt)||(!noFixedExpiry&&expiresAt<=Date.now()+86400000)||!Number.isFinite(dataExpiresAt)||(dataExpiresAt&&dataExpiresAt<=Date.now())){console.warn(JSON.stringify({event:'meta_token_exchange_refused',reason:'insufficient_lifetime',expiresAt:Number.isFinite(expiresAt)?expiresAt:null,dataExpiresAt:Number.isFinite(dataExpiresAt)?dataExpiresAt:null}));return null}
  console.info(JSON.stringify({event:'meta_token_exchange_confirmed',noFixedExpiry,expiresAt,dataExpiresAt}));
  return {token:data.access_token,expiresAt,dataExpiresAt,noFixedExpiry,longLived:true};
 }catch(error){console.warn(JSON.stringify({event:'meta_token_exchange_network_error',name:error?.name||'Error'}));return null}
}
module.exports={configuration,exchange};
