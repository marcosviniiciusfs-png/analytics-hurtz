'use strict';

const dns=require('node:dns').promises;
const https=require('node:https');
const net=require('node:net');

const invalid=()=>Object.assign(new Error('Informe uma URL HTTPS pública para verificar o Pixel do site.'),{status:400});
function publicIPv4(address){
  if(net.isIP(address)!==4)return false;
  const [a,b,c]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&(c===0||c===2)||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
function publicURL(value){
  let url;try{url=new URL(value)}catch{throw invalid()}
  const host=url.hostname.toLowerCase();
  if(url.href.length>2048||url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!host.includes('.')||host.endsWith('.')||/\.(?:localhost|local|internal|test|invalid)$/.test(host)||net.isIP(host)&&!publicIPv4(host)||host.includes(':'))throw invalid();
  url.hash='';return url;
}
async function deadlineTask(task,remaining){
  if(remaining<=0)throw Error('Tempo de leitura excedido.');
  let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tempo de leitura excedido.')),remaining)})])}finally{clearTimeout(timer)}
}
async function resolvePublic(url,{lookup=dns.lookup,deadline=Date.now()+12000}={}){
  const host=publicURL(url).hostname;
  const addresses=net.isIP(host)?[{address:host,family:4}]:await deadlineTask(lookup(host,{all:true,family:4}),deadline-Date.now());
  if(!addresses.length||addresses.some(item=>!publicIPv4(item.address)))throw invalid();
  return addresses[0].address;
}

// HTTPS only, fixed public DNS address per connection, no ambient credentials,
// and the same address validation on every redirect. Never execute page code.
async function readPublicText(value,{deadline=Date.now()+12000,lookup=dns.lookup,maxBytes=768*1024,get=https.get}={}){
  let url=publicURL(value);
  for(let redirect=0;redirect<=3;redirect++){
    const address=await resolvePublic(url,{lookup,deadline}),remaining=deadline-Date.now();
    if(remaining<=0)throw Error('Tempo de leitura excedido.');
    const result=await new Promise((resolve,reject)=>{
      const request=get(url,{
        agent:false,signal:AbortSignal.timeout(remaining),
        lookup:(_host,options,callback)=>options.all?callback(null,[{address,family:4}]):callback(null,address,4),
        headers:{'User-Agent':'TrafficPocket-PixelCheck/1.0','Accept':'text/html,application/xhtml+xml,application/javascript,text/javascript','Accept-Encoding':'identity'}
      },response=>{
        if([301,302,303,307,308].includes(response.statusCode)){response.destroy();resolve({redirect:response.headers.location});return}
        const type=String(response.headers['content-type']||'').toLowerCase(),encoding=response.headers['content-encoding'];
        if(response.statusCode!==200||type&&!/^(?:text\/(?:html|javascript)|application\/(?:xhtml\+xml|javascript|x-javascript))\b/.test(type)||encoding&&encoding!=='identity'||Number(response.headers['content-length'])>maxBytes){response.destroy();reject(Error('O site não disponibilizou código público para leitura.'));return}
        let size=0;const chunks=[];
        response.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){response.destroy(Error('Página acima do limite de leitura.'));return}chunks.push(chunk)});
        response.on('error',reject);
        response.on('end',()=>resolve({text:Buffer.concat(chunks).toString('utf8'),url:url.href}));
      });
      request.on('error',reject);
    });
    if(result.text!==undefined)return result;
    if(!result.redirect||redirect===3)throw Error('Redirecionamento não concluído.');
    url=publicURL(new URL(result.redirect,url).href);
  }
}

const decode=value=>String(value||'').replace(/&amp;/gi,'&').replace(/&quot;|&#34;|&#x22;/gi,'"').replace(/&#39;|&#x27;|&apos;/gi,"'");
function pixelIdsFromCode(code){
  const source=decode(code),ids=new Set();
  for(const match of source.matchAll(/\b(?:fbq|_fbq)\s*\(\s*['"]init['"]\s*,\s*['"](\d{3,25})['"]\s*(?=[,)])/g))ids.add(match[1]);
  for(const match of source.matchAll(/https?:\/\/(?:www\.)?facebook\.com\/tr\/?\?[^\s'"<>]+/gi)){
    try{const id=new URL(match[0]).searchParams.get('id');if(/^\d{3,25}$/.test(id||''))ids.add(id)}catch{}
  }
  return [...ids].slice(0,20);
}
function sameOriginScripts(html,url){
  const result=[];
  for(const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)){
    try{const script=new URL(decode(match[1]||match[2]||match[3]),url);if(script.origin===new URL(url).origin&&!result.includes(script.href))result.push(script.href)}catch{}
    if(result.length===3)break;
  }
  return result;
}

async function inspectWebsitePixels(value,pixels,{readText=readPublicText}={}){
  const url=publicURL(value).href,deadline=Date.now()+12000;
  let page;
  try{page=await readText(url,{deadline})}catch(error){if(error.status===400)throw error;return {state:'unavailable',pixelIds:[],matches:[],suggestedPixelId:null,coverage:'public_code'}}
  const ids=new Set(pixelIdsFromCode(page.text));
  const scripts=sameOriginScripts(page.text,page.url||url);
  for(const script of scripts){
    if(Date.now()>=deadline)break;
    try{const asset=await readText(script,{deadline,maxBytes:512*1024});pixelIdsFromCode(asset.text).forEach(id=>ids.add(id))}catch{}
  }
  const pixelIds=[...ids].slice(0,20),available=pixels.filter(item=>!item.is_unavailable),matches=available.filter(item=>pixelIds.includes(String(item.id))).map(item=>({id:String(item.id),name:String(item.name||item.id)}));
  return {state:matches.length===1?'matched':matches.length>1?'multiple':pixelIds.length?'not_in_account':'not_detected',pixelIds,matches,foreignPixelIds:pixelIds.filter(id=>!matches.some(item=>item.id===id)),suggestedPixelId:matches.length===1?matches[0].id:null,coverage:'public_code'};
}

module.exports={inspectWebsitePixels,pixelIdsFromCode,publicIPv4,publicURL,resolvePublic,readPublicText};
