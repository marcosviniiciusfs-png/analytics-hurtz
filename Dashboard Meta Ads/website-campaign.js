'use strict';

const goals={
  traffic:{objective:'OUTCOME_TRAFFIC',optimization:'LINK_CLICKS',cta:'LEARN_MORE',events:[]},
  leads:{objective:'OUTCOME_LEADS',optimization:'OFFSITE_CONVERSIONS',cta:'SIGN_UP',events:['LEAD','COMPLETE_REGISTRATION']},
  sales:{objective:'OUTCOME_SALES',optimization:'OFFSITE_CONVERSIONS',cta:'SHOP_NOW',events:['PURCHASE']}
};

function websiteCampaign(input){
  const goal=input.siteGoal===undefined?'traffic':input.siteGoal;
  const config=Object.hasOwn(goals,goal)?goals[goal]:null;
  const reject=message=>{throw Object.assign(new Error(message),{status:400})};
  if(!config)reject('Escolha visitas, leads ou vendas para a campanha de site.');
  if(goal==='traffic'){
    if(input.pixelId&&!/^\d+$/.test(String(input.pixelId)))reject('Selecione um Pixel da conta de anúncios.');
    return {...config,goal,...(input.pixelId?{trackingPixelId:String(input.pixelId)}:{})};
  }
  if(!/^\d+$/.test(String(input.pixelId||'')))reject('Selecione um Pixel da conta de anúncios.');
  if(!config.events.includes(input.conversionEvent))reject('Escolha um evento compatível com o objetivo da campanha.');
  if(input.eventSetupConfirmed!==true&&input.eventSetupConfirmed!=='on')reject('Confirme que o evento de conversão foi instalado e testado no site.');
  return {...config,goal,trackingPixelId:String(input.pixelId),promotedObject:{pixel_id:String(input.pixelId),custom_event_type:input.conversionEvent}};
}

module.exports={websiteCampaign};
