'use strict';
const fs=require('node:fs');
const APP_ID='2093320124537661';
function configuration(){
 let values={};try{values=Object.fromEntries(fs.readFileSync(process.env.META_OAUTH_FILE||'/opt/meta-ads-cli/secrets/tryv-oauth.env','utf8').split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}))}catch{}
 const appId=process.env.META_OAUTH_APP_ID||values.META_OAUTH_APP_ID,secret=process.env.META_OAUTH_APP_SECRET||values.META_OAUTH_APP_SECRET;
 return appId===APP_ID&&secret?{appId,secret}:null;
}
async function exchange(token,{fetchImpl=fetch,config=configuration()}={}){
 if(!config||config.appId!==APP_ID||!config.secret)return null;
 // Secrets stay in the server-to-server request body, never in browser responses or logs.
 try{const response=await fetchImpl(new URL('https://graph.facebook.com/v25.0/oauth/access_token'),{method:'POST',body:new URLSearchParams({grant_type:'fb_exchange_token',client_id:APP_ID,client_secret:config.secret,fb_exchange_token:token}),signal:AbortSignal.timeout(20000)});const data=await response.json();const seconds=Number(data.expires_in??data.expires);if(!response.ok||data.error||typeof data.access_token!=='string'||data.access_token.length<20||!Number.isFinite(seconds)||seconds<=0)return null;return {token:data.access_token,expiresAt:Date.now()+seconds*1000,longLived:true}}catch{return null}
}
module.exports={configuration,exchange};
