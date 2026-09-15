export function initializeOverviewCampaign({mount,getAccounts,isReady,isConnected,prepare,connect,reload=async()=>{}}){
  mount.classList.add('overview-campaign');
  mount.innerHTML=`<div class="overview-intro"><p class="eyebrow">SUA PRÓXIMA CAMPANHA</p><h1>O que vamos anunciar?</h1><p>Conte sua ideia. Nós preparamos a campanha para você revisar.</p></div>
    <form id="overviewCampaignForm" class="overview-composer">
      <label for="overviewDescription">Descreva sua campanha</label>
      <textarea id="overviewDescription" name="description" rows="7" minlength="12" maxlength="1500" required aria-describedby="overviewHint overviewStatus" placeholder="Quero divulgar minha loja em Belém para pessoas de 25 a 45 anos. O objetivo é receber contatos pelo WhatsApp, com R$ 40 por dia, no Facebook e Instagram..."></textarea>
      <div class="overview-field-help"><p id="overviewHint">Inclua a oferta, a localização, a faixa etária, o orçamento diário, onde anunciar e para onde levar os clientes.</p><span id="overviewCount">0 / 1500</span></div>
      <section id="overviewDestination" hidden aria-labelledby="overviewDestinationTitle"><h2 id="overviewDestinationTitle">Onde publicar?</h2><p>Selecione a conta de anúncio. Cada opção identifica a BM responsável.</p><label for="overviewAccount">Conta de anúncio e BM</label><select id="overviewAccount"><option value="">Selecione uma conta</option></select></section>
      <p id="overviewStatus" role="status" aria-live="polite"></p>
      <div class="overview-composer-actions"><button type="button" id="overviewConnect" hidden>Conectar Facebook</button><button type="submit" id="overviewContinue">Continuar <span aria-hidden="true">→</span></button></div>
    </form><p class="overview-review-note">Você revisa a campanha, a BM e a conta antes de publicar.</p>`;
  const $=selector=>mount.querySelector(selector),form=$('#overviewCampaignForm'),description=$('#overviewDescription'),selector=$('#overviewAccount'),destination=$('#overviewDestination'),status=$('#overviewStatus'),button=$('#overviewContinue'),connection=$('#overviewConnect');
  let visible=false,preparing=false,turn=0,choosing=false,needsAuthorization=false;
  const catalog=()=>[...new Map(getAccounts().filter(a=>a.id).map(a=>[String(a.id).replace(/^act_/,''),a])).values()];
  function options(rows){
    const selected=selector.value;
    selector.replaceChildren(new Option('Selecione uma conta',''));
    const groups=new Map();
    for(const account of rows){
      const key=account.businessId||'',business=account.businessId?(account.businessName||'BM')+' · '+account.businessId:'BM não informada';
      if(!groups.has(key)){const group=document.createElement('optgroup');group.label=business;groups.set(key,group);selector.append(group)}
      groups.get(key).append(new Option((account.name||account.id)+' · '+account.id+' — '+business,account.id));
    }
    if(rows.some(a=>a.id===selected))selector.value=selected;
  }
  function setBusy(value){preparing=value;form.setAttribute('aria-busy',String(value));button.disabled=value;description.readOnly=value;selector.disabled=value;connection.disabled=value;button.textContent=value?'Preparando campanha…':choosing?'Preparar campanha':'Continuar →'}
  function refresh(){if(choosing&&!preparing)options(catalog());if(!preparing){connection.hidden=!needsAuthorization&&isConnected()&&isReady()&&catalog().length>0;connection.textContent=needsAuthorization?'Autorizar gerenciamento':isConnected()?'Atualizar contas':'Conectar Facebook'}}
  description.addEventListener('input',()=>{description.setCustomValidity('');$('#overviewCount').textContent=description.value.length+' / 1500';status.textContent=''});
  connection.onclick=async()=>{if(!isConnected()||needsAuthorization){connect();return}connection.disabled=true;status.textContent='Atualizando suas contas…';try{const result=await reload();status.textContent=result&&isReady()?'Contas atualizadas. Continue para preparar a campanha.':'Não foi possível carregar as contas. Tente novamente.'}catch(error){status.textContent=error.message}finally{connection.disabled=false;refresh()}};
  form.onsubmit=async event=>{
    event.preventDefault();if(preparing)return;
    const text=description.value.trim();if(text.length<12){description.setCustomValidity('Descreva a campanha com pelo menos 12 caracteres.');description.reportValidity();return}
    if(!isConnected()){status.textContent='Conecte seu Facebook para escolher a conta da campanha.';refresh();return}
    if(!isReady()){status.textContent='As contas ainda não foram carregadas. Aguarde ou atualize as contas.';refresh();return}
    const rows=catalog();if(!rows.length){status.textContent='Nenhuma conta de anúncio disponível. Confira o acesso das suas contas no Facebook.';refresh();return}
    let account;
    if(rows.length===1&&rows[0].businessId){account=rows[0]}
    else{
      options(rows);destination.hidden=false;
      if(!choosing){choosing=true;button.textContent='Preparar campanha';selector.focus();return}
      account=rows.find(a=>a.id===selector.value);
      if(!account){status.textContent='Selecione a conta de anúncio para continuar.';selector.focus();return}
    }
    const stamp=++turn,current=()=>visible&&stamp===turn;
    setBusy(true);status.textContent='Preparando sua campanha. A revisão mostrará a BM e a conta selecionadas.';
    try{await prepare({...account},text,current);if(current()){needsAuthorization=false;connection.hidden=true;status.textContent='Campanha preparada. Revise os dados antes de publicar.'}}
    catch(error){if(current()){status.textContent=error.message||'Não foi possível preparar a campanha. Tente novamente.';if(error.status===403){needsAuthorization=true;connection.hidden=false;connection.textContent='Autorizar gerenciamento'}}}
    finally{if(current())setBusy(false)}
  };
  return {refresh,setVisible(value){visible=value;mount.hidden=!value;if(!value){turn++;setBusy(false)}else refresh()}};
}
