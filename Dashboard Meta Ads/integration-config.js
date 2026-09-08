'use strict';
const fs=require('node:fs');
function values(file){try{return Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).filter(line=>/^[A-Z][A-Z0-9_]*=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}))}catch{return {}}}
function defaults(){
 const meta=values(process.env.META_INTEGRATIONS_FILE||'/opt/meta-ads-cli/secrets/.env');
 const apify=values(process.env.APIFY_TOKEN__FILE||'/opt/meta-ads-cli/secrets/apify.env');
 let rawApify='';try{if(process.env.APIFY_TOKEN__FILE)rawApify=fs.readFileSync(process.env.APIFY_TOKEN__FILE,'utf8').trim()}catch{}
 return {apifyToken:process.env.APIFY_TOKEN||apify.APIFY_TOKEN||(rawApify&&!rawApify.includes('\n')&&!rawApify.startsWith('APIFY_TOKEN=')?rawApify:'')||'',
  evolutionUrl:process.env.EVOLUTION_API_URL||meta.EVOLUTION_API_URL||'',
  evolutionKey:process.env.EVOLUTION_API_KEY||meta.EVOLUTION_API_KEY||'',visualAudit:false};
}
module.exports={defaults};
