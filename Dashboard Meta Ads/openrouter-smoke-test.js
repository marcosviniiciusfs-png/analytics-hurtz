'use strict';
const {configuration}=require('./campaign-planner');
async function main(){
  const config=configuration();
  if(!config.key||config.provider!=='openrouter')throw new Error('OpenRouter nao esta configurada.');
  const response=await fetch('https://openrouter.ai/api/alpha/decisions',{
    method:'POST',
    headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json','HTTP-Referer':process.env.ANALYTICS_PUBLIC_URL||'https://analytics.hurtzcompany.com','X-Title':'Traffic Pocket'},
    signal:AbortSignal.timeout(90000),
    body:JSON.stringify({model:'typesafe/jev-1.13',state:{evidence:'Crédito para imóvel em Rio Branco - AC. Fale no WhatsApp.'},questions:{destination:{type:'choice',instructions:'Qual destino é pedido em `evidence`?',criteria:{whatsapp:'Pede contato pelo WhatsApp.',other:'Não pede WhatsApp.'}}}})
  });
  const body=await response.text();
  if(!response.ok)throw new Error(`OpenRouter respondeu HTTP ${response.status}.`);
  const answer=JSON.parse(body)?.answers?.destination;
  if(answer?.type!=='choice'||answer.choice!=='whatsapp')throw new Error('O Jev respondeu sem a decisão esperada.');
  console.log('Jev decision check passed');
}
main().catch(error=>{console.error(error.message);process.exit(1)});
