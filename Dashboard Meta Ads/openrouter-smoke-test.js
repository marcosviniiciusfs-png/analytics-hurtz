'use strict';
const {configuration}=require('./campaign-planner');
const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WQAAAABJRU5ErkJggg==';

async function main(){
  const config=configuration();
  if(!config.key||config.provider!=='openrouter-free'||!(config.model==='openrouter/free'||config.model.endsWith(':free')))throw new Error('OpenRouter gratuita nao esta configurada.');
  const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',
    headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','HTTP-Referer':process.env.ANALYTICS_PUBLIC_URL||'https://analytics.hurtzcompany.com','X-Title':'Traffic Pocket'},
    signal:AbortSignal.timeout(90000),
    body:JSON.stringify({model:config.model,max_tokens:40,temperature:0,messages:[{role:'user',content:[{type:'text',text:'Responda somente {"ok":true}.'},{type:'image_url',image_url:{url:'data:image/png;base64,'+pixel}}]}]})
  });
  const body=await response.text();
  if(!response.ok)throw new Error(`OpenRouter respondeu HTTP ${response.status}.`);
  const content=JSON.parse(body)?.choices?.[0]?.message?.content||'';
  if(!String(content).includes('ok'))throw new Error('A OpenRouter respondeu sem o conteúdo esperado.');
  console.log('OpenRouter multimodal check passed');
}
main().catch(error=>{console.error(error.message);process.exit(1)});
