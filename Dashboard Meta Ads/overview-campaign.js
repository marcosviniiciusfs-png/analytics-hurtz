export function initializeOverviewCampaign({mount,getAccounts,isReady,isConnected,prepare,connect,reload=async()=>{}}){
  mount.classList.add('overview-campaign');
  mount.innerHTML=`<div class="overview-intro"><p class="eyebrow">SUA PRÓXIMA CAMPANHA</p><h1>O que vamos anunciar?</h1><p>Conte sua ideia. Nós preparamos a campanha para você revisar.</p></div>
    <form id="overviewCampaignForm" class="overview-composer">
      <label for="overviewDescription">Descreva sua campanha</label>
      <textarea id="overviewDescription" name="description" rows="7" minlength="12" maxlength="1500" required aria-describedby="overviewHint overviewStatus" placeholder="Quero divulgar minha loja em Belém para pessoas de 25 a 45 anos. O objetivo é receber contatos pelo WhatsApp, com R$ 40 por dia, no Facebook e Instagram..."></textarea>
      <div class="overview-field-help"><p id="overviewHint">Inclua a oferta, a localização, a faixa etária, o orçamento diário, onde anunciar e para onde levar os clientes.</p><span id="overviewCount">0 / 1500</span></div>
      <section id="overviewDestination" hidden aria-labelledby="overviewDestinationTitle"><h2 id="overviewDestinationTitle">Onde publicar?</h2><p>Selecione a conta de anúncio. Cada opção identifica a BM responsável.</p><input type="hidden" id="overviewAccount"><div id="overviewMemberSelector" class="account-member-selector"><div id="overviewMemberStrip" class="account-member-strip"></div><p id="overviewMemberSummary" class="account-member-summary" aria-live="polite"></p><div id="overviewMemberDropdown" class="account-member-dropdown" hidden><label class="account-member-search">Buscar conta ou BM<input id="overviewMemberSearch" type="search" autocomplete="off" placeholder="Nome ou ID da conta ou BM"></label><div id="overviewMemberList" class="account-member-list" aria-label="Contas dispon\u00edveis"></div></div></div></section>
      <p id="overviewStatus" role="status" aria-live="polite"></p>
      <section id="overviewLoading" class="overview-loading" hidden role="status" aria-live="polite"><span class="overview-loading-spinner" aria-hidden="true"></span><div><strong>Preparando sua campanha</strong><p>Organizando público, destino e orçamento para sua revisão.</p></div></section>
      <div class="overview-composer-actions"><button type="button" id="overviewConnect" hidden>Conectar Facebook</button><button type="submit" id="overviewContinue">Continuar <span aria-hidden="true">→</span></button></div>
    </form><p class="overview-review-note">Você revisa a campanha, a BM e a conta antes de publicar.</p>`;
  const $=selector=>mount.querySelector(selector),form=$('#overviewCampaignForm'),description=$('#overviewDescription'),selector=$('#overviewAccount'),destination=$('#overviewDestination'),status=$('#overviewStatus'),loading=$('#overviewLoading'),button=$('#overviewContinue'),connection=$('#overviewConnect');
  let visible=false,preparing=false,turn=0,choosing=false,needsAuthorization=false;
  const catalog=()=>[...new Map(getAccounts().filter(a=>a.id).map(a=>[String(a.id).replace(/^act_/,''),a])).values()];
  let pickerOpen=false;
  const picker=$('#overviewMemberSelector'),search=$('#overviewMemberSearch'),list=$('#overviewMemberList');
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const shortName=a=>String(a.name||a.id).replace(/^(?:\[CA\]|CA(?=\s|[-\u2013:]))\s*[-\u2013:]?\s*/i,'').trim()||a.id;
  const business=a=>a.businessId?(a.businessName||'BM')+' \u00b7 '+a.businessId:'BM n\u00e3o informada';
  function avatar(a){let url='';try{const parsed=new URL(a.businessPicture);if(parsed.protocol==='https:')url=parsed.href}catch{}return '<span class="account-member-initials">'+escape(shortName(a).split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase())+'</span>'+(url?'<img class="account-member-photo" src="'+escape(url)+'" alt="" referrerpolicy="no-referrer" loading="lazy">':'')}
  function renderList(){const query=normalize(search.value),rows=catalog().filter(a=>normalize([a.name,a.id,a.businessName,a.businessId].join(' ')).includes(query));
    list.innerHTML=rows.length?rows.map(a=>{const selected=a.id===selector.value;return '<button type="button" class="account-member-option '+(selected?'selected':'')+'" data-overview-account="'+escape(a.id)+'" aria-pressed="'+selected+'"><span class="account-member-small" aria-hidden="true">'+avatar(a)+'</span><span class="account-member-copy"><strong>'+escape(a.name||a.id)+'</strong><small>'+escape(a.id)+'</small><small>'+escape(business(a))+'</small></span><span class="account-member-check" aria-hidden="true">'+(selected?'\u2713':'')+'</span></button>'}).join(''):'<p class="account-member-empty">Nenhuma conta encontrada.</p>';
  }
  function options(rows){
    if(!rows.some(a=>a.id===selector.value))selector.value='';
    const sorted=[...rows].sort((a,b)=>Number(b.id===selector.value)-Number(a.id===selector.value));
    $('#overviewMemberStrip').innerHTML=sorted.slice(0,5).map(a=>{const selected=a.id===selector.value;return '<button type="button" class="account-member-avatar '+(selected?'selected':'')+'" data-overview-account="'+escape(a.id)+'" aria-pressed="'+selected+'" aria-label="Selecionar '+escape(a.name||a.id)+'" title="'+escape((a.name||a.id)+' \u00b7 '+a.id+' \u00b7 '+business(a))+'"><span class="account-member-circle">'+avatar(a)+'<span class="account-member-mark" aria-hidden="true">'+(selected?'\u2713':'+')+'</span></span><span class="account-member-name">'+escape(shortName(a))+'</span></button>'}).join('')+'<button type="button" id="overviewMemberAdd" class="account-member-avatar account-member-add" aria-expanded="'+pickerOpen+'" aria-controls="overviewMemberDropdown"><span class="account-member-circle" aria-hidden="true">'+(pickerOpen?'\u00d7':'+')+'</span><span>Selecionar</span></button>';
    const chosen=rows.find(a=>a.id===selector.value);
    $('#overviewMemberSummary').textContent=chosen?(chosen.name||chosen.id)+' \u00b7 '+chosen.id+' \u00b7 '+business(chosen):'Selecione uma conta para publicar a campanha.';
    $('#overviewMemberDropdown').hidden=!pickerOpen;renderList();
  }
  function closePicker(focus=false){pickerOpen=false;search.value='';options(catalog());if(focus)$('#overviewMemberAdd').focus()}
  picker.addEventListener('click',event=>{if(preparing)return;const choice=event.target.closest('[data-overview-account]');if(choice){selector.value=choice.dataset.overviewAccount;status.textContent='';closePicker(true);return}if(event.target.closest('#overviewMemberAdd')){pickerOpen=!pickerOpen;options(catalog());if(pickerOpen)search.focus()}});
  picker.addEventListener('error',event=>{if(event.target.matches('.account-member-photo'))event.target.remove()},true);
  search.addEventListener('input',()=>{list.scrollTop=0;renderList()});
  picker.addEventListener('keydown',event=>{if(event.key==='Escape'&&pickerOpen){event.preventDefault();event.stopPropagation();closePicker(true)}else if(event.target===search&&event.key==='Enter'){event.preventDefault()}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){const buttons=[...list.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(pickerOpen&&buttons.length){event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus()}}});
  document.addEventListener('pointerdown',event=>{if(pickerOpen&&!picker.contains(event.target))closePicker()});
  // During pointer focus transfer activeElement can briefly be body before the click.
  // relatedTarget identifies the actual destination without removing the clicked row.
  picker.addEventListener('focusout',event=>{if(pickerOpen&&event.relatedTarget&&!picker.contains(event.relatedTarget))closePicker()});
  function setBusy(value){preparing=value;form.setAttribute('aria-busy',String(value));form.classList.toggle('is-preparing',value);loading.hidden=!value;button.disabled=value;description.readOnly=value;selector.disabled=value;picker.inert=value;connection.disabled=value;button.textContent=value?'Preparando campanha…':choosing?'Preparar campanha':'Continuar →'}
  function refresh(){if(choosing&&!preparing)options(catalog());if(!preparing){connection.hidden=true;connection.textContent=needsAuthorization?'Autorizar gerenciamento':isConnected()?'Atualizar contas':'Conectar Facebook'}}
  description.addEventListener('input',()=>{description.setCustomValidity('');$('#overviewCount').textContent=description.value.length+' / 1500';status.textContent=''});
  connection.onclick=async()=>{if(!isConnected()||needsAuthorization){connect();return}connection.disabled=true;status.textContent='Atualizando suas contas…';try{const result=await reload();status.textContent=result&&isReady()?'Contas atualizadas. Continue para preparar a campanha.':'Não foi possível carregar as contas. Tente novamente.'}catch(error){status.textContent=error.message}finally{connection.disabled=false;refresh()}};
  form.onsubmit=async event=>{
    event.preventDefault();if(preparing)return;
    const text=description.value.trim();if(text.length<12){description.setCustomValidity('Descreva a campanha com pelo menos 12 caracteres.');description.reportValidity();return}
    if(!isConnected()){status.textContent='Conecte seu Facebook em Configurações para escolher a conta da campanha.';refresh();return}
    if(!isReady()){status.textContent='As contas ainda não foram carregadas. Aguarde ou atualize as contas.';refresh();return}
    const rows=catalog();if(!rows.length){status.textContent='Nenhuma conta de anúncio disponível. Confira o acesso das suas contas no Facebook.';refresh();return}
    let account;
    if(rows.length===1&&rows[0].businessId){account=rows[0]}
    else{
      options(rows);destination.hidden=false;
      if(!choosing){choosing=true;button.textContent='Preparar campanha';$('#overviewMemberAdd').focus();return}
      account=rows.find(a=>a.id===selector.value);
      if(!account){status.textContent='Selecione a conta de anúncio para continuar.';$('#overviewMemberAdd').focus();return}
    }
    const stamp=++turn,current=()=>visible&&stamp===turn;
    setBusy(true);status.textContent='Preparando sua campanha. A revisão mostrará a BM e a conta selecionadas.';
    try{await prepare({...account},text,current);if(current()){needsAuthorization=false;connection.hidden=true;status.textContent='Campanha preparada. Revise os dados antes de publicar.'}}
    catch(error){if(current()){status.textContent=error.message||'Não foi possível preparar a campanha. Tente novamente.';if(error.status===403){needsAuthorization=true;connection.hidden=false;connection.textContent='Autorizar gerenciamento'}}}
    finally{if(current())setBusy(false)}
  };
  return {refresh,setVisible(value){visible=value;mount.hidden=!value;if(!value){turn++;setBusy(false);closePicker()}else refresh()}};
}
