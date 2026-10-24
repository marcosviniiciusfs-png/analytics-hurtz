const goalLabels={traffic:'Visitas ao site',leads:'Leads no site',sales:'Vendas no site'};
const eventLabels={LEAD:'Lead — envio de contato',COMPLETE_REGISTRATION:'Cadastro concluído',PURCHASE:'Compra concluída'};

export function setupWebsiteCampaign({form,api,existing,suggestion,esc,isCurrent}){
  if(['site','whatsapp','form'].includes(suggestion?.destination))form.elements.destination.value=suggestion.destination;
  const section=document.createElement('section');
  section.className='cm-website-campaign cm-wide cm-fieldset';
  section.setAttribute('aria-label','Objetivo e Pixel do site');
  if(existing){
    section.innerHTML='<p>O objetivo, o Pixel e o evento de conversão serão mantidos conforme o conjunto selecionado. Para usar outro Pixel, crie uma campanha com um novo conjunto.</p>';
    form.querySelector('[data-dest="site"]').append(section);
    return {sync(){section.hidden=form.elements.destination.value!=="site"},review(){return 'Configuração de conversão do conjunto selecionado'}};
  }
  section.innerHTML='<h4>Objetivo e Pixel do site</h4><label>Objetivo da campanha<select name="siteGoal"><option value="traffic">Visitas ao site</option><option value="leads">Leads no site</option><option value="sales">Vendas no site</option></select></label><p data-goal-help></p><label>Pixel da conta de anúncios<select name="pixelId" aria-describedby="cmPixelStatus cmPixelDetection"><option value="">Selecione um Pixel da conta</option></select></label><div class="cm-actions"><button type="button" data-refresh-pixels>Atualizar Pixels da conta</button><button type="button" data-check-website>Verificar site novamente</button></div><p id="cmPixelStatus" data-pixel-status role="status" aria-live="polite"></p><p id="cmPixelDetection" data-pixel-detection role="status" aria-live="polite">Informe o endereço do site. Vamos procurar o Pixel e conferir se ele está disponível nesta conta.</p><p><a href="https://business.facebook.com/events_manager2/" target="_blank" rel="noopener noreferrer">Adicionar ou conectar um Pixel na Meta</a></p><div data-conversion-fields hidden><label>Evento de conversão<select name="conversionEvent"></select></label><details><summary>Como preparar o rastreamento</summary><p>A identificação automática lê o código público do site. Um Pixel carregado por scripts, gerenciadores de tags ou após consentimento pode não aparecer nessa leitura. Você pode escolher qualquer Pixel disponível na lista da conta.</p><p>Configure o evento escolhido para disparar somente quando o cadastro ou a compra for concluído. Para compras, envie também valor e moeda. Se usar Pixel e API de Conversões juntos, configure a deduplicação.</p><p>Use Testar eventos no Gerenciador de Eventos da Meta para concluir uma conversão de teste. Encontrar o ID do Pixel no site não confirma o funcionamento do evento nem instala código no site.</p></details><label><input type="checkbox" name="eventSetupConfirmed"> Confirmei na Meta que o evento selecionado chega corretamente a partir deste site.</label></div>';
  form.querySelector('[data-dest="site"]').after(section);
  const goal=form.elements.siteGoal,pixel=form.elements.pixelId,event=form.elements.conversionEvent,confirmed=form.elements.eventSetupConfirmed,url=form.elements.url;
  const status=section.querySelector('[data-pixel-status]'),detection=section.querySelector('[data-pixel-detection]'),refresh=section.querySelector('[data-refresh-pixels]'),check=section.querySelector('[data-check-website]');
  let loaded=false,loading=false,lastGoal='',pixelTurn=0,scanTurn=0,timer=null,observedURL='',completedURL='',manualSelection=false,automaticPixel='',scanning=false;
  goal.value=Object.hasOwn(goalLabels,suggestion?.siteGoal)?suggestion.siteGoal:'traffic';
  const resetConfirmation=()=>{confirmed.checked=false};
  const site=()=>form.elements.destination.value==='site';
  const validURL=()=>{try{const value=new URL(url.value.trim());return value.protocol==='https:'&&!value.username&&!value.password?value.href:''}catch{return ''}};
  const notify=()=>form.dispatchEvent(new CustomEvent('website-pixel-change'));
  function changedURL(){
    const value=validURL();
    if(value===observedURL)return;
    observedURL=value;completedURL='';scanTurn++;scanning=false;check.disabled=!value||!loaded;clearTimeout(timer);resetConfirmation();
    detection.textContent=value?'Vamos verificar o Pixel deste site…':'Informe uma URL HTTPS para identificar o Pixel automaticamente.';
    if(automaticPixel&&!manualSelection){pixel.value='';automaticPixel='';notify()}
  }
  function scheduleInspection(){
    changedURL();
    if(!site()||!loaded||!observedURL||scanning||completedURL===observedURL)return;
    clearTimeout(timer);timer=setTimeout(()=>void inspect(),650);
  }
  async function inspect(force=false){
    clearTimeout(timer);changedURL();
    const address=validURL();
    if(!isCurrent()||!site()||!loaded||!address||scanning||!force&&completedURL===address)return;
    const request=++scanTurn,selected=pixel.value;scanning=true;completedURL='';check.disabled=true;
    detection.textContent='Lendo o site e comparando o Pixel com esta conta de anúncios…';
    try{
      const result=await api('website-pixel',{url:address});
      if(!isCurrent()||request!==scanTurn||validURL()!==address||!site())return;
      completedURL=address;
      const matches=(result.matches||[]).filter(item=>[...pixel.options].some(option=>option.value===String(item.id)&&!option.disabled));
      if((result.state!=='matched'||matches.length!==1)&&automaticPixel&&!manualSelection){pixel.value='';automaticPixel='';resetConfirmation()}
      if(result.state==='matched'&&matches.length===1){
        const item=matches[0];
        if(!manualSelection&&pixel.value===selected){pixel.value=String(item.id);automaticPixel=String(item.id);resetConfirmation()}
        detection.textContent='Pixel '+item.name+' · '+item.id+' encontrado no código do site e disponível nesta conta. '+(pixel.value===String(item.id)?'Selecionado para esta campanha.':'Sua escolha manual foi mantida.')+' O evento de conversão ainda precisa ser testado.';
      }else if(matches.length>1){
        detection.textContent='Encontramos mais de um Pixel do site nesta conta: '+matches.map(item=>item.name+' · '+item.id).join(', ')+'. Escolha na lista qual usar.';
      }else if(result.state==='not_in_account'){
        detection.textContent='O site contém Pixel, mas os IDs encontrados não estão disponíveis nesta conta de anúncios: '+(result.pixelIds||[]).join(', ')+'. Confira a conta ou conecte o Pixel na Meta. Você pode escolher outro Pixel da lista.';
      }else if(result.state==='unavailable'){
        detection.textContent='Não foi possível ler este site agora. Escolha um Pixel da conta ou tente verificar novamente.';
      }else{
        detection.textContent='Não identificamos um Pixel no código público deste site. Ele pode carregar por scripts ou após consentimento. Escolha um Pixel da conta e confira o rastreamento na Meta.';
      }
      notify();
    }catch(error){
      if(request===scanTurn&&isCurrent()){completedURL=address;detection.textContent='Não foi possível verificar o site. '+error.message+' A seleção manual continua disponível.'}
    }finally{
      if(request===scanTurn){scanning=false;check.disabled=!validURL()||!loaded}
    }
  }
  async function loadPixels(){
    if(loading)return;
    clearTimeout(timer);scanTurn++;scanning=false;completedURL='';
    const request=++pixelTurn,selected=pixel.value||suggestion?.pixelId||'';
    loading=true;refresh.disabled=true;check.disabled=true;pixel.innerHTML='<option value="">Buscando Pixels…</option>';section.setAttribute('aria-busy','true');status.textContent='Buscando todos os Pixels desta conta…';
    try{
      const result=await api('pixels');
      if(!isCurrent()||request!==pixelTurn)return;
      pixel.innerHTML='<option value="">Selecione um Pixel da conta</option>'+(result.items||[]).map(item=>'<option value="'+esc(item.id)+'"'+(item.available===false?' disabled':'')+'>'+esc(item.name)+' · '+esc(item.id)+(item.available===false?' — indisponível':'')+'</option>').join('');
      if([...pixel.options].some(option=>option.value===String(selected)&&!option.disabled))pixel.value=String(selected);
      loaded=true;
      status.textContent=result.items?.length?'Pixels da conta carregados. Você pode manter a sugestão automática ou escolher outro Pixel.':'Nenhum Pixel disponível. Adicione ou conecte um Pixel à conta na Meta e atualize a lista.';
    }catch(error){loaded=false;status.textContent='Não foi possível carregar os Pixels. '+error.message+' Tente atualizar a lista.'}
    finally{loading=false;refresh.disabled=false;section.removeAttribute('aria-busy');sync()}
  }
  function sync(){
    if(!isCurrent()){clearTimeout(timer);return}
    const active=site(),conversion=active&&goal.value!=='traffic';
    section.hidden=!active;goal.disabled=pixel.disabled=!active;
    section.querySelector('[data-conversion-fields]').hidden=!conversion;
    pixel.required=event.required=confirmed.required=conversion;event.disabled=confirmed.disabled=!conversion;
    check.disabled=!validURL()||!loaded||scanning;
    section.querySelector('[data-goal-help]').textContent={traffic:'Otimiza para cliques no link. O Pixel é opcional para acompanhar conversões.',leads:'Otimiza para contatos enviados ou cadastros concluídos no site.',sales:'Otimiza para compras concluídas no site.'}[goal.value];
    if(lastGoal!==goal.value){
      const previous=event.value;lastGoal=goal.value;resetConfirmation();
      const events=goal.value==='leads'?['LEAD','COMPLETE_REGISTRATION']:goal.value==='sales'?['PURCHASE']:[];
      event.innerHTML=events.map(value=>'<option value="'+value+'">'+eventLabels[value]+'</option>').join('');
      if(events.includes(previous))event.value=previous;
    }
    if(active&&!loaded&&!loading&&!status.textContent)void loadPixels();
    if(active)scheduleInspection();else{clearTimeout(timer);scanTurn++;scanning=false}
  }
  goal.addEventListener('change',sync);
  pixel.addEventListener('change',()=>{manualSelection=true;automaticPixel='';resetConfirmation()});event.addEventListener('change',resetConfirmation);
  url.addEventListener('input',()=>{resetConfirmation();scheduleInspection()});
  url.addEventListener('blur',scheduleInspection);
  check.onclick=()=>void inspect(true);
  refresh.onclick=()=>{resetConfirmation();completedURL='';void loadPixels()};
  sync();
  if(suggestion?.conversionEvent&&[...event.options].some(option=>option.value===suggestion.conversionEvent))event.value=suggestion.conversionEvent;
  return {sync,ready(){return !loading&&(!loaded||manualSelection||!observedURL||completedURL===observedURL)},status(){return detection.textContent},review(){return goalLabels[goal.value]+(pixel.value?' · '+pixel.selectedOptions[0].textContent:goal.value==='traffic'?' · Sem Pixel':' · Pixel não selecionado')+(goal.value==='traffic'?'':' · '+eventLabels[event.value])}};
}
