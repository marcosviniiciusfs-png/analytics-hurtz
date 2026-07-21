const MONITOR_API_BASE=location.hostname==='analytics.hurtzcompany.com'?'https://analytics-api.161-97-148-99.sslip.io':'';
const MONITOR_SESSION_KEY='hurtz-monitor-session';
const browserFetch=window.fetch.bind(window);
window.fetch=(input,options={})=>{const url=typeof input==='string'?input:input?.url||'',isMonitorApi=url.startsWith('/api/'),token=localStorage.getItem(MONITOR_SESSION_KEY);if(!isMonitorApi||!MONITOR_API_BASE)return browserFetch(input,options);return browserFetch(`${MONITOR_API_BASE}${url}`,{...options,headers:{...(options.headers||{}),...(token?{Authorization:`Bearer ${token}`}:{})}})};
const buttonLoadingState=new WeakMap();
let globalLoadingCount=0;
function setButtonLoading(button,loading,label){
  if(!button)return;
  const state=buttonLoadingState.get(button)||{count:0,disabled:button.disabled};
  const overlay=document.querySelector('#globalProgress'),message=document.querySelector('#globalProgressLabel');
  if(loading){
    state.count+=1;
    if(state.count===1){
      button.classList.add('is-loading');button.disabled=true;button.setAttribute('aria-busy','true');
    }
    globalLoadingCount+=1;
    if(message)message.textContent=label||'Consultando dados da Meta...';
    overlay?.classList.add('active');overlay?.removeAttribute('hidden');
  }else{
    state.count=Math.max(0,state.count-1);
    if(state.count===0){button.disabled=state.disabled;button.classList.remove('is-loading');button.removeAttribute('aria-busy')}
    globalLoadingCount=Math.max(0,globalLoadingCount-1);
    if(globalLoadingCount===0){overlay?.classList.remove('active');overlay?.setAttribute('hidden','')}
  }
  buttonLoadingState.set(button,state);
}

const accounts = [
  {id:'act_478905369997301',name:'CA - Consórcio Certicon',initials:'CC',color:'#e87722',status:'active',objectives:['Leads','Mensagens'],spend:0,leads:0,cycleSpend:0,plan:{deposit:5000,depositDate:'2026-07-12',plannedDays:20,dailyLimit:300},campaigns:[]},
  {id:'act_767057339654401',name:'CA - Malta Investimento',initials:'MI',color:'#6d4bc3',status:'active',objectives:['Leads','Mensagens'],spend:0,leads:0,cycleSpend:0,plan:{deposit:2200,depositDate:'2026-07-13',plannedDays:12,dailyLimit:230},campaigns:[]},
  {id:'act_1467904571001656',name:'CA - Topázio 03 - 7219',initials:'T3',color:'#d36b2d',status:'active',objectives:['Mensagens'],spend:0,leads:0,cycleSpend:0,plan:{deposit:1500,depositDate:'2026-07-10',plannedDays:10,dailyLimit:180},campaigns:[]},
  {id:'act_36589456883979012',name:'CA - Grupo União',initials:'GU',color:'#149374',status:'active',objectives:['Leads','Mensagens'],spend:0,leads:0,cycleSpend:0,plan:{deposit:10000,depositDate:'2026-07-09',plannedDays:30,dailyLimit:420},campaigns:[]},
  {id:'act_2797573667298980',name:'CA - Ideal Créditos',initials:'IC',color:'#ca3f67',status:'active',objectives:['Leads'],spend:0,leads:0,cycleSpend:0,plan:{deposit:2800,depositDate:'2026-07-11',plannedDays:14,dailyLimit:250},campaigns:[]},
  {id:'act_1505271587761873',name:'Gomes Invest',initials:'GI',color:'#2579b7',status:'active',objectives:['Mensagens'],spend:0,leads:0,cycleSpend:0,plan:{deposit:6000,depositDate:'2026-07-15',plannedDays:25,dailyLimit:280},campaigns:[]}
];

const AUDITED_META_DATA={
  'act_478905369997301':{'2026-07-18':{spend:.01,leads:null,source:'Conta R$ 0,01 = campanhas R$ 0,01',campaigns:[
    {id:'120246879448220726',name:'02 - [TESTE] - IMÓVEL - FORMULÁRIO - 18/06 - ESCALANDO',objective:'Formulário',status:'Ativa',spend:.01,results:null}
  ]}},
  'act_767057339654401':{'2026-07-18':{spend:17.85,leads:null,source:'Conta R$ 17,85 = campanhas R$ 17,85',campaigns:[
    {id:'120249766975150675',name:'03 - IMÓVEL - WHATSAPP - 11/07',objective:'Mensagens',status:'Ativa',spend:3.59,results:null},
    {id:'120249766975160675',name:'02 - IMÓVEL - WHATSAPP - 11/07',objective:'Mensagens',status:'Ativa',spend:5.37,results:null},
    {id:'120249830963020675',name:'02 - CARRO - WHATSAPP - 13/07',objective:'Mensagens',status:'Ativa',spend:1.34,results:null},
    {id:'120249852229310675',name:'01 - MOTO - WHATSAPP - 13/07',objective:'Mensagens',status:'Ativa',spend:3.48,results:null},
    {id:'120249852334500675',name:'03 - MOTO - WHATSAPP - 13/07',objective:'Mensagens',status:'Ativa',spend:3.08,results:null},
    {id:'120249852334560675',name:'02 - MOTO - WHATSAPP - 13/07',objective:'Mensagens',status:'Ativa',spend:.99,results:null}
  ]}},
  'act_1467904571001656':{'2026-07-18':{spend:0,leads:null,source:'Conta R$ 0,00 = campanhas R$ 0,00',campaigns:[]}},
  'act_36589456883979012':{
    '2026-07-18':{
      spend:7.28,
      leads:null,
      source:'Conta R$ 7,28 = campanhas R$ 7,28',
      campaigns:[
        {id:'120248979583450382',name:'01 - IMÓVEL - 08/07',objective:'Não auditado',status:'Ativa',spend:1.15,results:null},
        {id:'120249009072310382',name:'02 - IMÓVEL - 08/07',objective:'Não auditado',status:'Ativa',spend:2.92,results:null},
        {id:'120249186662200382',name:'04 - IMÓVEL - MENSAGEM - [1986] - 15/07',objective:'Mensagens',status:'Ativa',spend:.90,results:null},
        {id:'120249186662210382',name:'05 - IMÓVEL - MENSAGEM - [1986] - 15/07',objective:'Mensagens',status:'Ativa',spend:.42,results:null},
        {id:'120249186662220382',name:'03 - IMÓVEL - MENSAGEM - [1986] - 15/07',objective:'Mensagens',status:'Ativa',spend:.46,results:null},
        {id:'120249186662230382',name:'01 - IMÓVEL - MENSAGEM - [1986] - 15/07',objective:'Mensagens',status:'Ativa',spend:1.43,results:null}
      ]
    }
  },
  'act_2797573667298980':{'2026-07-18':{spend:0,leads:null,source:'Conta R$ 0,00 = campanhas R$ 0,00',campaigns:[]}},
  'act_1505271587761873':{'2026-07-18':{spend:24.46,leads:null,source:'Conta R$ 24,46 = campanhas R$ 24,46',campaigns:[
    {id:'120247363984160162',name:'06 - CAMINHÃO - 17/06',objective:'Não auditado',status:'Ativa',spend:7.37,results:null},
    {id:'120247435481040162',name:'1/3 - IMÓVEL - 18/06',objective:'Não auditado',status:'Ativa',spend:2.69,results:null},
    {id:'120247768762310162',name:'06 - CARRO - 24/06',objective:'Não auditado',status:'Ativa',spend:6.43,results:null},
    {id:'120248167287480162',name:'01 - IMÓVEL - 19/06 - ESCALANDO',objective:'Não auditado',status:'Ativa',spend:7.97,results:null}
  ]}}
};
const LIVE_PERIOD_DATA={};

const NOW = new Date();
const META_FEE_RATE = 0.1215;
const brl=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const brlExact=v=>v==null?'—':brl(v);
const num=v=>(Number(v)||0).toLocaleString('pt-BR');
const parseDate=s=>new Date(`${s}T12:00:00`);
const parsePlanStart=plan=>new Date(`${plan.depositDate}T${plan.depositTime||'00:00'}:00`);
const iso=d=>d.toISOString().slice(0,10);
const addDays=(date,days)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d};
const diffDays=(a,b)=>Math.max(1,Math.floor((a-b)/86400000)+1);
const fmtDate=d=>d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).replace('.','');
const fmtDateTime=d=>`${fmtDate(d)} às ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
const feeAmount=deposit=>(Number(deposit)||0)*META_FEE_RATE;
const netBudget=deposit=>Math.max(0,(Number(deposit)||0)-feeAmount(deposit));
const isCreditAccount=account=>account?.plan?.paymentType==='credit';

function loadPlans(){
  const saved=JSON.parse(localStorage.getItem('hurtz-balance-plans')||'{}');
  const idMigrations={act_90821734:'act_478905369997301',act_31177642:'act_767057339654401',act_55902811:'act_1467904571001656',act_21746390:'act_36589456883979012',act_66412098:'act_2797573667298980',act_78133025:'act_1505271587761873'};
  Object.entries(idMigrations).forEach(([oldId,newId])=>{if(saved[oldId]&&!saved[newId])saved[newId]=saved[oldId]});
  accounts.forEach(a=>{
    if(!a.plan.paymentType)a.plan.paymentType='prepaid';
    if(a.plan.weeklyLimit==null)a.plan.weeklyLimit=0;
    if(!a.plan.depositTime)a.plan.depositTime='00:00';
    a.trackingStart=a.plan.depositDate;
    a.trackedSpend=a.cycleSpend;
    if(saved[a.id])a.plan={...a.plan,...saved[a.id]};
  });
}
function savePlans(){
  const plans=Object.fromEntries(accounts.map(a=>[a.id,a.plan]));
  localStorage.setItem('hurtz-balance-plans',JSON.stringify(plans));
  fetch('/api/alert-plans',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({plans})}).catch(()=>{});
}
function metrics(a){
  const start=parsePlanStart(a.plan);
  const elapsedExact=Math.max(0,(NOW-start)/86400000);
  const elapsed=Math.floor(elapsedExact);
  const availableBudget=netBudget(a.plan.deposit);
  const spendInCycle=Math.min(availableBudget,a.plan.dailyLimit*elapsedExact);
  const balance=Math.max(0,availableBudget-spendInCycle);
  const plannedEnd=addDays(start,a.plan.plannedDays);
  const calendarDaysRemaining=Math.max(0,Math.ceil((plannedEnd-NOW)/86400000));
  const credit=isCreditAccount(a),status=credit?'active':balance<=0?'empty':calendarDaysRemaining<=3?'attention':'active';
  return {credit,start,elapsed,availableBudget:credit?0:availableBudget,fee:credit?0:feeAmount(a.plan.deposit),spendInCycle:credit?0:spendInCycle,balance:credit?null:balance,plannedEnd,calendarDaysRemaining:credit?null:calendarDaysRemaining,status};
}
const statusLabel={active:'Saudável',attention:'Até 3 dias',empty:'Saldo esgotado'};
function isAccountActive(account){return account.activeCampaignCount==null?account.status==='active':account.activeCampaignCount>0}
function metaAccountStatus(account){
  if(account.activeCampaignCount>0)return {css:'active',label:`${account.activeCampaignCount} campanhas ativas`};
  if(account.activeCampaignCount===0)return {css:'inactive',label:'Sem campanhas ativas'};
  return account.status==='active'?{css:'active',label:'Conta ativa na Meta'}:{css:'inactive',label:'Conta inativa na Meta'};
}
const summaryCards=document.querySelector('#summaryCards'),accountsBody=document.querySelector('#accountsBody'),accountsFoot=document.querySelector('#accountsFoot');
const metricLabel=(label,help)=>`<span class="metric-label">${label}<button class="info-tooltip" type="button" aria-label="Sobre ${label}">i<span role="tooltip">${help}</span></button></span>`;
const floatingTooltip=document.createElement('div');
floatingTooltip.className='floating-tooltip';
floatingTooltip.setAttribute('role','tooltip');
document.body.appendChild(floatingTooltip);
let activeTooltipTrigger=null;
function showFloatingTooltip(trigger){
  const content=trigger.matches('[data-heat-help]')?trigger.dataset.heatHelp:trigger.querySelector('[role="tooltip"]')?.textContent;
  if(!content)return;
  activeTooltipTrigger=trigger;
  floatingTooltip.textContent=content;
  floatingTooltip.classList.add('visible');
  const rect=trigger.getBoundingClientRect(),margin=10,width=floatingTooltip.offsetWidth,height=floatingTooltip.offsetHeight;
  let left=rect.left+(rect.width/2)-(width/2);
  left=Math.max(margin,Math.min(left,window.innerWidth-width-margin));
  let top=rect.top-height-9;
  if(top<margin)top=rect.bottom+9;
  floatingTooltip.style.left=`${left}px`;
  floatingTooltip.style.top=`${top}px`;
}
function hideFloatingTooltip(){activeTooltipTrigger=null;floatingTooltip.classList.remove('visible')}
document.addEventListener('mouseover',event=>{const trigger=event.target.closest('.info-tooltip,[data-heat-help]');if(trigger&&!trigger.contains(event.relatedTarget))showFloatingTooltip(trigger)});
document.addEventListener('mouseout',event=>{const trigger=event.target.closest('.info-tooltip,[data-heat-help]');if(trigger&&!trigger.contains(event.relatedTarget))hideFloatingTooltip()});
document.addEventListener('focusin',event=>{const trigger=event.target.closest('.info-tooltip,[data-heat-help]');if(trigger)showFloatingTooltip(trigger)});
document.addEventListener('focusout',event=>{if(event.target.closest('.info-tooltip,[data-heat-help]'))hideFloatingTooltip()});
window.addEventListener('scroll',hideFloatingTooltip,true);
window.addEventListener('resize',()=>{if(activeTooltipTrigger)showFloatingTooltip(activeTooltipTrigger)});
let globalPeriod={from:null,to:null,label:'Este mês'};
let selectedAccountIds=new Set(accounts.map(account=>account.id));
let activeSummaryFilter='all';
const PRESET_KEY='hurtz-dashboard-filter-presets';
const ACCOUNT_CATALOG_KEY='hurtz-dashboard-account-catalog';
const CAMPAIGN_GOALS_KEY='hurtz-campaign-column-goals';
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function readPresets(){
  try{
    const stored=JSON.parse(localStorage.getItem(PRESET_KEY)||'null');
    if(!stored||typeof stored!=='object')return {items:{},defaultName:null};
    const items=stored.items&&typeof stored.items==='object'?stored.items:{};
    return {items,defaultName:typeof stored.defaultName==='string'?stored.defaultName:null};
  }catch{return {items:{},defaultName:null}}
}
function writePresets(value){localStorage.setItem(PRESET_KEY,JSON.stringify(value))}
function readCampaignGoals(){try{return JSON.parse(localStorage.getItem(CAMPAIGN_GOALS_KEY)||'{}')}catch{return {}}}
function campaignGoals(accountId){return readCampaignGoals()[accountId]||{}}
function metricGoalState(metric,campaign,days,goals){
  const configured=goals&&Object.values(goals).some(value=>Number.isFinite(Number(value))&&String(value)!=='');
  if(metric==='investment'){
    const value=campaign.spend/days;
    if(!configured)return {tone:'neutral',reason:`Neutro: investimento médio de ${brl(value)}/dia; configure mínimo, ideal e máximo.`};
    if(goals.max!==''&&value>Number(goals.max))return {tone:'danger',reason:`Vermelho: ${brl(value)}/dia ultrapassa o máximo de ${brl(goals.max)}.`};
    if(goals.min!==''&&value<Number(goals.min))return {tone:'warning',reason:`Amarelo: ${brl(value)}/dia está abaixo do mínimo de ${brl(goals.min)}.`};
    if(goals.ideal!==''&&value>Number(goals.ideal))return {tone:'warning',reason:`Amarelo: ${brl(value)}/dia passou do ideal de ${brl(goals.ideal)}, mas segue abaixo do máximo.`};
    return {tone:'good',reason:`Verde: ${brl(value)}/dia está dentro da faixa planejada.`};
  }
  if(metric==='results'){
    if(campaign.results==null)return {tone:'warning',reason:'Amarelo: a Meta não retornou resultado auditável para esta campanha.'};
    const value=campaign.results/days;
    if(value===0)return {tone:'danger',reason:'Vermelho: a campanha gastou e teve zero resultados no período.'};
    if(!configured)return {tone:'neutral',reason:`Neutro: média de ${num(value)} resultados/dia; configure mínimo e ideal.`};
    if(goals.min!==''&&value<Number(goals.min))return {tone:'danger',reason:`Vermelho: ${num(value)} resultados/dia está abaixo do mínimo de ${num(goals.min)}.`};
    if(goals.ideal!==''&&value<Number(goals.ideal))return {tone:'warning',reason:`Amarelo: ${num(value)} resultados/dia está abaixo do ideal de ${num(goals.ideal)}.`};
    return {tone:'good',reason:`Verde: ${num(value)} resultados/dia atingiu a meta ideal.`};
  }
  if(campaign.costPerResult==null)return {tone:'danger',reason:'Vermelho: houve gasto, mas não há resultado para calcular o custo por resultado.'};
  if(!configured)return {tone:'neutral',reason:`Neutro: custo de ${brl(campaign.costPerResult)}; configure o valor ideal e máximo.`};
  if(goals.max!==''&&campaign.costPerResult>Number(goals.max))return {tone:'danger',reason:`Vermelho: ${brl(campaign.costPerResult)} ultrapassa o máximo de ${brl(goals.max)}.`};
  if(goals.ideal!==''&&campaign.costPerResult>Number(goals.ideal))return {tone:'warning',reason:`Amarelo: ${brl(campaign.costPerResult)} está acima do ideal de ${brl(goals.ideal)}.`};
  return {tone:'good',reason:`Verde: ${brl(campaign.costPerResult)} está dentro do custo ideal.`};
}
function saveAccountCatalog(){
  const catalog=accounts.map(({id,name,initials,color,status,businessName,businessPicture,objectives})=>({id,name,initials,color,status,businessName,businessPicture,objectives}));
  localStorage.setItem(ACCOUNT_CATALOG_KEY,JSON.stringify(catalog));
}
function loadAccountCatalog(){
  try{
    const catalog=JSON.parse(localStorage.getItem(ACCOUNT_CATALOG_KEY)||'[]');
    catalog.forEach(item=>{
      const existing=accounts.find(account=>account.id===item.id);
      if(existing){
        ['name','initials','color','status','businessName','businessPicture','objectives'].forEach(field=>{if(item[field]!=null)existing[field]=item[field]});
      }else accounts.push({...item,spend:0,leads:0,cycleSpend:0,plan:{deposit:0,depositDate:iso(NOW),depositTime:'00:00',plannedDays:1,dailyLimit:0}});
    });
  }catch{}
}
function renderAccountFilterOptions(){document.querySelector('#accountFilterOptions').innerHTML=accounts.map(account=>`<label><input type="checkbox" value="${account.id}" ${selectedAccountIds.has(account.id)?'checked':''}><span><b>${account.name}</b>${account.businessName?`<small>${account.businessName}</small>`:''}</span></label>`).join('')}
async function findMetaAccounts(showProgress=true){
  const button=document.querySelector('#findMetaAccounts'),status=document.querySelector('#accountSearchStatus');
  if(showProgress)setButtonLoading(button,true,'Buscando...');status.textContent='Consultando as BMs permitidas pelo token da Meta...';
  try{
    const response=await fetch('/api/meta-accounts');
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||'Falha na consulta');
    (payload.accounts||[]).forEach((item,index)=>{
      const existing=accounts.find(account=>account.id===item.id);
      if(existing){
        const cleanName=item.name||existing.name||item.id;
        existing.name=cleanName;
        existing.initials=cleanName.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase()||existing.initials;
        existing.status=item.account_status===1?'active':'inactive';
        existing.businessName=item.business_name||existing.businessName;
        existing.businessPicture=item.business_profile_picture_uri||existing.businessPicture;
        if(Array.isArray(item.objectives))existing.objectives=item.objectives;
        return;
      }
      const cleanName=item.name||item.id,initials=cleanName.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
      accounts.push({id:item.id,name:cleanName,initials:initials||'MA',color:`hsl(${(accounts.length+index)*47%360} 55% 45%)`,status:item.account_status===1?'active':'inactive',businessName:item.business_name||'Sem BM informada',businessPicture:item.business_profile_picture_uri||null,objectives:[],spend:0,leads:0,cycleSpend:0,plan:{deposit:0,depositDate:iso(NOW),depositTime:'00:00',plannedDays:1,dailyLimit:0}});
    });
    saveAccountCatalog();renderAccountFilterOptions();renderSummary();renderAccounts(document.querySelector('#searchInput').value);status.textContent=`${payload.account_count||accounts.length} contas encontradas em ${payload.business_count||0} BMs`;
  }catch(error){status.textContent=error.message}
  finally{if(showProgress)setButtonLoading(button,false)}
}
async function syncAccountsForAudit(ids=[...selectedAccountIds]){
  const selected=ids.map(id=>accounts.find(account=>account.id===id)).filter(Boolean).map(account=>({id:account.id,name:account.name}));
  if(!selected.length)throw new Error('Nenhuma conta válida foi selecionada para monitoramento.');
  const response=await fetch('/api/meta-monitor-config/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accounts:selected})}),payload=await response.json();
  if(!response.ok)throw new Error(payload.error||'Falha ao habilitar contas para auditoria.');
  return payload;
}
function applyAccountSelection(){
  const checked=[...document.querySelectorAll('#accountFilterOptions input:checked')].map(input=>input.value);
  if(!checked.length){alert('Selecione pelo menos uma conta de anúncio.');return false}
  selectedAccountIds=new Set(checked);
  document.querySelector('#tableDateFilter').textContent=`Filtros (${checked.length})`;
  renderSummary();renderAccounts(document.querySelector('#searchInput').value);
  syncAccountsForAudit(checked).catch(error=>{const status=document.querySelector('#accountSearchStatus');if(status)status.textContent=error.message});
  return true;
}
function refreshPresetSelect(){
  const presets=readPresets(),select=document.querySelector('#savedFilterPreset');
  select.innerHTML='<option value="">Predefinições salvas</option>'+Object.keys(presets.items).map(name=>`<option value="${escapeHtml(name)}">${presets.defaultName===name?'⚑ ':''}${escapeHtml(name)}</option>`).join('');
  document.querySelector('#setDefaultPreset').classList.toggle('is-default',Boolean(presets.defaultName));
  document.querySelector('#manageFilterPreset').disabled=true;
}
function selectPreset(name){document.querySelector('#savedFilterPreset').value=name;document.querySelector('#manageFilterPreset').disabled=!name}
function openPresetManager(){
  const select=document.querySelector('#savedFilterPreset'),manager=document.querySelector('#presetManager');
  if(!select.value){alert('Selecione uma predefinição para editar.');return}
  document.querySelector('#presetEditName').value=select.value;
  manager.hidden=!manager.hidden;
}
function updateSelectedPreset(){
  const select=document.querySelector('#savedFilterPreset'),oldName=select.value,newName=document.querySelector('#presetEditName').value.trim();
  if(!oldName||!newName){alert('Selecione uma predefinição e informe o nome.');return}
  if(!applyAccountSelection())return;
  const presets=readPresets();
  if(newName!==oldName)delete presets.items[oldName];
  presets.items[newName]=currentPreset();
  if(presets.defaultName===oldName)presets.defaultName=newName;
  writePresets(presets);refreshPresetSelect();selectPreset(newName);document.querySelector('#presetManager').hidden=true;
}
function deleteSelectedPreset(){
  const select=document.querySelector('#savedFilterPreset'),name=select.value;
  if(!name){alert('Selecione uma predefinição para apagar.');return}
  if(!confirm(`Apagar a predefinição "${name}"?`))return;
  const presets=readPresets();delete presets.items[name];if(presets.defaultName===name)presets.defaultName=null;writePresets(presets);refreshPresetSelect();document.querySelector('#presetManager').hidden=true;
}
function currentPreset(){return {from:iso(globalPeriod.from),to:iso(globalPeriod.to),label:globalPeriod.label,accountIds:[...selectedAccountIds]}}
function applyPreset(preset,applyPeriod=true){
  const ids=Array.isArray(preset?.accountIds)?preset.accountIds:accounts.map(account=>account.id);
  selectedAccountIds=new Set(ids.filter(id=>accounts.some(account=>account.id===id)));
  if(!selectedAccountIds.size)selectedAccountIds=new Set(accounts.map(account=>account.id));
  syncAccountsForAudit([...selectedAccountIds]).catch(()=>{});
  renderAccountFilterOptions();document.querySelector('#tableDateFilter').textContent=`Filtros (${selectedAccountIds.size})`;
  const from=/^\d{4}-\d{2}-\d{2}$/.test(preset?.from||'')?parseDate(preset.from):new Date(globalPeriod.from||NOW);
  const to=/^\d{4}-\d{2}-\d{2}$/.test(preset?.to||'')?parseDate(preset.to):new Date(globalPeriod.to||NOW);
  if(applyPeriod)applyGlobalPeriod(from,to,preset?.label||'Período salvo');
}

function applyGlobalPeriod(from,to,label,trigger=null){
  globalPeriod={from:new Date(from),to:new Date(to),label};
  document.querySelector('#globalDateFrom').value=iso(globalPeriod.from);
  document.querySelector('#globalDateTo').value=iso(globalPeriod.to);
  document.querySelector('#globalDateButton span').textContent=label;
  document.querySelector('#accountsPeriod').textContent=`Período: ${globalPeriod.from.toLocaleDateString('pt-BR')} até ${globalPeriod.to.toLocaleDateString('pt-BR')} • saldo conciliado por conta`;
  document.querySelectorAll('[data-global-range]').forEach(button=>button.classList.remove('active'));
  renderSummary();
  renderAccounts(document.querySelector('#searchInput').value);
  if(selectedAccount){syncModalDates();renderModal()}
  return loadAuditedPeriod(globalPeriod.from,globalPeriod.to,trigger);
}
function setGlobalRange(range,trigger=null){
  const end=new Date(NOW),start=new Date(NOW);let label;
  if(range==='today'){label='Hoje'}
  else if(range==='yesterday'){start.setDate(start.getDate()-1);end.setDate(end.getDate()-1);label='Ontem'}
  else if(range==='month'){start.setDate(1);label='Este mês'}
  else{start.setDate(start.getDate()-(Number(range)-1));label=`Últimos ${range} dias`}
  applyGlobalPeriod(start,end,label,trigger);
  document.querySelector(`[data-global-range="${range}"]`)?.classList.add('active');
}
function syncModalDates(){document.querySelector('#dateFrom').value=iso(globalPeriod.from);document.querySelector('#dateTo').value=iso(globalPeriod.to);document.querySelectorAll('#quickDates button').forEach(button=>button.classList.remove('active'));const yesterday=new Date(NOW);yesterday.setDate(yesterday.getDate()-1);if(iso(globalPeriod.from)===iso(yesterday)&&iso(globalPeriod.to)===iso(yesterday))document.querySelector('#quickDates [data-range="yesterday"]')?.classList.add('active')}
function toggleDatePanel(show,anchor=null){
  const panel=document.querySelector('#dateFilterPanel');
  panel.hidden=!show;
  if(!show)return;
  const target=anchor||document.querySelector('#globalDateButton');
  const rect=target.getBoundingClientRect(),margin=12;
  panel.style.visibility='hidden';
  requestAnimationFrame(()=>{
    const width=panel.offsetWidth,height=panel.offsetHeight;
    let left=Math.min(rect.right-width,window.innerWidth-width-margin);
    left=Math.max(margin,left);
    let top=rect.bottom+8;
    if(top+height>window.innerHeight-margin)top=Math.max(margin,rect.top-height-8);
    panel.style.left=`${left}px`;panel.style.right='auto';panel.style.top=`${top}px`;panel.style.visibility='visible';
  });
}
function storeAuditPayload(key,payload){
  LIVE_PERIOD_DATA[key]={...(LIVE_PERIOD_DATA[key]||{}),...(payload.accounts||{})};
  Object.values(payload.accounts||{}).forEach(row=>{
    const account=accounts.find(item=>item.id===row.id);if(!account)return;
    account.activeCampaignCount=Number(row.active_campaign_count)||0;
    const objectives=[...new Set((row.campaigns||[]).filter(campaign=>campaign.objective_label).map(campaign=>campaign.objective_label))];
    if(objectives.length)account.objectives=objectives;
  });
}
async function loadAuditedPeriod(from,to,trigger=null){
  const key=`${iso(from)}|${iso(to)}`;
  const missing=[...selectedAccountIds].filter(id=>!LIVE_PERIOD_DATA[key]?.[id]);
  if(!missing.length)return;
  const progressButton=trigger;
  if(progressButton)setButtonLoading(progressButton,true,progressButton.id==='refreshButton'?'Atualizando...':undefined);
  const refresh=document.querySelector('#refreshButton span');
  refresh.textContent='Auditando Meta...';
  try{
    const response=await fetch(`/api/meta-spend?from=${iso(from)}&to=${iso(to)}&accounts=${encodeURIComponent(missing.join(','))}`);
    if(!response.ok)throw new Error('Falha na coleta');
    const payload=await response.json();
    storeAuditPayload(key,payload);
    renderSummary();
    renderAccounts(document.querySelector('#searchInput').value);
    if(selectedAccount)renderModal();
    refresh.textContent='Auditoria concluída';
  }catch(error){
    refresh.textContent='Falha na auditoria';
  }finally{
    if(progressButton)setButtonLoading(progressButton,false);
    setTimeout(()=>refresh.textContent='Atualizar',1800);
  }
}
async function loadSelectedAccountAudit(){
  if(!selectedAccount)return;
  const accountId=selectedAccount.id,from=parseDate(document.querySelector('#dateFrom').value),to=parseDate(document.querySelector('#dateTo').value),key=`${iso(from)}|${iso(to)}`;
  document.querySelector('#campaignCount').textContent='Auditando Meta...';
  try{
    const response=await fetch(`/api/meta-spend?from=${iso(from)}&to=${iso(to)}&accounts=${encodeURIComponent(accountId)}`);
    if(!response.ok)throw new Error('Falha na coleta');
    const payload=await response.json();storeAuditPayload(key,payload);
    if(selectedAccount?.id===accountId){renderSummary();renderAccounts(document.querySelector('#searchInput').value);renderModal()}
  }catch(error){if(selectedAccount?.id===accountId)document.querySelector('#campaignCount').textContent='Falha na auditoria'}
}
function lastThreeDays(){const to=new Date(NOW),from=new Date(NOW);from.setDate(from.getDate()-2);return {from,to,key:`${iso(from)}|${iso(to)}`}}
function dailyLimitBreaches(){
  const audit=LIVE_PERIOD_DATA[lastThreeDays().key];
  if(!audit)return null;
  return accounts.filter(account=>selectedAccountIds.has(account.id)&&(()=>{
    const row=audit[account.id];
    return row?.reconciled&&row.daily?.some(day=>day.reconciled&&Number(day.account_spend)>account.plan.dailyLimit);
  })()).length;
}
function loadLastThreeDays(){const period=lastThreeDays();return loadAuditedPeriod(period.from,period.to)}
function exceedsDailyLimit(account){
  const row=LIVE_PERIOD_DATA[lastThreeDays().key]?.[account.id];
  return Boolean(row?.reconciled&&row.daily?.some(day=>day.reconciled&&Number(day.account_spend)>account.plan.dailyLimit));
}
function performanceForPeriod(a,from=globalPeriod.from,to=globalPeriod.to){
  const live=LIVE_PERIOD_DATA[`${iso(from)}|${iso(to)}`]?.[a.id];
  if(live){
    if(!live.reconciled)return {complete:false,spend:null,leads:null,cpl:null,campaigns:null,source:'Conta e campanhas não reconciliaram'};
    const resultsAudited=live.result_reconciled===true,campaigns=(live.campaigns||[]).map(campaign=>{const effective=campaign.effective_status||campaign.status||'UNKNOWN',labels={ACTIVE:'Ativa',PAUSED:'Pausada',ARCHIVED:'Arquivada',DELETED:'Excluída',IN_PROCESS:'Em processamento',WITH_ISSUES:'Com problema',CAMPAIGN_PAUSED:'Pausada',ADSET_PAUSED:'Pausada'};return {id:campaign.campaign_id,name:campaign.campaign_name,objective:campaign.objective_label||'Não informado',metaObjective:campaign.objective,status:labels[effective]||'Status não informado',effectiveStatus:effective,spend:Number(campaign.spend),results:resultsAudited&&campaign.results!=null?Number(campaign.results):null,costPerResult:resultsAudited&&campaign.cost_per_result!=null?Number(campaign.cost_per_result):null,resultType:campaign.result_type}});
    return {complete:true,resultsAudited,spend:Number(live.spend),accountSpend:Number(live.spend),campaignSum:Number(live.campaign_sum),leads:null,cpl:null,campaigns,daily:live.daily||[],activeCampaignCount:Number(live.active_campaign_count)||0,source:resultsAudited?`Conta ${brl(live.spend)} = campanhas ${brl(live.campaign_sum)}`:`Gasto reconciliado; resultados aguardando estabilização da Meta`};
  }
  return {complete:false,spend:null,leads:null,cpl:null,campaigns:null,source:'Aguardando auditoria da API Meta'};
  const rows=[],cursor=new Date(from),end=new Date(to),accountData=AUDITED_META_DATA[a.id]||{};
  cursor.setHours(12,0,0,0);end.setHours(12,0,0,0);
  while(cursor<=end){
    const row=accountData[iso(cursor)];
    if(!row)return {complete:false,spend:null,leads:null,cpl:null,campaigns:null,source:'Período ainda não auditado'};
    rows.push(row);cursor.setDate(cursor.getDate()+1);
  }
  const spend=rows.reduce((sum,row)=>sum+row.spend,0);
  const leads=rows.every(row=>Number.isFinite(row.leads))?rows.reduce((sum,row)=>sum+row.leads,0):null;
  const campaigns=new Map();
  rows.flatMap(row=>row.campaigns||[]).forEach(campaign=>{
    const current=campaigns.get(campaign.id)||{...campaign,spend:0,results:campaign.results==null?null:0};
    current.spend+=campaign.spend;
    if(current.results!=null&&campaign.results!=null)current.results+=campaign.results;
    campaigns.set(campaign.id,current);
  });
  return {complete:true,spend,leads,cpl:leads?spend/leads:null,campaigns:[...campaigns.values()],source:rows.map(row=>row.source).join(' • ')};
}

function renderSummary(){
  const monitored=accounts.filter(account=>selectedAccountIds.has(account.id));
  const calculated=monitored.map(a=>metrics(a));
  const active=monitored.filter(isAccountActive).length;
  const empty=calculated.filter(m=>!m.credit&&m.balance<=0).length;
  const ending=calculated.filter(m=>!m.credit&&m.balance>0&&m.calendarDaysRemaining<=3).length;
  const exceeded=dailyLimitBreaches();
  document.querySelector('#alertPill').textContent=empty+ending;
  summaryCards.innerHTML=`
    <article class="metric-card summary-filter-card ${activeSummaryFilter==='active'?'selected':''}" data-summary-filter="active" tabindex="0"><div class="metric-top">${metricLabel('Contas ativas','Quantidade de contas ativas monitoradas pelo dashboard.')}<span class="metric-icon">◎</span></div><div class="metric-value">${active}</div><div class="metric-foot"><strong>● Monitoradas agora</strong></div></article>
    <article class="metric-card danger summary-filter-card ${activeSummaryFilter==='empty'?'selected':''}" data-summary-filter="empty" tabindex="0"><div class="metric-top">${metricLabel('Contas sem saldo','Contas cujo saldo estimado do planejamento chegou a zero.')}<span class="metric-icon">!</span></div><div class="metric-value">${empty}</div><div class="metric-foot">Depósito conciliado esgotado</div></article>
    <article class="metric-card warning summary-filter-card ${activeSummaryFilter==='ending'?'selected':''}" data-summary-filter="ending" tabindex="0"><div class="metric-top">${metricLabel('Plano termina em até 3 dias','Contas cuja data planejada de término está a até três dias.')}<span class="metric-icon">◷</span></div><div class="metric-value">${ending}</div><div class="metric-foot">Conforme a duração configurada</div></article>
    <article class="metric-card money summary-filter-card ${activeSummaryFilter==='exceeded'?'selected':''}" data-summary-filter="exceeded" tabindex="0"><div class="metric-top">${metricLabel('Acima do limite diário','Contas que ultrapassaram o limite diário em pelo menos um dos últimos três dias.')}<span class="metric-icon">↗</span></div><div class="metric-value">${exceeded==null?'—':exceeded}</div><div class="metric-foot">Auditoria diária dos últimos 3 dias</div></article>`;
  document.querySelectorAll('[data-summary-filter]').forEach(card=>{
    const activate=()=>{const filter=card.dataset.summaryFilter;activeSummaryFilter=activeSummaryFilter===filter?'all':filter;renderSummary();renderAccounts(document.querySelector('#searchInput').value)};
    card.onclick=event=>{if(!event.target.closest('.info-tooltip'))activate()};
    card.onkeydown=event=>{if((event.key==='Enter'||event.key===' ')&&!event.target.closest('.info-tooltip')){event.preventDefault();activate()}};
  });
}

function forecastCell(a){
  const m=metrics(a);
  if(m.credit)return `<span class="forecast safe">Cartão de crédito</span><small class="forecast-date">Teto semanal ${brl(a.plan.weeklyLimit)}</small>`;
  return `<span class="forecast ${m.status==='attention'?'warning':'safe'}">${a.plan.plannedDays} dias de duração</span><small class="forecast-date">Termina ${fmtDate(m.plannedEnd)}</small>`;
}
function heatCell(content,tone,reason,classes=''){
  return `<td class="heat-cell heat-${tone} ${classes}" tabindex="0" data-heat-help="${escapeHtml(reason)}">${content}</td>`;
}
function spendHeat(a,p){
  if(!p.complete)return {tone:'warning',reason:'Amarelo: auditoria da Meta pendente para o período selecionado.'};
  if(!(a.plan.dailyLimit>0))return {tone:'neutral',reason:'Neutro: configure um limite diário para avaliar o gasto.'};
  const daily=(p.daily||[]).filter(day=>day.reconciled).map(day=>Number(day.account_spend)||0);
  const maxDaily=daily.length?Math.max(...daily):Number(p.spend)||0;
  const ratio=maxDaily/a.plan.dailyLimit;
  if(ratio>1)return {tone:'danger',reason:`Vermelho: maior gasto diário ${brl(maxDaily)}, acima do limite de ${brl(a.plan.dailyLimit)}.`};
  if(ratio>=.9)return {tone:'warning',reason:`Amarelo: maior gasto diário ${brl(maxDaily)}, entre 90% e 100% do limite de ${brl(a.plan.dailyLimit)}.`};
  return {tone:'good',reason:`Verde: maior gasto diário ${brl(maxDaily)}, abaixo de 90% do limite de ${brl(a.plan.dailyLimit)}.`};
}
function renderAccounts(filter=''){
  const matchesSummary=a=>{const m=metrics(a);if(activeSummaryFilter==='active')return isAccountActive(a);if(activeSummaryFilter==='empty')return !m.credit&&m.balance<=0;if(activeSummaryFilter==='ending')return !m.credit&&m.balance>0&&m.calendarDaysRemaining<=3;if(activeSummaryFilter==='exceeded')return exceedsDailyLimit(a);return true};
  const list=accounts.filter(a=>selectedAccountIds.has(a.id)&&matchesSummary(a)&&a.name.toLowerCase().includes(filter.toLowerCase()));
  accountsBody.innerHTML=list.map(a=>{const m=metrics(a),p=performanceForPeriod(a),status=metaAccountStatus(a),spendState=spendHeat(a,p),balanceRatio=m.availableBudget?m.balance/m.availableBudget:0,balanceState=m.credit?{tone:'neutral',reason:'Conta no cartão: não existe saldo pré-pago para estimar.'}:m.balance<=0?{tone:'danger',reason:'Vermelho: o saldo estimado do planejamento chegou a zero.'}:balanceRatio<=.3?{tone:'warning',reason:`Amarelo: resta ${Math.round(balanceRatio*100)}% da verba líquida planejada.`}:{tone:'good',reason:`Verde: resta ${Math.round(balanceRatio*100)}% da verba líquida planejada.`},forecastState=m.credit?{tone:'neutral',reason:`Cartão: acompanhamento pelo teto diário de ${brl(a.plan.dailyLimit)} e semanal de ${brl(a.plan.weeklyLimit)}.`}:m.calendarDaysRemaining<=0?{tone:'danger',reason:'Vermelho: a data planejada de término já chegou.'}:m.calendarDaysRemaining<=3?{tone:'warning',reason:`Amarelo: faltam ${m.calendarDaysRemaining} dias para o fim planejado.`}:{tone:'good',reason:`Verde: faltam ${m.calendarDaysRemaining} dias para o fim planejado.`};return `<tr>
    <td><div class="account-cell">${a.businessPicture?`<img class="account-logo account-photo" src="${a.businessPicture}" alt="" referrerpolicy="no-referrer" />`:`<span class="account-logo" style="background:${a.color}">${a.initials}</span>`}<div><button class="account-link" data-open="${a.id}">${a.name}</button><small class="account-id">${a.id}</small></div></div></td>
    ${heatCell(`<span class="status ${status.css}">${status.label}</span>`,a.activeCampaignCount==null?'warning':a.activeCampaignCount>0?'good':'danger',a.activeCampaignCount==null?'Amarelo: aguardando a consulta de campanhas na Meta.':a.activeCampaignCount>0?`Verde: ${a.activeCampaignCount} campanhas estão ativas na Meta.`:'Vermelho: nenhuma campanha ativa foi encontrada.')}
    ${heatCell(`<div class="objective">${a.objectives.map(o=>`<span class="tag">${o}</span>`).join('')}</div>`,'neutral','Neutro: objetivo da campanha é informativo e não representa desempenho.')}
    ${heatCell(`<strong>${p.leads?brl(p.cpl):'—'}</strong>`,'neutral',p.leads?'Neutro: configure uma meta de CPL para ativar a comparação.':'Neutro: CPL sem resultado auditado no período.','number')}
    ${m.credit?heatCell(`<strong>Cartão de crédito</strong><small class="table-sub">Sem depósito ou saldo pré-pago</small>`,'neutral','Conta configurada para acompanhar somente os gastos auditados.','number'):heatCell(`<strong>${brl(a.plan.deposit)}</strong><small class="table-sub">${fmtDateTime(m.start)} • líquido ${brl(m.availableBudget)}</small>`,a.plan.deposit>0?'good':'danger',a.plan.deposit>0?`Verde: depósito de ${brl(a.plan.deposit)} configurado no planejamento.`:'Vermelho: nenhum depósito foi configurado.','number')}
    ${m.credit?heatCell(`<strong>${brl(a.plan.dailyLimit)}/dia</strong><small class="table-sub">${brl(a.plan.weeklyLimit)}/semana</small>`,'neutral','Limites de gasto configurados para o cartão.','number'):heatCell(`<strong>${brl(m.spendInCycle)}</strong><small class="table-sub">Projeção pelo teto diário</small>`,'neutral','Neutro: projeção calculada pelo limite diário e tempo transcorrido; não é gasto real da Meta.','number')}
    ${heatCell(`<strong>${brlExact(p.spend)}</strong><small class="table-sub">${p.complete?(p.leads==null?'API auditada • resultados pendentes':`API auditada • ${num(p.leads)} leads`):'Período não auditado'}</small>`,spendState.tone,spendState.reason,'number')}
    ${heatCell(m.credit?`<strong>Não se aplica</strong><small>Gasto auditado pela Meta</small>`:`<strong>${brl(m.balance)}</strong><small>Limite ${brl(a.plan.dailyLimit)}/dia</small>`,balanceState.tone,balanceState.reason,'number balance')}
    ${heatCell(forecastCell(a),forecastState.tone,forecastState.reason)}
    <td><button class="plan-button" data-plan="${a.id}" title="Configurar pagamento e limites">⚙</button><button class="arrow-button" data-open="${a.id}">›</button></td></tr>`}).join('');
  const performances=list.map(a=>performanceForPeriod(a)),allAudited=performances.every(p=>p.complete),allLeadsAudited=allAudited&&performances.every(p=>p.leads!=null),spend=allAudited?performances.reduce((s,p)=>s+p.spend,0):null,leads=allLeadsAudited?performances.reduce((s,p)=>s+p.leads,0):null,prepaid=list.filter(a=>!isCreditAccount(a)),deposit=prepaid.reduce((s,a)=>s+a.plan.deposit,0),cycle=prepaid.reduce((s,a)=>s+metrics(a).spendInCycle,0),balance=prepaid.reduce((s,a)=>s+metrics(a).balance,0);
  accountsFoot.innerHTML=`<tr><td colspan="3">GERAL • ${list.length} CONTAS</td><td class="number">${leads?brl(spend/leads):'—'}</td><td class="number">${brl(deposit)}</td><td class="number">${brl(cycle)}</td><td class="number">${brlExact(spend)}</td><td class="number">${brl(balance)}</td><td colspan="2">${allAudited?'Auditoria concluída':'Auditoria pendente'}</td></tr>`;
  const filterNames={active:'Contas ativas',empty:'Contas sem saldo',ending:'Plano termina em até 3 dias',exceeded:'Acima do limite diário'};
  document.querySelector('#accountCount').textContent=`Exibindo ${list.length} de ${accounts.length} contas${activeSummaryFilter!=='all'?` • ${filterNames[activeSummaryFilter]}`:''}`;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openAccount(b.dataset.open,false));
  document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>openAccount(b.dataset.plan,true));
}

const modal=document.querySelector('#accountModal'),planForm=document.querySelector('#balancePlan');let selectedAccount=null;
let selectedCampaignGoal=null;
const campaignGoalDefinitions={
  investment:{title:'Meta de investimento diário',fields:[['min','Mínimo por dia (R$)'],['ideal','Ideal — valor abaixo de (R$)'],['max','Máximo — valor acima de (R$)']]},
  results:{title:'Meta de resultados diários',fields:[['min','Mínimo por dia'],['ideal','Ideal — valor acima de']]},
  cost:{title:'Meta de custo por resultado',fields:[['ideal','Ideal — valor abaixo de (R$)'],['max','Máximo — valor acima de (R$)']]}
};
function openCampaignGoal(metric){
  selectedCampaignGoal=metric;const panel=document.querySelector('#campaignGoalPanel'),definition=campaignGoalDefinitions[metric],saved=campaignGoals(selectedAccount.id)[metric]||{};
  document.querySelector('#campaignGoalTitle').textContent=definition.title;
  document.querySelector('#campaignGoalFields').innerHTML=definition.fields.map(([name,label])=>`<label>${label}<input type="number" min="0" step="0.01" name="${name}" value="${saved[name]??''}" placeholder="Não definido" /></label>`).join('');
  panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function closeCampaignGoal(){document.querySelector('#campaignGoalPanel').hidden=true;selectedCampaignGoal=null}
document.querySelectorAll('[data-campaign-goal]').forEach(button=>button.onclick=()=>openCampaignGoal(button.dataset.campaignGoal));
document.querySelector('#closeCampaignGoal').onclick=closeCampaignGoal;
document.querySelector('#campaignGoalPanel').onsubmit=event=>{event.preventDefault();if(!selectedAccount||!selectedCampaignGoal)return;const all=readCampaignGoals(),values={};new FormData(event.currentTarget).forEach((value,key)=>values[key]=value);const number=name=>values[name]===''?null:Number(values[name]);if(number('min')!=null&&number('ideal')!=null&&number('min')>number('ideal')){alert('O valor mínimo não pode ser maior que o ideal.');return}if(number('ideal')!=null&&number('max')!=null&&number('ideal')>number('max')){alert('O valor ideal não pode ser maior que o máximo.');return}all[selectedAccount.id]??={};all[selectedAccount.id][selectedCampaignGoal]=values;localStorage.setItem(CAMPAIGN_GOALS_KEY,JSON.stringify(all));closeCampaignGoal();renderModal()};
document.querySelector('#clearCampaignGoal').onclick=()=>{if(!selectedAccount||!selectedCampaignGoal)return;const all=readCampaignGoals();if(all[selectedAccount.id])delete all[selectedAccount.id][selectedCampaignGoal];localStorage.setItem(CAMPAIGN_GOALS_KEY,JSON.stringify(all));closeCampaignGoal();renderModal()};
function openAccount(id,showPlan=false){closeCampaignGoal();selectedAccount=accounts.find(a=>a.id===id);document.querySelector('#modalTitle').textContent=selectedAccount.name;document.querySelector('#modalSubtitle').textContent=`${selectedAccount.id} • ${isCreditAccount(selectedAccount)?'controle de gastos no cartão':'planejamento conciliado da conta'}`;fillPlan();syncModalDates();renderModal();togglePlan(showPlan);modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';loadSelectedAccountAudit()}
function fillPlan(){const p=selectedAccount.plan;document.querySelector('#paymentType').value=p.paymentType||'prepaid';document.querySelector('#depositAmount').value=p.deposit;document.querySelector('#depositDate').value=p.depositDate;document.querySelector('#depositTime').value=p.depositTime||'00:00';document.querySelector('#plannedDays').value=p.plannedDays;document.querySelector('#dailyLimit').value=p.dailyLimit;document.querySelector('#weeklyLimit').value=p.weeklyLimit||'';syncPaymentTypeFields();renderNetBudgetPreview()}
function syncPaymentTypeFields(){const credit=document.querySelector('#paymentType').value==='credit';document.querySelectorAll('[data-prepaid-field]').forEach(field=>{field.hidden=credit;field.querySelector('input').required=!credit});document.querySelectorAll('[data-credit-field]').forEach(field=>{field.hidden=!credit;field.querySelector('input').required=credit});document.querySelector('#planFormTitle').textContent=credit?'Controle de gastos no cartão':'Planejamento do depósito';document.querySelector('#planFormDescription').textContent=credit?'A Meta será auditada pelos tetos diário e semanal; saldo e depósito não se aplicam.':'O ciclo considera somente gastos posteriores à data e ao horário do depósito.'}
function togglePlan(show){planForm.hidden=!show;document.querySelector('#planToggle').textContent=show?'Fechar configuração':'Configurar pagamento'}
function renderModal(){
  const a=selectedAccount,m=metrics(a),from=parseDate(document.querySelector('#dateFrom').value),to=parseDate(document.querySelector('#dateTo').value),p=performanceForPeriod(a,from,to),cpl=p.cpl;
  const credit=m.credit,periodDays=diffDays(to,from),periodLimit=Math.min((a.plan.weeklyLimit||Infinity)*Math.ceil(periodDays/7),(a.plan.dailyLimit||Infinity)*periodDays),periodRatio=p.complete&&Number.isFinite(periodLimit)&&periodLimit>0?p.spend/periodLimit:null;
  const planStatus=m.start>NOW?'Ainda não iniciado':m.calendarDaysRemaining===0?'Finalizado':'Em andamento';
  document.querySelector('#modalSummary').innerHTML=(credit?[
    ['Forma de pagamento','Cartão de crédito','Conta acompanhada exclusivamente pelo gasto oficial da Meta.'],
    ['Gasto no período',brlExact(p.spend),p.complete?'Valor usado auditado para o filtro selecionado.':'Aguardando auditoria da Meta.'],
    ['Limite diário',brl(a.plan.dailyLimit),'Valor máximo configurado para gastar em um dia.'],
    ['Limite semanal',brl(a.plan.weeklyLimit),'Valor máximo configurado para gastar de segunda a domingo.'],
    ['Uso do limite',periodRatio==null?'—':`${Math.round(periodRatio*100)}%`,'Comparação do gasto auditado com o menor teto aplicável ao período.'],
    ['Auditoria',p.complete?'Conciliada':'Pendente','O gasto só é exibido como válido após conta e campanhas reconciliarem.']
  ]:[
    ['Saldo estimado',brl(m.balance),'Verba disponível menos o consumo calculado desde o depósito.'],
    ['Valor depositado',brl(a.plan.deposit),'Valor bruto informado no depósito da conta.'],
    ['Taxa Meta (12,15%)',brl(m.fee),'Parcela de 12,15% descontada do valor depositado.'],
    ['Verba disponível',brl(m.availableBudget),'Valor líquido que poderá ser usado nos anúncios.'],
    ['Duração',`${a.plan.plannedDays} dias`,'Quantidade de dias definida para o saldo durar.'],
    ['Fim previsto',fmtDate(m.plannedEnd),'Data do depósito somada à duração planejada.']
  ]).map(([l,v,h])=>`<div class="modal-stat">${metricLabel(l,h)}<strong>${v}</strong></div>`).join('');
  document.querySelector('#planStrip').innerHTML=credit?`
    <div>${metricLabel('Gasto acompanhado','Somente valores oficiais auditados retornados pela Meta.')}<strong>${brlExact(p.spend)}</strong></div>
    <div>${metricLabel('Teto diário','Valor máximo permitido por dia.')}<strong>${brl(a.plan.dailyLimit)}</strong></div>
    <div>${metricLabel('Teto semanal','Valor máximo permitido de segunda a domingo.')}<strong>${brl(a.plan.weeklyLimit)}</strong></div>
    <div>${metricLabel('Status do controle','Compara o gasto auditado com os limites configurados.')}<strong>${periodRatio==null?'Aguardando auditoria':periodRatio>1?'Acima do limite':periodRatio>=.9?'Próximo do limite':'Dentro do limite'}</strong></div>`:`
    <div>${metricLabel('Data e hora do depósito','Momento exato a partir do qual os gastos entram no ciclo.')}<strong>${fmtDateTime(m.start)}</strong></div>
    <div>${metricLabel('Limite diário','Valor máximo planejado para gastar por dia.')}<strong>${brl(a.plan.dailyLimit)}</strong></div>
    <div>${metricLabel('Dias transcorridos','Dias completos desde o depósito dentro deste planejamento.')}<strong>${Math.min(m.elapsed,a.plan.plannedDays)} de ${a.plan.plannedDays}</strong></div>
    <div>${metricLabel('Status do planejamento','Mostra se o ciclo ainda vai começar, está ativo ou terminou.')}<strong>${planStatus}</strong></div>`;
  const goalSettings=campaignGoals(a.id);
  document.querySelector('#campaignBody').innerHTML=p.complete&&p.campaigns?.length?p.campaigns.map(campaign=>{
    const investmentState=metricGoalState('investment',campaign,periodDays,goalSettings.investment);
    const resultState=metricGoalState('results',campaign,periodDays,goalSettings.results);
    const costState=metricGoalState('cost',campaign,periodDays,goalSettings.cost);
    const statusTone=campaign.effectiveStatus==='ACTIVE'?'good':campaign.status==='Pausada'?'warning':campaign.effectiveStatus==='WITH_ISSUES'?'danger':'neutral',statusCss=campaign.effectiveStatus==='ACTIVE'?'active':'attention';
    return `<tr><td class="campaign-name">${campaign.name}<small>ID ${campaign.id}</small></td>${heatCell(`<span class="tag campaign-objective-tag">${campaign.objective}</span>`,'neutral',`Neutro: resultado principal mapeado como ${campaign.objective} pelo nome, objetivo e action type da Meta.`)}${heatCell(`<span class="status ${statusCss}">${campaign.status}</span>`,statusTone,`${campaign.status}: status atual retornado pela Meta (${campaign.effectiveStatus}).`)}${heatCell(brl(campaign.spend),investmentState.tone,investmentState.reason,'number')}${heatCell(campaign.results==null?'—':num(campaign.results),resultState.tone,resultState.reason,'number')}${heatCell(campaign.costPerResult==null?'—':`<strong>${brl(campaign.costPerResult)}</strong>`,costState.tone,costState.reason,'number')}</tr>`;
  }).join(''):`<tr><td colspan="6" class="audit-empty">Dados indisponíveis: este período ainda não passou pela auditoria Meta.</td></tr>`;
  const displayedCampaigns=p.complete?(p.campaigns||[]):[],totalSpend=displayedCampaigns.reduce((sum,campaign)=>sum+campaign.spend,0),allResultsAudited=displayedCampaigns.length>0&&displayedCampaigns.every(campaign=>campaign.results!=null),totalResults=allResultsAudited?displayedCampaigns.reduce((sum,campaign)=>sum+campaign.results,0):null,generalCost=totalResults>0?totalSpend/totalResults:null,generalCostLabel=displayedCampaigns.length&&displayedCampaigns.every(campaign=>campaign.objective==='Formulário')?'CPL geral':'Custo/resultado geral';
  document.querySelector('#campaignFoot').innerHTML=displayedCampaigns.length?`<tr><td colspan="3"><strong>TOTAL • ${displayedCampaigns.length} CAMPANHAS</strong><small>Todas as campanhas com veiculação no período, incluindo pausadas</small></td><td class="number"><strong>${brl(totalSpend)}</strong><small>Valor usado</small></td><td class="number"><strong>${totalResults==null?'—':num(totalResults)}</strong><small>Resultados auditados</small></td><td class="number"><strong>${generalCost==null?'—':brl(generalCost)}</strong><small>${generalCostLabel}</small></td></tr><tr class="campaign-audit-row"><td colspan="6"><strong>✓ AUDITORIA META CONCLUÍDA</strong><small>Conta ${brl(p.accountSpend)} = soma de todas as campanhas com veiculação ${brl(p.campaignSum)}.</small></td></tr>`:'';
  document.querySelector('#campaignCount').textContent=p.complete?`${p.campaigns?.length||0} campanhas auditadas`:'Auditoria pendente';updatePeriodLabel();
}
function renderNetBudgetPreview(){const credit=document.querySelector('#paymentType').value==='credit',deposit=Number(document.querySelector('#depositAmount').value)||0,daily=Number(document.querySelector('#dailyLimit').value)||0,weekly=Number(document.querySelector('#weeklyLimit').value)||0;document.querySelector('#netBudgetPreview').innerHTML=credit?`<span>Limite diário: <b>${brl(daily)}</b></span><strong>Limite semanal: ${brl(weekly)}</strong>`:`<span>Taxa de 12,15%: <b>${brl(feeAmount(deposit))}</b></span><strong>Disponível para anúncios: ${brl(netBudget(deposit))}</strong>`}
planForm.addEventListener('submit',e=>{e.preventDefault();const previous=selectedAccount.plan,paymentType=document.querySelector('#paymentType').value;selectedAccount.plan={paymentType,deposit:paymentType==='credit'?0:Number(document.querySelector('#depositAmount').value),depositDate:document.querySelector('#depositDate').value||previous.depositDate||iso(NOW),depositTime:document.querySelector('#depositTime').value||'00:00',plannedDays:paymentType==='credit'?1:Number(document.querySelector('#plannedDays').value),dailyLimit:Number(document.querySelector('#dailyLimit').value),weeklyLimit:paymentType==='credit'?Number(document.querySelector('#weeklyLimit').value):0};savePlans();renderSummary();renderAccounts(document.querySelector('#searchInput').value);renderModal();togglePlan(false)});
document.querySelector('#depositAmount').addEventListener('input',renderNetBudgetPreview);
document.querySelector('#dailyLimit').addEventListener('input',renderNetBudgetPreview);
document.querySelector('#weeklyLimit').addEventListener('input',renderNetBudgetPreview);
document.querySelector('#paymentType').addEventListener('change',()=>{syncPaymentTypeFields();renderNetBudgetPreview()});
document.querySelector('#planToggle').onclick=()=>togglePlan(planForm.hidden);
document.querySelector('#globalDateButton').onclick=e=>{e.stopPropagation();const panel=document.querySelector('#dateFilterPanel');toggleDatePanel(panel.hidden,e.currentTarget)};
document.querySelector('#tableDateFilter').onclick=e=>{e.stopPropagation();const panel=document.querySelector('#dateFilterPanel');toggleDatePanel(panel.hidden,e.currentTarget)};
document.querySelector('#dateFilterPanel').onclick=e=>e.stopPropagation();
document.querySelectorAll('[data-global-range]').forEach(button=>button.onclick=event=>{if(!applyAccountSelection())return;setGlobalRange(button.dataset.globalRange,event.currentTarget);toggleDatePanel(false)});
document.querySelector('#applyDateFilter').onclick=async event=>{const from=parseDate(document.querySelector('#globalDateFrom').value),to=parseDate(document.querySelector('#globalDateTo').value);if(from>to){alert('A data inicial deve ser anterior à data final.');return}if(!applyAccountSelection())return;toggleDatePanel(false);await applyGlobalPeriod(from,to,`${from.toLocaleDateString('pt-BR')} – ${to.toLocaleDateString('pt-BR')}`,event.currentTarget)};
document.querySelector('#toggleAllAccounts').onclick=()=>{const inputs=[...document.querySelectorAll('#accountFilterOptions input')],allChecked=inputs.every(input=>input.checked);inputs.forEach(input=>input.checked=!allChecked);document.querySelector('#toggleAllAccounts').textContent=allChecked?'Selecionar todas':'Limpar seleção'};
document.querySelector('#findMetaAccounts').onclick=findMetaAccounts;
document.querySelector('#manageFilterPreset').onclick=openPresetManager;
document.querySelector('#updateFilterPreset').onclick=updateSelectedPreset;
document.querySelector('#deleteFilterPreset').onclick=deleteSelectedPreset;
document.querySelector('#saveFilterPreset').onclick=()=>{if(!applyAccountSelection())return;const name=document.querySelector('#presetName').value.trim();if(!name){alert('Digite um nome para a predefinição.');return}const presets=readPresets();presets.items[name]=currentPreset();writePresets(presets);refreshPresetSelect();selectPreset(name);document.querySelector('#presetName').value=''};
document.querySelector('#setDefaultPreset').onclick=()=>{let name=document.querySelector('#savedFilterPreset').value||document.querySelector('#presetName').value.trim();if(!name){alert('Selecione ou salve uma predefinição primeiro.');return}const presets=readPresets();if(!presets.items[name]){if(!applyAccountSelection())return;presets.items[name]=currentPreset()}presets.defaultName=name;writePresets(presets);refreshPresetSelect();selectPreset(name)};
document.querySelector('#savedFilterPreset').onchange=e=>{const preset=readPresets().items[e.target.value];document.querySelector('#presetManager').hidden=true;document.querySelector('#manageFilterPreset').disabled=!e.target.value;if(preset)applyPreset(preset)};
document.addEventListener('click',()=>toggleDatePanel(false));
function updatePeriodLabel(){const f=document.querySelector('#dateFrom').value,t=document.querySelector('#dateTo').value;document.querySelector('#campaignPeriod').textContent=`Período: ${parseDate(f).toLocaleDateString('pt-BR')} até ${parseDate(t).toLocaleDateString('pt-BR')}`}
function setDates(range){const end=new Date(NOW),start=new Date(NOW);if(range==='yesterday'){start.setDate(start.getDate()-1);end.setDate(end.getDate()-1)}else if(range!=='today')start.setDate(start.getDate()-(Number(range)-1));document.querySelector('#dateFrom').value=iso(start);document.querySelector('#dateTo').value=iso(end);if(selectedAccount)updatePeriodLabel()}
function closeModal(){closeCampaignGoal();modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=''}
document.querySelector('#searchInput').addEventListener('input',e=>renderAccounts(e.target.value));document.querySelector('#closeModal').onclick=closeModal;modal.onclick=e=>{if(e.target===modal)closeModal()};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});document.querySelectorAll('#quickDates button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#quickDates button').forEach(x=>x.classList.remove('active'));b.classList.add('active');setDates(b.dataset.range)});document.querySelectorAll('.custom-date input').forEach(i=>i.onchange=()=>{document.querySelectorAll('#quickDates button').forEach(x=>x.classList.remove('active'));if(selectedAccount)updatePeriodLabel()});document.querySelector('#refreshButton').onclick=e=>{const b=e.currentTarget;b.querySelector('span').textContent='Atualizando...';setTimeout(()=>{b.querySelector('span').textContent='Atualizado agora';setTimeout(()=>b.querySelector('span').textContent='Atualizar',1500)},700)};
document.querySelectorAll('#quickDates button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#quickDates button').forEach(x=>x.classList.remove('active'));b.classList.add('active');setDates(b.dataset.range);if(selectedAccount){renderModal();loadSelectedAccountAudit()}});
document.querySelectorAll('.custom-date input').forEach(i=>i.onchange=()=>{document.querySelectorAll('#quickDates button').forEach(x=>x.classList.remove('active'));if(selectedAccount){renderModal();loadSelectedAccountAudit()}});
document.querySelector('#refreshButton').onclick=async event=>{delete LIVE_PERIOD_DATA[`${iso(globalPeriod.from)}|${iso(globalPeriod.to)}`];delete LIVE_PERIOD_DATA[lastThreeDays().key];await Promise.all([loadAuditedPeriod(globalPeriod.from,globalPeriod.to,event.currentTarget),loadLastThreeDays()])};
loadAccountCatalog();selectedAccountIds=new Set(accounts.map(account=>account.id));loadPlans();renderAccountFilterOptions();refreshPresetSelect();const defaultPreset=readPresets().items[readPresets().defaultName];if(defaultPreset)applyPreset(defaultPreset,false);setGlobalRange('yesterday');document.querySelector('#tableDateFilter').textContent=`Filtros (${selectedAccountIds.size})`;loadLastThreeDays();renderSummary();renderAccounts();setTimeout(()=>{if(accounts.some(account=>!account.businessPicture))findMetaAccounts(false)},250);

/* Analise interativa: somente dados reconciliados pela API Meta. */
const HISTORICAL_90_DATA={};
let analysisAccountSelection=null,accountAnalysisCampaignSelection=null,activeAccountTab='campaigns';
const chartPalette=['#e87722','#2878d0','#12a66a','#7b5bd6','#e3a221','#d94b59','#24968a','#9a6b45'];
const median=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2};
const shortName=(value,max=28)=>value.length>max?`${value.slice(0,max-1)}…`:value;
function auditedRows(from=globalPeriod.from,to=globalPeriod.to){return accounts.filter(account=>selectedAccountIds.has(account.id)).map(account=>({account,performance:performanceForPeriod(account,from,to)})).filter(row=>row.performance.complete)}
function kpiMarkup(items){return items.map(item=>`<div class="analysis-kpi"><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong><small>${escapeHtml(item.note)}</small></div>`).join('')}
function emptyChart(message){return `<div class="chart-empty">${escapeHtml(message)}</div>`}
function barChart(items,format=value=>brl(value),selected=null){if(!items.length)return emptyChart('Ainda não há dados auditados para este gráfico.');const max=Math.max(...items.map(item=>item.value),1);return `<div class="bar-chart">${items.map((item,index)=>`<button class="bar-row ${selected===item.id?'selected':''}" type="button" data-chart-id="${escapeHtml(item.id)}" title="${escapeHtml(item.fullLabel||item.label)}: ${escapeHtml(format(item.value))}"><span class="bar-label">${escapeHtml(shortName(item.label))}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(1,item.value/max*100)}%;background:${item.color||chartPalette[index%chartPalette.length]}"></span></span><span class="bar-value">${escapeHtml(format(item.value))}</span></button>`).join('')}</div>`}
function trendChart(points){if(!points.length)return emptyChart('A evolução diária aparecerá após a auditoria do período.');const width=760,height=190,pad=24,max=Math.max(...points.map(point=>point.value),1),step=points.length===1?0:(width-pad*2)/(points.length-1);const coords=points.map((point,index)=>({x:pad+index*step,y:height-pad-(point.value/max)*(height-pad*2),...point}));const line=coords.map((point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' ');const area=`${line} L ${coords.at(-1).x} ${height-pad} L ${coords[0].x} ${height-pad} Z`;return `<svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução diária do investimento"><line class="trend-grid" x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}"/><path class="trend-area" d="${area}"/><path class="trend-line" d="${line}"/>${coords.map((point,index)=>`<g><circle class="trend-point" tabindex="0" data-day="${point.id}" cx="${point.x}" cy="${point.y}" r="5"><title>${point.label}: ${brl(point.value)}</title></circle>${(points.length<=10||index%Math.ceil(points.length/8)===0)?`<text class="trend-label" text-anchor="middle" x="${point.x}" y="${height-5}">${point.label.slice(0,5)}</text>`:''}</g>`).join('')}</svg>`}
function renderGeneralAnalysis(){const root=document.querySelector('#analysis');if(!root||root.hidden)return;const rows=auditedRows(),totalSpend=rows.reduce((sum,row)=>sum+row.performance.spend,0),campaigns=rows.flatMap(row=>(row.performance.campaigns||[]).map(campaign=>({...campaign,accountId:row.account.id,accountName:row.account.name}))),auditedResults=campaigns.filter(campaign=>campaign.results!=null),totalResults=auditedResults.reduce((sum,campaign)=>sum+campaign.results,0),generalCost=totalResults>0?totalSpend/totalResults:null;
  document.querySelector('#analysisPeriod').textContent=`${globalPeriod.from.toLocaleDateString('pt-BR')} até ${globalPeriod.to.toLocaleDateString('pt-BR')} • ${rows.length} de ${selectedAccountIds.size} contas reconciliadas`;
  document.querySelector('#analysisKpis').innerHTML=kpiMarkup([{label:'Investimento auditado',value:brl(totalSpend),note:'Soma das contas reconciliadas'},{label:'Resultados auditáveis',value:auditedResults.length?num(totalResults):'—',note:'Somente action types confirmados'},{label:'Custo por resultado',value:generalCost==null?'—':brl(generalCost),note:'Investimento ÷ resultados'},{label:'Cobertura da auditoria',value:`${rows.length}/${selectedAccountIds.size}`,note:'Contas concluídas no filtro'}]);
  const daily=new Map();rows.forEach(({performance})=>(performance.daily||[]).filter(day=>day.reconciled).forEach(day=>daily.set(day.date,(daily.get(day.date)||0)+Number(day.account_spend))));document.querySelector('#spendTrendChart').innerHTML=trendChart([...daily].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({id:date,label:parseDate(date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),value})));
  const shares=rows.map(({account,performance})=>({id:account.id,label:account.name,value:performance.spend,color:account.color})).sort((a,b)=>b.value-a.value);document.querySelector('#accountShareChart').innerHTML=barChart(shares,brl,analysisAccountSelection);
  const objectiveTotals=new Map();campaigns.forEach(campaign=>objectiveTotals.set(campaign.objective,(objectiveTotals.get(campaign.objective)||0)+campaign.spend));document.querySelector('#objectiveChart').innerHTML=barChart([...objectiveTotals].map(([label,value],index)=>({id:label,label,value,color:chartPalette[index%chartPalette.length]})).sort((a,b)=>b.value-a.value),brl);
  const visible=analysisAccountSelection?rows.filter(row=>row.account.id===analysisAccountSelection):rows;document.querySelector('#analysisRanking').innerHTML=visible.length?`<table class="analysis-ranking-table"><thead><tr><th>Conta</th><th class="number">Investimento</th><th class="number">Resultados</th><th class="number">Custo/resultado</th><th>Auditoria</th></tr></thead><tbody>${visible.sort((a,b)=>b.performance.spend-a.performance.spend).map(({account,performance})=>{const valid=(performance.campaigns||[]).filter(campaign=>campaign.results!=null),results=valid.reduce((sum,campaign)=>sum+campaign.results,0),cost=results?performance.spend/results:null;return `<tr class="${analysisAccountSelection===account.id?'selected':''}"><td><strong>${escapeHtml(account.name)}</strong></td><td class="number">${brl(performance.spend)}</td><td class="number">${valid.length?num(results):'—'}</td><td class="number">${cost==null?'—':brl(cost)}</td><td><span class="audit-chip">Reconciliada</span></td></tr>`}).join('')}</tbody></table>`:emptyChart('Nenhuma conta reconciliada neste período.');
  root.querySelectorAll('#accountShareChart [data-chart-id]').forEach(button=>button.onclick=()=>{analysisAccountSelection=analysisAccountSelection===button.dataset.chartId?null:button.dataset.chartId;renderGeneralAnalysis()});root.querySelectorAll('#objectiveChart [data-chart-id]').forEach(button=>button.onclick=()=>{button.classList.toggle('selected')});document.querySelector('#resetAnalysisSelection').hidden=!analysisAccountSelection;
}
function ensureAccountAnalysisUI(){const modalToolbar=document.querySelector('.modal-toolbar'),campaignSection=document.querySelector('.campaign-section');if(!modalToolbar||!campaignSection||document.querySelector('.modal-tabs'))return;const tabs=document.createElement('div');tabs.className='modal-tabs';tabs.innerHTML='<button class="active" type="button" data-account-tab="campaigns">Campanhas</button><button type="button" data-account-tab="analysis">Análise</button>';modalToolbar.before(tabs);campaignSection.id='campaignTabPanel';const panel=document.createElement('div');panel.className='account-analysis';panel.id='accountAnalysisPanel';panel.hidden=true;panel.innerHTML='<div class="account-analysis-head"><div><h3>Análise da conta</h3><p id="accountAnalysisPeriod"></p></div><span class="audit-chip pending" id="accountAnalysisAudit">Auditoria pendente</span></div><div class="analysis-kpis" id="accountAnalysisKpis"></div><div class="analysis-grid"><article class="chart-card chart-wide"><div class="chart-head"><div><h3>Campanhas por investimento</h3><p>Clique para destacar uma campanha.</p></div></div><div class="interactive-chart" id="campaignSpendChart"></div></article><article class="chart-card"><div class="chart-head"><div><h3>Resultados por objetivo</h3><p>Somente resultados retornados pela Meta.</p></div></div><div class="interactive-chart" id="campaignObjectiveChart"></div></article><article class="chart-card"><div class="chart-head"><div><h3>Eficiência</h3><p>Custo por resultado auditado.</p></div></div><div class="interactive-chart" id="campaignEfficiencyChart"></div></article><article class="chart-card chart-wide"><div class="chart-head"><div><h3>Comparação histórica de até 90 dias</h3><p>Critérios por campanhas do mesmo objetivo; nenhuma ação é automática.</p></div></div><div id="historicalRecommendations"></div></article></div><div class="analysis-pending"><strong>Leitura responsável</strong><span>Campanhas sem resultados auditáveis permanecem sem classificação. Recomendações exigem amostra mínima e comparação com campanhas do mesmo tipo de resultado.</span></div>';campaignSection.after(panel);tabs.querySelectorAll('button').forEach(button=>button.onclick=()=>setAccountTab(button.dataset.accountTab));}
function setAccountTab(tab){activeAccountTab=tab;document.querySelectorAll('[data-account-tab]').forEach(button=>button.classList.toggle('active',button.dataset.accountTab===tab));document.querySelector('#campaignTabPanel').hidden=tab!=='campaigns';document.querySelector('#accountAnalysisPanel').hidden=tab!=='analysis';if(tab==='analysis'){renderAccountAnalysis();loadHistorical90()}}
function historicalPeriod(){const to=new Date(NOW);to.setDate(to.getDate()-1);const from=new Date(to);from.setDate(from.getDate()-89);return {from,to,key:`${iso(from)}|${iso(to)}`}}
async function loadHistorical90(){if(!selectedAccount)return;const period=historicalPeriod(),id=selectedAccount.id;if(HISTORICAL_90_DATA[id])return renderAccountAnalysis();const target=document.querySelector('#historicalRecommendations');if(target)target.innerHTML=emptyChart('Auditando os últimos 90 dias na Meta...');try{const response=await fetch(`/api/meta-spend?from=${iso(period.from)}&to=${iso(period.to)}&accounts=${encodeURIComponent(id)}`);if(!response.ok)throw new Error();const payload=await response.json(),row=payload.accounts?.[id];HISTORICAL_90_DATA[id]=row?.reconciled?row:{error:true};renderAccountAnalysis()}catch(error){HISTORICAL_90_DATA[id]={error:true};renderAccountAnalysis()}}
function recommendationFor(campaign,peerMedian){if(campaign.results==null)return {tone:'pending',label:'Auditoria incompleta',reason:'Resultado não retornado para o action type esperado.'};if(campaign.results===0)return {tone:'danger',label:'Manter pausada / revisar',reason:'Houve investimento e nenhum resultado no período.'};if(peerMedian==null)return {tone:'pending',label:'Amostra insuficiente',reason:'Não há campanhas comparáveis do mesmo objetivo.'};const paused=(campaign.effective_status||campaign.status)==='PAUSED';if(paused&&campaign.results>=5&&campaign.cost_per_result<=peerMedian*.8)return {tone:'good',label:'Candidata a reativação',reason:`Ao menos 5 resultados e custo 20% ou mais abaixo da mediana ${brl(peerMedian)}.`};if(paused&&campaign.results>=3&&campaign.cost_per_result<=peerMedian*1.15)return {tone:'warning',label:'Testar nova versão',reason:`Histórico competitivo; republicar como teste controlado, sem duplicação automática.`};if(campaign.cost_per_result>peerMedian*1.5)return {tone:'danger',label:'Revisar antes de investir',reason:`Custo mais de 50% acima da mediana ${brl(peerMedian)}.`};return {tone:'neutral',label:paused?'Manter em observação':'Manter e acompanhar',reason:`Custo dentro da faixa comparável à mediana ${brl(peerMedian)}.`}}
function renderHistoricalRecommendations(){const target=document.querySelector('#historicalRecommendations');if(!target||!selectedAccount)return;const raw=HISTORICAL_90_DATA[selectedAccount.id];if(!raw)return target.innerHTML=emptyChart('Abra esta aba para iniciar a auditoria histórica.');if(raw.error)return target.innerHTML=emptyChart('Não foi possível reconciliar o histórico de 90 dias; nenhuma recomendação foi gerada.');const campaigns=raw.campaigns||[],medians={};[...new Set(campaigns.map(campaign=>campaign.objective_label))].forEach(objective=>medians[objective]=median(campaigns.filter(campaign=>campaign.objective_label===objective&&campaign.results>0&&campaign.cost_per_result!=null).map(campaign=>Number(campaign.cost_per_result))));const ranked=campaigns.map(campaign=>({...campaign,recommendation:recommendationFor(campaign,medians[campaign.objective_label])})).sort((a,b)=>({good:0,warning:1,neutral:2,danger:3,pending:4}[a.recommendation.tone]-({good:0,warning:1,neutral:2,danger:3,pending:4}[b.recommendation.tone]))).slice(0,20);target.innerHTML=ranked.length?`<table class="analysis-ranking-table"><thead><tr><th>Campanha</th><th>Objetivo</th><th class="number">Valor usado</th><th class="number">Resultados</th><th class="number">Custo/resultado</th><th>Critério</th></tr></thead><tbody>${ranked.map(campaign=>`<tr><td><strong>${escapeHtml(campaign.campaign_name)}</strong><small>${escapeHtml(campaign.last_delivery_date||'Data indisponível')}</small></td><td>${escapeHtml(campaign.objective_label)}</td><td class="number">${brl(campaign.spend)}</td><td class="number">${campaign.results==null?'—':num(campaign.results)}</td><td class="number">${campaign.cost_per_result==null?'—':brl(campaign.cost_per_result)}</td><td><span class="recommendation ${campaign.recommendation.tone}" title="${escapeHtml(campaign.recommendation.reason)}">${escapeHtml(campaign.recommendation.label)}</span></td></tr>`).join('')}</tbody></table>`:emptyChart('Nenhuma campanha teve veiculação nos últimos 90 dias.');}
function renderAccountAnalysis(){const panel=document.querySelector('#accountAnalysisPanel');if(!panel||panel.hidden||!selectedAccount)return;const from=parseDate(document.querySelector('#dateFrom').value),to=parseDate(document.querySelector('#dateTo').value),performance=performanceForPeriod(selectedAccount,from,to),campaigns=performance.complete?(performance.campaigns||[]):[],resultCampaigns=campaigns.filter(campaign=>campaign.results!=null),results=resultCampaigns.reduce((sum,campaign)=>sum+campaign.results,0),cost=results?performance.spend/results:null;document.querySelector('#accountAnalysisPeriod').textContent=`${from.toLocaleDateString('pt-BR')} até ${to.toLocaleDateString('pt-BR')}`;const audit=document.querySelector('#accountAnalysisAudit');audit.textContent=performance.complete?'Reconciliada com a Meta':'Auditoria pendente';audit.classList.toggle('pending',!performance.complete);document.querySelector('#accountAnalysisKpis').innerHTML=kpiMarkup([{label:'Valor usado',value:performance.complete?brl(performance.spend):'—',note:'Total oficial da conta'},{label:'Resultados',value:resultCampaigns.length?num(results):'—',note:'Action types confirmados'},{label:'Custo/resultado',value:cost==null?'—':brl(cost),note:'Média ponderada'},{label:'Campanhas',value:performance.complete?num(campaigns.length):'—',note:'Com veiculação no período'}]);document.querySelector('#campaignSpendChart').innerHTML=barChart(campaigns.map(campaign=>({id:campaign.id,label:campaign.name,fullLabel:campaign.name,value:campaign.spend})).sort((a,b)=>b.value-a.value).slice(0,12),brl,accountAnalysisCampaignSelection);const objectiveResults=new Map();resultCampaigns.forEach(campaign=>objectiveResults.set(campaign.objective,(objectiveResults.get(campaign.objective)||0)+campaign.results));document.querySelector('#campaignObjectiveChart').innerHTML=barChart([...objectiveResults].map(([label,value])=>({id:label,label,value})).sort((a,b)=>b.value-a.value),num);document.querySelector('#campaignEfficiencyChart').innerHTML=barChart(campaigns.filter(campaign=>campaign.costPerResult!=null).map(campaign=>({id:campaign.id,label:campaign.name,fullLabel:campaign.name,value:campaign.costPerResult})).sort((a,b)=>a.value-b.value).slice(0,10),brl,accountAnalysisCampaignSelection);panel.querySelectorAll('#campaignSpendChart [data-chart-id],#campaignEfficiencyChart [data-chart-id]').forEach(button=>button.onclick=()=>{accountAnalysisCampaignSelection=accountAnalysisCampaignSelection===button.dataset.chartId?null:button.dataset.chartId;renderAccountAnalysis()});renderHistoricalRecommendations()}
function showDashboardView(view){const analysis=document.querySelector('#analysis'),mainSections=[document.querySelector('#summaryCards'),document.querySelector('#accounts')];analysis.hidden=view!=='analysis';mainSections.forEach(section=>section.hidden=view==='analysis');document.querySelectorAll('.sidebar nav a').forEach(link=>link.classList.toggle('active',view==='analysis'?link.id==='analysisNav':link.id!=='analysisNav'&&((view==='accounts'&&link.getAttribute('href')==='#accounts')||(view==='overview'&&link.getAttribute('href')==='#'))));if(view==='analysis'){renderGeneralAnalysis();loadAuditedPeriod(globalPeriod.from,globalPeriod.to);loadHistoricalForSelectedAccounts()}}
async function loadHistoricalForSelectedAccounts(){const period=historicalPeriod(),missing=[...selectedAccountIds].filter(id=>!HISTORICAL_90_DATA[id]);if(!missing.length)return;try{const response=await fetch(`/api/meta-spend?from=${iso(period.from)}&to=${iso(period.to)}&accounts=${encodeURIComponent(missing.join(','))}`);if(!response.ok)return;const payload=await response.json();missing.forEach(id=>HISTORICAL_90_DATA[id]=payload.accounts?.[id]?.reconciled?payload.accounts[id]:{error:true})}catch(error){}}
ensureAccountAnalysisUI();document.querySelector('#analysisNav').onclick=event=>{event.preventDefault();showDashboardView('analysis')};document.querySelectorAll('.sidebar nav a:not(#analysisNav)').forEach(link=>{if(link.getAttribute('href')==='#'||link.getAttribute('href')==='#accounts')link.onclick=event=>{event.preventDefault();showDashboardView(link.getAttribute('href')==='#accounts'?'accounts':'overview')}});document.querySelector('#resetAnalysisSelection')?.addEventListener('click',()=>{analysisAccountSelection=null;renderGeneralAnalysis()});
const originalStoreAuditPayload=storeAuditPayload;storeAuditPayload=function(key,payload){originalStoreAuditPayload(key,payload);renderGeneralAnalysis();renderAccountAnalysis()};const originalRenderModal=renderModal;renderModal=function(){originalRenderModal();renderAccountAnalysis()};
function renderGeneralHistorical(){const target=document.querySelector('#generalHistoricalRecommendations');if(!target)return;const available=accounts.filter(account=>selectedAccountIds.has(account.id)).map(account=>({account,raw:HISTORICAL_90_DATA[account.id]}));if(available.some(row=>!row.raw)){target.innerHTML=emptyChart('Auditando até 90 dias de campanhas das contas selecionadas...');return}const recommendations=[];available.filter(row=>!row.raw.error).forEach(({account,raw})=>{const campaigns=raw.campaigns||[],medians={};[...new Set(campaigns.map(campaign=>campaign.objective_label))].forEach(objective=>medians[objective]=median(campaigns.filter(campaign=>campaign.objective_label===objective&&campaign.results>0&&campaign.cost_per_result!=null).map(campaign=>Number(campaign.cost_per_result))));campaigns.forEach(campaign=>recommendations.push({account,...campaign,recommendation:recommendationFor(campaign,medians[campaign.objective_label])}))});const order={good:0,warning:1,danger:2},priority=recommendations.filter(row=>Object.hasOwn(order,row.recommendation.tone)).sort((a,b)=>order[a.recommendation.tone]-order[b.recommendation.tone]).slice(0,25);target.innerHTML=priority.length?`<table class="analysis-ranking-table"><thead><tr><th>Conta / campanha</th><th>Objetivo</th><th class="number">Valor usado</th><th class="number">Resultados</th><th class="number">Custo/resultado</th><th>Recomendação</th></tr></thead><tbody>${priority.map(row=>`<tr><td><strong>${escapeHtml(row.account.name)}</strong><small>${escapeHtml(row.campaign_name)} • última veiculação ${escapeHtml(row.last_delivery_date||'indisponível')}</small></td><td>${escapeHtml(row.objective_label)}</td><td class="number">${brl(row.spend)}</td><td class="number">${row.results==null?'—':num(row.results)}</td><td class="number">${row.cost_per_result==null?'—':brl(row.cost_per_result)}</td><td><span class="recommendation ${row.recommendation.tone}" title="${escapeHtml(row.recommendation.reason)}">${escapeHtml(row.recommendation.label)}</span></td></tr>`).join('')}</tbody></table>`:emptyChart('Nenhuma campanha atingiu os critérios de ação no histórico auditado.')}
loadHistoricalForSelectedAccounts=async function(){const period=historicalPeriod(),missing=[...selectedAccountIds].filter(id=>!HISTORICAL_90_DATA[id]);if(!missing.length)return renderGeneralHistorical();try{const response=await fetch(`/api/meta-spend?from=${iso(period.from)}&to=${iso(period.to)}&accounts=${encodeURIComponent(missing.join(','))}`);if(!response.ok)throw new Error();const payload=await response.json();missing.forEach(id=>HISTORICAL_90_DATA[id]=payload.accounts?.[id]?.reconciled?payload.accounts[id]:{error:true})}catch(error){missing.forEach(id=>HISTORICAL_90_DATA[id]={error:true})}finally{renderGeneralHistorical()}};
const baseRenderGeneralAnalysis=renderGeneralAnalysis;renderGeneralAnalysis=function(){baseRenderGeneralAnalysis();renderGeneralHistorical()};
/* Análise detalhada por conta e período, baseada em breakdowns auditados. */
const ANALYSIS_BREAKDOWN_CACHE={};
let monitoredAnalysisAccounts=[],analysisSelectedAccount='',analysisFrom=null,analysisTo=null,analysisLoading=false,analysisComparedAccountIds=new Set();
const ANALYSIS_PRESET_KEY='hurtz-analysis-comparison-presets-v1',ANALYSIS_SELECTION_KEY='hurtz-analysis-comparison-selection-v1';
function readAnalysisPresets(){try{return JSON.parse(localStorage.getItem(ANALYSIS_PRESET_KEY)||'{}')}catch{return {}}}
function renderAnalysisAccountOptions(){const target=document.querySelector('#analysisAccountOptions');target.innerHTML=monitoredAnalysisAccounts.map(account=>`<label><input type="checkbox" value="${account.id}" ${analysisComparedAccountIds.has(account.id)?'checked':''}><span>${escapeHtml(account.name)}</span></label>`).join('');document.querySelector('#analysisAccountsButton').textContent=`Contas comparadas (${analysisComparedAccountIds.size})`}
function refreshAnalysisPresets(){const select=document.querySelector('#analysisSavedPreset'),presets=readAnalysisPresets();select.innerHTML='<option value="">Filtros salvos</option>'+Object.keys(presets).map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}
function applyAnalysisAccountChecks(){const checked=[...document.querySelectorAll('#analysisAccountOptions input:checked')].map(input=>input.value);if(checked.length<2){alert('Selecione pelo menos duas contas para comparar.');return false}analysisComparedAccountIds=new Set(checked);localStorage.setItem(ANALYSIS_SELECTION_KEY,JSON.stringify(checked));renderAnalysisAccountOptions();return true}
function analysisClosedRange(days=7){const to=new Date(NOW);to.setDate(to.getDate()-1);const from=new Date(to);from.setDate(from.getDate()-(days-1));return {from,to}}
function setAnalysisRange(days,load=true,trigger=null){const range=analysisClosedRange(Number(days));analysisFrom=range.from;analysisTo=range.to;document.querySelector('#analysisDateFrom').value=iso(analysisFrom);document.querySelector('#analysisDateTo').value=iso(analysisTo);document.querySelectorAll('[data-analysis-range]').forEach(button=>button.classList.toggle('active',button.dataset.analysisRange===String(days)));if(load)return loadDetailedAnalysis(trigger)}
function analysisKpiMarkup(items){return items.map(item=>`<div class="analysis-kpi">${metricLabel(item.label,item.help)}<strong>${item.value}</strong><small>${escapeHtml(item.note)}</small></div>`).join('')}
function addMetric(target,row){['spend','results','impressions','reach','clicks'].forEach(field=>target[field]=(target[field]||0)+Number(row[field]||0));return target}
function finishMetric(row){row.ctr=row.impressions?row.clicks/row.impressions*100:0;row.cpm=row.impressions?row.spend/row.impressions*1000:0;row.cpc=row.clicks?row.spend/row.clicks:0;row.cost_per_result=row.results?row.spend/row.results:null;return row}
function groupAnalysisRows(rows,keyFn,labelFields){const groups=new Map();rows.forEach(row=>{const key=keyFn(row),current=groups.get(key)||Object.fromEntries(labelFields.map(field=>[field,row[field]]));groups.set(key,addMetric(current,row))});return [...groups.values()].map(finishMetric)}
function mergeAnalysisAccounts(payload){const rows=Object.values(payload.accounts||{});if(!rows.length)return null;const account=finishMetric(rows.reduce((sum,row)=>addMetric(sum,row.account||{}),{}));return {reconciled:rows.every(row=>row.reconciled),account,age:{reconciled:rows.every(row=>row.age?.reconciled),rows:groupAnalysisRows(rows.flatMap(row=>row.age?.rows||[]),row=>row.age,['age'])},geography:{level:rows.every(row=>row.geography?.level==='city')?'city':'region',reconciled:rows.every(row=>row.geography?.reconciled),rows:groupAnalysisRows(rows.flatMap(row=>row.geography?.rows||[]),row=>row.region,['region'])},placement:{reconciled:rows.every(row=>row.placement?.reconciled),rows:groupAnalysisRows(rows.flatMap(row=>row.placement?.rows||[]),row=>`${row.publisher_platform}|${row.platform_position}`,['publisher_platform','platform_position'])},format:{reconciled:rows.every(row=>row.format?.reconciled),rows:groupAnalysisRows(rows.flatMap(row=>row.format?.rows||[]),row=>row.format,['format'])},ads:rows.flatMap(row=>row.ads||[])} }
function donutChart(items,valueKey,labelKey){const valid=items.filter(item=>Number(item[valueKey])>0),total=valid.reduce((sum,item)=>sum+Number(item[valueKey]),0);if(!total)return emptyChart('A Meta não retornou volume auditável para este gráfico.');let offset=0;const circles=valid.map((item,index)=>{const pct=Number(item[valueKey])/total*100,start=offset;offset+=pct;return `<circle class="donut-segment" cx="70" cy="70" r="50" fill="none" stroke="${chartPalette[index%chartPalette.length]}" stroke-width="22" pathLength="100" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="${-start}" tabindex="0"><title>${escapeHtml(item[labelKey])}: ${pct.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</title></circle>`}).join('');return `<div class="donut-layout"><svg class="donut-svg" viewBox="0 0 140 140" role="img">${circles}<circle cx="70" cy="70" r="35" fill="#fff"/><text x="70" y="67" text-anchor="middle">${num(total)}</text><text x="70" y="82" text-anchor="middle">total</text></svg><div class="donut-legend">${valid.map((item,index)=>{const pct=Number(item[valueKey])/total*100;return `<button type="button" title="${escapeHtml(item[labelKey])}: ${num(item[valueKey])}"><i style="background:${chartPalette[index%chartPalette.length]}"></i><span>${escapeHtml(item[labelKey])}</span><b>${pct.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</b></button>`}).join('')}</div></div>`}
const placementName=value=>({facebook:'Facebook',instagram:'Instagram',messenger:'Messenger',audience_network:'Audience Network',feed:'Feed',story:'Stories',reels:'Reels',marketplace:'Marketplace',video_feeds:'Feed de vídeo',instagram_explore:'Explorar',instagram_profile_feed:'Feed do perfil',right_hand_column:'Coluna direita',search:'Pesquisa',unknown:'Não informado'})[value]||String(value).replaceAll('_',' ');
const analysisObjectiveName=value=>({OUTCOME_LEADS:'Leads',OUTCOME_ENGAGEMENT:'Engajamento',OUTCOME_SALES:'Vendas',OUTCOME_TRAFFIC:'Tráfego',OUTCOME_AWARENESS:'Reconhecimento',OUTCOME_APP_PROMOTION:'Aplicativo'})[value]||String(value||'Objetivo não informado').replaceAll('_',' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase());
let analysisComparisons=[];
const inferredProduct=name=>{const text=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ');for(const [label,patterns] of [['Caminhão',[/CAMINH(?:AO|A0|O|ES)?/,/CAMIAO|CAMINAHO|CAMNHAO/]],['Maquinário',[/MAQ(?:UIN|IN|UNI)AR(?:IO|IA)?/,/MAQUINA|EQUIPAMENTO/]],['Imóvel',[/IMOV(?:EL|EIS|EU|IL)/,/APARTAM|TERRENO|CASA\b/]],['Veículo',[/VEIC(?:ULO|ULOS|OLO)/,/VEICL|VEICUO|AUTOMOVEL/]],['Carro',[/CARRO|CARROS/]],['Moto',[/MOTO|MOTOS/]],['Consórcio',[/CONSORC|CONSOC|CONSORSS/]]])if(patterns.some(pattern=>pattern.test(text)))return label;return 'Não identificado'};
function comparisonSummaries(ads){const groups=new Map();ads.filter(ad=>ad.spend>0&&ad.result_type!=='Sem resultado atribuído').forEach(ad=>{const key=`${ad.account_id}|${ad.objective}|${ad.result_type}`,row=groups.get(key)||{account_id:ad.account_id,objective:ad.objective,result_type:ad.result_type,spend:0,results:0,impressions:0,clicks:0,products:new Map(),formats:new Map(),ads:[]};row.spend+=Number(ad.spend)||0;row.results+=Number(ad.results)||0;row.impressions+=Number(ad.impressions)||0;row.clicks+=Number(ad.clicks)||0;const product=inferredProduct(ad.campaign_name),format=ad.format||'Não identificado';row.products.set(product,(row.products.get(product)||0)+Number(ad.spend||0));row.formats.set(format,(row.formats.get(format)||0)+Number(ad.spend||0));row.ads.push(ad);groups.set(key,row)});return [...groups.values()].map(row=>{const top=map=>[...map].sort((a,b)=>b[1]-a[1])[0]||['Não identificado',0];row.name=monitoredAnalysisAccounts.find(item=>item.id===row.account_id)?.name||row.account_id;row.cpl=row.results?row.spend/row.results:null;row.resultsPer100=row.spend?row.results/row.spend*100:0;row.ctr=row.impressions?row.clicks/row.impressions*100:0;[row.topProduct,row.topProductSpend]=top(row.products);[row.topFormat,row.topFormatSpend]=top(row.formats);row.productShare=row.spend?row.topProductSpend/row.spend*100:0;row.formatShare=row.spend?row.topFormatSpend/row.spend*100:0;return row})}
function buildComparisons(data){const summaries=comparisonSummaries(data.ads),groups=new Map(),pairs=[];summaries.forEach(row=>{const key=`${row.objective}|${row.result_type}`,list=groups.get(key)||[];list.push(row);groups.set(key,list)});groups.forEach(list=>{for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];if(a.results<1&&b.results<1)continue;const winner=a.cpl!=null&&(b.cpl==null||a.cpl<b.cpl)?a:b,loser=winner===a?b:a,efficiencyGap=loser.cpl&&winner.cpl?(loser.cpl-winner.cpl)/loser.cpl*100:100,pair={a,b,winner,loser,efficiencyGap};pair.hypothesis=winner.topProduct!==loser.topProduct?`${winner.name} concentrou ${winner.productShare.toFixed(0)}% da verba identificada em ${winner.topProduct}; ${loser.name}, em ${loser.topProduct}.`:winner.topFormat!==loser.topFormat?`${winner.name} concentrou ${winner.formatShare.toFixed(0)}% em ${winner.topFormat}; ${loser.name}, em ${loser.topFormat}.`:`As duas contas têm produto e formato predominantes semelhantes; investigue público, criativo e posicionamento.`;pairs.push(pair)}});return pairs.sort((x,y)=>y.efficiencyGap-x.efficiencyGap).slice(0,8)}
function miniMetric(label,a,b,lowerBetter=false){const max=Math.max(a||0,b||0,1),aw=lowerBetter&&a?Math.min(100,(Math.min(a,b)/a)*100):a/max*100,bw=lowerBetter&&b?Math.min(100,(Math.min(a,b)/b)*100):b/max*100;return `<div class="comparison-mini"><span>${label}</span><div><i style="width:${aw}%"></i><b>${typeof a==='number'?a.toLocaleString('pt-BR',{maximumFractionDigits:2}):a}</b></div><div><i style="width:${bw}%"></i><b>${typeof b==='number'?b.toLocaleString('pt-BR',{maximumFractionDigits:2}):b}</b></div></div>`}
function openComparisonModal(index){const pair=analysisComparisons[index];if(!pair)return;const {a,b,winner}=pair,modal=document.querySelector('#comparisonModal');document.querySelector('#comparisonModalTitle').textContent=`${a.name} × ${b.name}`;document.querySelector('#comparisonModalPeriod').textContent=`${analysisFrom.toLocaleDateString('pt-BR')} até ${analysisTo.toLocaleDateString('pt-BR')} • ${analysisObjectiveName(a.objective)} • ${a.result_type}`;document.querySelector('#comparisonModalBody').innerHTML=`<div class="comparison-detail-verdict"><span>Maior eficiência no período</span><strong>${escapeHtml(winner.name)}</strong><p>${escapeHtml(pair.hypothesis)}</p><small>Associação observada, não prova de causalidade. Produto inferido pelo nome da campanha.</small></div><div class="comparison-detail-grid">${[a,b].map(row=>`<article><h3>${escapeHtml(row.name)}</h3><dl><div><dt>Resultados</dt><dd>${num(row.results)}</dd></div><div><dt>Valor usado</dt><dd>${brl(row.spend)}</dd></div><div><dt>Custo/resultado</dt><dd>${row.cpl==null?'—':brl(row.cpl)}</dd></div><div><dt>Resultados/R$ 100</dt><dd>${row.resultsPer100.toLocaleString('pt-BR',{maximumFractionDigits:2})}</dd></div><div><dt>CTR</dt><dd>${row.ctr.toLocaleString('pt-BR',{maximumFractionDigits:2})}%</dd></div><div><dt>Produto predominante</dt><dd>${escapeHtml(row.topProduct)} (${row.productShare.toFixed(0)}%)</dd></div><div><dt>Formato predominante</dt><dd>${escapeHtml(row.topFormat)} (${row.formatShare.toFixed(0)}%)</dd></div></dl></article>`).join('')}</div><div class="comparison-evidence"><h3>Distribuição observada</h3>${miniMetric('Resultados',a.results,b.results)}${miniMetric('Custo/resultado',a.cpl||0,b.cpl||0,true)}${miniMetric('Resultados por R$ 100',a.resultsPer100,b.resultsPer100)}</div>`;modal.classList.add('open');modal.setAttribute('aria-hidden','false')}
function closeComparisonModal(){const modal=document.querySelector('#comparisonModal');modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
function renderObjectiveComparison(data){const target=document.querySelector('#analysisObjectiveComparison');if(analysisSelectedAccount!=='all'){target.innerHTML=emptyChart('Selecione “Comparar todas as contas” para visualizar comparações entre contas.');return}analysisComparisons=buildComparisons(data);target.innerHTML=analysisComparisons.length?`<div class="comparison-list">${analysisComparisons.map((pair,index)=>{const {a,b,winner}=pair,maxResults=Math.max(a.results,b.results,1);return `<button type="button" class="comparison-card" data-comparison-index="${index}"><div class="comparison-card-head"><span>${escapeHtml(analysisObjectiveName(a.objective))} • ${escapeHtml(a.result_type)}</span><b>Ver detalhes →</b></div><div class="comparison-sides"><div class="${winner===a?'winner':''}"><strong>${escapeHtml(a.name)}</strong><span>${num(a.results)} resultados • ${a.cpl==null?'—':brl(a.cpl)}</span><i><em style="width:${a.results/maxResults*100}%"></em></i></div><span class="comparison-arrow">${winner===a?'←':'→'}</span><div class="${winner===b?'winner':''}"><strong>${escapeHtml(b.name)}</strong><span>${num(b.results)} resultados • ${b.cpl==null?'—':brl(b.cpl)}</span><i><em style="width:${b.results/maxResults*100}%"></em></i></div></div><p><strong>${escapeHtml(winner.name)}</strong> gera ${winner.resultsPer100.toLocaleString('pt-BR',{maximumFractionDigits:1})} resultados/R$ 100. ${escapeHtml(pair.hypothesis)}</p><small>Produto inferido pelo nome • formato oficial da Meta • comparação normalizada pelo investimento</small></button>`}).join('')}</div>`:emptyChart('Não há duas contas com o mesmo objetivo e tipo de resultado auditado neste período.');target.querySelectorAll('[data-comparison-index]').forEach(button=>button.onclick=()=>openComparisonModal(Number(button.dataset.comparisonIndex)))}
function renderDetailedAnalysis(data){const chip=document.querySelector('#analysisAuditChip'),name=analysisSelectedAccount==='all'?'Visão consolidada':(monitoredAnalysisAccounts.find(item=>item.id===analysisSelectedAccount)?.name||'Conta');document.querySelector('#analysisPeriod').textContent=`${name} • ${analysisFrom.toLocaleDateString('pt-BR')} até ${analysisTo.toLocaleDateString('pt-BR')}`;if(!data){chip.textContent=analysisLoading?'Consultando a Meta...':'Dados indisponíveis';chip.classList.add('pending');document.querySelector('#analysisKpis').innerHTML='';document.querySelector('#analysisGeographyHighlight').innerHTML='';['analysisObjectiveComparison','analysisAgeChart','analysisFormatChart','analysisGeographyChart','analysisPlacementChart','analysisCtrChart','analysisCplChart','analysisAdsRanking'].forEach(id=>document.querySelector(`#${id}`).innerHTML=emptyChart(analysisLoading?'Carregando e auditando dados...':'Não foi possível carregar esta análise.'));return}chip.textContent=data.reconciled?'Gasto reconciliado com a Meta':'Auditoria pendente';chip.classList.toggle('pending',!data.reconciled);const m=data.account;document.querySelector('#analysisKpis').innerHTML=analysisKpiMarkup([
    {label:'Valor usado',value:brl(m.spend),note:'Investimento oficial',help:'Total usado pela conta no período selecionado.'},{label:'Resultados',value:num(m.results),note:'Formulários e conversas mapeados',help:'Resultados atribuídos aos action types confirmados da Meta.'},{label:'CPL / custo por resultado',value:m.cost_per_result==null?'—':brl(m.cost_per_result),note:'Média ponderada',help:'Valor usado dividido pelos resultados mapeados.'},{label:'Impressões',value:num(m.impressions),note:'Exibições dos anúncios',help:'Quantidade total de vezes que os anúncios foram exibidos.'},{label:'Alcance',value:num(m.reach),note:'Pessoas alcançadas',help:'Quantidade estimada de pessoas que viram os anúncios.'},{label:'Cliques',value:num(m.clicks),note:'Cliques registrados',help:'Cliques contabilizados pela Meta no período.'},{label:'CTR',value:`${Number(m.ctr).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`,note:'Cliques ÷ impressões',help:'Percentual de impressões que geraram clique.'},{label:'CPM',value:brl(m.cpm),note:'Custo por mil impressões',help:'Valor médio pago a cada mil impressões.'},{label:'CPC',value:brl(m.cpc),note:'Custo por clique',help:'Valor usado dividido pela quantidade de cliques.'}
  ]);renderObjectiveComparison(data);document.querySelector('#analysisAgeChart').innerHTML=data.age.reconciled?donutChart(data.age.rows,data.age.rows.some(row=>row.results>0)?'results':'impressions','age'):emptyChart('Idade ainda não reconciliou com o gasto da conta.');document.querySelector('#analysisFormatChart').innerHTML=data.format.reconciled?donutChart(data.format.rows,'impressions','format'):emptyChart('Formato ainda não reconciliou com o gasto da conta.');const geoRows=[...(data.geography?.rows||[])].sort((a,b)=>(b.results-a.results)||(b.spend-a.spend)),geoHasResults=geoRows.some(row=>row.results>0),geoTop=geoRows[0],geoLevel=data.geography?.level==='city'?'Cidade':'Região';document.querySelector('#analysisGeographyHighlight').innerHTML=data.geography?.reconciled&&geoTop?`<span>${geoLevel} em destaque</span><strong>${escapeHtml(geoTop.region)}</strong><small>${geoHasResults?`${num(geoTop.results)} resultados • ${geoTop.cost_per_result==null?'Custo indisponível':brl(geoTop.cost_per_result)+' por resultado'}`:`${brl(geoTop.spend)} usados • sem resultado atribuído`}</small>`:'';document.querySelector('#analysisGeographyChart').innerHTML=data.geography?.reconciled?barChart(geoRows.slice(0,15).map(row=>({id:row.region,label:row.region,value:geoHasResults?row.results:row.spend,fullLabel:`${row.region} • ${num(row.results)} resultados • ${brl(row.spend)} usados • CTR ${Number(row.ctr).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`})),geoHasResults?num:brl):emptyChart('Localização ainda não reconciliou com o gasto da conta.');const placements=data.placement.rows.map(row=>({...row,label:`${placementName(row.publisher_platform)} • ${placementName(row.platform_position)}`})).sort((a,b)=>b.spend-a.spend);document.querySelector('#analysisPlacementChart').innerHTML=data.placement.reconciled?barChart(placements.map(row=>({id:row.label,label:row.label,value:row.spend,fullLabel:`${row.label} • ${num(row.results)} resultados • CTR ${row.ctr.toFixed(2)}%`})),brl):emptyChart('Posicionamentos ainda não reconciliaram com o gasto da conta.');document.querySelector('#analysisCtrChart').innerHTML=data.format.reconciled?barChart(data.format.rows.map(row=>({id:row.format,label:row.format,value:row.ctr})).sort((a,b)=>b.value-a.value),value=>`${Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`):emptyChart('CTR por formato aguardando auditoria.');document.querySelector('#analysisCplChart').innerHTML=data.age.reconciled?barChart(data.age.rows.filter(row=>row.cost_per_result!=null).map(row=>({id:row.age,label:row.age,value:row.cost_per_result})).sort((a,b)=>a.value-b.value),brl):emptyChart('CPL por idade aguardando auditoria.');const ads=[...data.ads].filter(ad=>ad.spend>0).sort((a,b)=>(b.results-a.results)||(a.cost_per_result??Infinity)-(b.cost_per_result??Infinity)).slice(0,30);document.querySelector('#analysisAdsRanking').innerHTML=ads.length?`<div class="analysis-table-scroll"><table class="analysis-ranking-table"><thead><tr><th>Anúncio</th><th>Formato</th><th class="number">Valor usado</th><th class="number">Resultados</th><th class="number">CPL</th><th class="number">CTR</th><th class="number">CPM</th></tr></thead><tbody>${ads.map(ad=>{const accountName=monitoredAnalysisAccounts.find(item=>item.id===ad.account_id)?.name||ad.account_id;return `<tr><td><span class="ranking-account-name">${escapeHtml(accountName)}</span><strong>${escapeHtml(ad.ad_name||'Sem nome')}</strong><small>ID ${escapeHtml(ad.ad_id)}</small></td><td>${escapeHtml(ad.format)}</td><td class="number">${brl(ad.spend)}</td><td class="number">${num(ad.results)}</td><td class="number">${ad.cost_per_result==null?'—':brl(ad.cost_per_result)}</td><td class="number">${Number(ad.ctr).toLocaleString('pt-BR',{maximumFractionDigits:2})}%</td><td class="number">${brl(ad.cpm)}</td></tr>`}).join('')}</tbody></table></div>`:emptyChart('Nenhum anúncio teve entrega no período.');document.querySelector('#analysisNotice span').textContent=data.reconciled&&data.age.reconciled&&data.geography?.reconciled&&data.placement.reconciled&&data.format.reconciled?'Conta, anúncios, idade, localização, posicionamento e formato reconciliaram com o valor usado da Meta.':'Algum breakdown ainda não reconciliou; o gráfico correspondente foi bloqueado.'}
const analysisCacheKey=id=>`${iso(analysisFrom)}|${iso(analysisTo)}|${id}`;
async function loadDetailedAnalysis(trigger=null,showGlobal=true){if(!analysisSelectedAccount||!analysisFrom||!analysisTo)return;const ids=analysisSelectedAccount==='all'?[...analysisComparedAccountIds]:[analysisSelectedAccount];if(!ids.length)return;const cachedPayload={accounts:{}},missing=[];ids.forEach(id=>{const cached=ANALYSIS_BREAKDOWN_CACHE[analysisCacheKey(id)];if(cached)cachedPayload.accounts[id]=cached;else missing.push(id)});if(!missing.length)return renderDetailedAnalysis(mergeAnalysisAccounts(cachedPayload));const progressButton=trigger||document.querySelector('#applyAnalysisFilter');if(showGlobal)setButtonLoading(progressButton,true,'Analisando...');analysisLoading=true;renderDetailedAnalysis(null);try{const response=await fetch(`/api/meta-analysis?from=${iso(analysisFrom)}&to=${iso(analysisTo)}&accounts=${encodeURIComponent(missing.join(','))}`);if(!response.ok)throw new Error('Falha ao consultar os breakdowns da Meta');const payload=await response.json();Object.entries(payload.accounts||{}).forEach(([id,row])=>ANALYSIS_BREAKDOWN_CACHE[analysisCacheKey(id)]=row);ids.forEach(id=>{const cached=ANALYSIS_BREAKDOWN_CACHE[analysisCacheKey(id)];if(cached)cachedPayload.accounts[id]=cached});analysisLoading=false;renderDetailedAnalysis(mergeAnalysisAccounts(cachedPayload))}catch(error){analysisLoading=false;renderDetailedAnalysis(null)}finally{if(showGlobal)setButtonLoading(progressButton,false)}}
async function initializeDetailedAnalysis(){if(monitoredAnalysisAccounts.length)return;try{const response=await fetch('/api/meta-monitor-config');const payload=await response.json();monitoredAnalysisAccounts=payload.accounts||[];const select=document.querySelector('#analysisAccountSelect');select.innerHTML='<option value="all">Comparar todas as contas</option>'+monitoredAnalysisAccounts.map(item=>`<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');let saved=[];try{saved=JSON.parse(localStorage.getItem(ANALYSIS_SELECTION_KEY)||'[]')}catch{}const allowed=new Set(monitoredAnalysisAccounts.map(item=>item.id));analysisComparedAccountIds=new Set(saved.filter(id=>allowed.has(id)));if(analysisComparedAccountIds.size<2)analysisComparedAccountIds=new Set(allowed);analysisSelectedAccount='all';select.value=analysisSelectedAccount;renderAnalysisAccountOptions();refreshAnalysisPresets();setAnalysisRange(7,false);loadDetailedAnalysis(null,false)}catch(error){renderDetailedAnalysis(null)}}
renderGeneralAnalysis=function(){if(!document.querySelector('#analysis').hidden)initializeDetailedAnalysis()};
showDashboardView=function(view){const analysis=document.querySelector('#analysis'),reports=document.querySelector('#reports'),mainSections=[document.querySelector('#summaryCards'),document.querySelector('#accounts')],special=view==='analysis'||view==='reports';document.querySelector('main>header').hidden=special;analysis.hidden=view!=='analysis';reports.hidden=view!=='reports';mainSections.forEach(section=>section.hidden=special);document.querySelectorAll('.sidebar nav a').forEach(link=>link.classList.toggle('active',(view==='analysis'&&link.id==='analysisNav')||(view==='reports'&&link.id==='reportsNav')||(view==='accounts'&&link.getAttribute('href')==='#accounts')||(view==='overview'&&link.getAttribute('href')==='#')));if(view==='analysis')initializeDetailedAnalysis();if(view==='reports')initializeReports()};
let reportInitialized=false,reportLottieAnimation=null;
function showReportLoader(show){const loader=document.querySelector('#reportLoader');loader.hidden=!show;if(show)reportLottieAnimation?.play();else reportLottieAnimation?.stop()}
function initializeReportAnimation(){if(reportLottieAnimation||!window.lottie)return;reportLottieAnimation=window.lottie.loadAnimation({container:document.querySelector('#reportLottie'),renderer:'svg',loop:true,autoplay:false,path:'report-loader.json'})}
async function initializeReports(){if(reportInitialized)return;reportInitialized=true;initializeReportAnimation();const yesterday=new Date(NOW);yesterday.setDate(yesterday.getDate()-1);document.querySelector('#reportDateFrom').value=iso(yesterday);document.querySelector('#reportDateTo').value=iso(yesterday);try{const response=await fetch('/api/meta-monitor-config'),payload=await response.json();document.querySelector('#reportAccountOptions').innerHTML=(payload.accounts||[]).map(account=>`<label><input type="checkbox" value="${account.id}"><span>${escapeHtml(account.name)}</span></label>`).join('')}catch{document.querySelector('#reportStatus').textContent='Não foi possível carregar as contas monitoradas.'}}
function syncReportAccountsWithDashboard(){
  const root=document.querySelector('#reportAccountOptions');
  if(!root)return;
  const scoped=accounts.filter(account=>selectedAccountIds.has(account.id));
  root.innerHTML=scoped.map(account=>`<label><input type="checkbox" value="${account.id}" checked><span>${escapeHtml(account.name)}</span></label>`).join('');
  document.querySelector('#reportToggleAccounts').textContent=scoped.length?'Limpar seleção':'Selecionar todas';
  const status=document.querySelector('#reportStatus');
  if(status&&!scoped.length)status.textContent='O filtro principal não possui contas selecionadas.';
}
const initializeReportsFromMonitor=initializeReports;
initializeReports=async function(){
  if(!reportInitialized)await initializeReportsFromMonitor();
  syncReportAccountsWithDashboard();
};
function reportGroupName(campaign){const product=inferredProduct(campaign.campaign_name||campaign.name),text=String(campaign.campaign_name||campaign.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(),objective=String(campaign.objective_label||campaign.objective||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(),channel=/WHATS|MENSAG|CONVERS/.test(text+' '+objective)?'WHATSAPP':/FORM|LEAD/.test(text+' '+objective)?'FORMULÁRIO':'RESULTADO NÃO IDENTIFICADO';return `${product.toUpperCase()} - ${channel}`}
function reportCampaignCity(text){const normalized=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();if(/\bCANAA(?:\s+DOS\s+CARAJAS)?\b/.test(normalized))return 'CANAÃ';if(/\b(?:PARAUAPEBAS|PARAUPEBAS)\b/.test(normalized))return 'PARAUAPEBAS';return ''}
const reportGroupNameByProductChannel=reportGroupName;
reportGroupName=function(campaign){const base=reportGroupNameByProductChannel(campaign),city=reportCampaignCity(campaign.campaign_name||campaign.name);return city?`${base} - ${city}`:base};
function reportGroupsForRow(row){const groups=new Map();(row.campaigns||[]).filter(campaign=>Number(campaign.spend)>0).forEach(campaign=>{const name=reportGroupName(campaign),group=groups.get(name)||{name,spend:0,results:0,complete:true};group.spend+=Number(campaign.spend||0);if(campaign.results==null)group.complete=false;else group.results+=Number(campaign.results||0);groups.set(name,group)});return [...groups.values()]}
let currentReportContext=null,currentPngAccountId=null;
const reportMetric=(value,decimals=2)=>Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
function pngInsights(row,analysisRow,groups){const totalResults=groups.filter(group=>group.complete).reduce((sum,group)=>sum+group.results,0),overallCpl=totalResults?Number(row.spend)/totalResults:null,valid=groups.filter(group=>group.complete&&group.results>0),best=[...valid].sort((a,b)=>(a.spend/a.results)-(b.spend/b.results))[0],worst=[...valid].sort((a,b)=>(b.spend/b.results)-(a.spend/a.results))[0],zero=groups.find(group=>group.complete&&group.results===0&&group.spend>0),ctr=Number(analysisRow?.account?.ctr||0);let good=best?`${best.name} liderou a eficiência, com ${num(best.results)} resultados a ${brl(best.spend/best.results)} por resultado.`:totalResults?`A conta confirmou ${num(totalResults)} resultados com investimento total de ${brl(row.spend)}.`:'Não houve resultado confirmado suficiente para destacar um grupo.';if(ctr>=2)good+=` O CTR de ${ctr.toLocaleString('pt-BR',{maximumFractionDigits:2})}% reforça boa atração dos anúncios.`;let improve;if(zero)improve=`${zero.name} consumiu ${brl(zero.spend)} sem resultado confirmado. Revisar antes de ampliar o investimento.`;else if(worst&&overallCpl&&worst.spend/worst.results>overallCpl*1.25)improve=`${worst.name} ficou acima do CPL médio da conta. Revisar criativo, público e distribuição antes de escalar.`;else if(ctr>0&&ctr<1)improve=`CTR de ${ctr.toLocaleString('pt-BR',{maximumFractionDigits:2})}% indica baixa atração. Priorizar novos criativos e mensagens de abertura.`;else improve='Manter a estrutura eficiente e testar variações controladas de criativo, público e posicionamento sem elevar o CPL.';return {good,improve,totalResults,overallCpl,ctr}}
function roundRect(ctx,x,y,w,h,r,fill,stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function fitCanvasText(ctx,text,maxWidth,startSize,weight='700',family='Arial'){let size=startSize;do{ctx.font=`${weight} ${size}px ${family}`;if(ctx.measureText(String(text)).width<=maxWidth||size<=10)break;size-=1}while(size>10);return size}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){const words=String(text).split(/\s+/),lines=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;if(lines.length===maxLines-1)break}else line=test}if(line&&lines.length<maxLines)lines.push(line);if(words.length&&lines.length===maxLines){while(ctx.measureText(lines[maxLines-1]+'…').width>maxWidth)lines[maxLines-1]=lines[maxLines-1].slice(0,-1);lines[maxLines-1]+='…'}lines.forEach((value,index)=>ctx.fillText(value,x,y+index*lineHeight));return lines.length}
function drawReportIcon(ctx,type,cx,cy,color,scale=1){ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};if(type==='calendar'){ctx.strokeRect(-18,-15,36,32);line(-18,-5,18,-5);line(-10,-20,-10,-11);line(10,-20,10,-11)}else if(type==='campaign'){ctx.beginPath();ctx.moveTo(-18,15);ctx.lineTo(-18,-5);ctx.lineTo(0,-22);ctx.lineTo(18,-5);ctx.lineTo(18,15);ctx.stroke();ctx.strokeRect(-5,3,10,12);line(-11,-2,-11,7);line(11,-2,11,7);line(0,-22,0,-29)}else if(type==='people'){[-15,0,15].forEach((x,index)=>{ctx.beginPath();ctx.arc(x,index===1?-8:-4,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x,index===1?13:15,index===1?12:10,Math.PI,0);ctx.fill()})}else if(type==='target'){[18,11,4].forEach(radius=>{ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke()});line(-24,0,-12,0);line(12,0,24,0);line(0,-24,0,-12);line(0,12,0,24)}else if(type==='money'){ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.stroke();ctx.font='800 24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,1)}else if(type==='bank'){ctx.beginPath();ctx.moveTo(-20,-8);ctx.lineTo(0,-21);ctx.lineTo(20,-8);ctx.closePath();ctx.stroke();[-13,0,13].forEach(x=>line(x,-5,x,13));line(-22,17,22,17);line(-18,-5,18,-5)}else if(type==='document'){ctx.beginPath();ctx.moveTo(-14,-21);ctx.lineTo(8,-21);ctx.lineTo(16,-13);ctx.lineTo(16,22);ctx.lineTo(-14,22);ctx.closePath();ctx.stroke();line(8,-21,8,-12);line(8,-12,16,-12);line(-7,-3,9,-3);line(-7,5,9,5);line(-7,13,5,13)}else if(type==='clipboard'){ctx.beginPath();ctx.roundRect(-17,-18,34,40,4);ctx.stroke();ctx.beginPath();ctx.roundRect(-8,-24,16,10,4);ctx.fill();ctx.beginPath();ctx.moveTo(-8,3);ctx.lineTo(-2,9);ctx.lineTo(10,-5);ctx.stroke()}else if(type==='trend'){line(-20,20,-20,-18);line(-20,20,22,20);ctx.beginPath();ctx.moveTo(-14,12);ctx.lineTo(-2,1);ctx.lineTo(7,8);ctx.lineTo(20,-8);ctx.stroke();ctx.beginPath();ctx.moveTo(12,-8);ctx.lineTo(20,-8);ctx.lineTo(20,0);ctx.stroke()}ctx.restore()}
function drawReportSpecificIcon(ctx,type,cx,cy,color,scale=1){
  if(!['megaphone','layers'].includes(type))return drawReportIcon(ctx,type,cx,cy,color,scale);
  ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';
  if(type==='megaphone'){
    ctx.beginPath();ctx.moveTo(-21,-7);ctx.lineTo(-9,-7);ctx.lineTo(16,-19);ctx.lineTo(16,15);ctx.lineTo(-9,5);ctx.lineTo(-21,5);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-8,6);ctx.lineTo(-3,20);ctx.lineTo(7,17);ctx.lineTo(3,10);ctx.stroke();
    ctx.beginPath();ctx.moveTo(22,-12);ctx.lineTo(29,-17);ctx.moveTo(23,-1);ctx.lineTo(32,-1);ctx.moveTo(22,10);ctx.lineTo(29,15);ctx.stroke();
  }else{
    [[0,-13],[-7,0],[0,13]].forEach(([offsetX,offsetY])=>{ctx.beginPath();ctx.moveTo(-22+offsetX,offsetY);ctx.lineTo(offsetX,-11+offsetY);ctx.lineTo(22+offsetX,offsetY);ctx.lineTo(offsetX,11+offsetY);ctx.closePath();ctx.stroke()});
  }
  ctx.restore();
}
const loadCanvasImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src});
async function drawPngReport(accountId,displayName){const context=currentReportContext,row=context?.payload.accounts?.[accountId],analysisRow=context?.analysis?.accounts?.[accountId];if(!row)return;const canvas=document.querySelector('#pngReportCanvas'),ctx=canvas.getContext('2d'),groups=reportGroupsForRow(row),insights=pngInsights(row,analysisRow,groups),orange='#ff4b22',navy='#062b70',ink='#030316',muted='#566071',bg='#f8f9fc';ctx.clearRect(0,0,1600,900);ctx.fillStyle=bg;ctx.fillRect(0,0,1600,900);ctx.fillStyle=orange;ctx.fillRect(0,0,1600,8);ctx.fillStyle=ink;fitCanvasText(ctx,'Relatório de Performance',930,54,'800');ctx.fillText('Relatório de Performance',40,122);ctx.fillStyle=navy;const nameSize=fitCanvasText(ctx,displayName,900,29,'500');ctx.font=`500 ${nameSize}px Arial`;ctx.fillText(displayName,40,171);ctx.strokeStyle='#d7dce3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1232,52);ctx.lineTo(1232,204);ctx.stroke();try{const logo=await loadCanvasImage('hurtz-logo.png');ctx.drawImage(logo,1325,42,170,170)}catch{ctx.fillStyle=orange;ctx.font='800 28px Arial';ctx.fillText('HURTZ',1360,135)}const period=`${context.from.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})} a ${context.to.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})}`;ctx.fillStyle=orange;ctx.font='700 25px Arial';ctx.fillText('▣',62,248);ctx.fillStyle=ink;ctx.font='700 16px Arial';ctx.fillText('Período:',101,245);ctx.font='400 15px Arial';ctx.fillText(period,178,245);const productNames=[...new Set(groups.map(group=>group.name.split(' - ')[0]).filter(name=>name!=='NÃO IDENTIFICADO'))].join(' • ')||'NÃO IDENTIFICADO';ctx.fillStyle=orange;ctx.font='700 24px Arial';ctx.fillText('⌂',430,248);ctx.fillStyle=ink;ctx.font='700 16px Arial';ctx.fillText('Campanhas:',468,245);ctx.fillStyle=orange;const productSize=fitCanvasText(ctx,productNames,550,16,'800');ctx.font=`800 ${productSize}px Arial`;ctx.fillText(productNames,578,245);const cardXs=[40,260,480],cardLabels=['LEADS','CUSTO POR LEAD','VALOR GASTO'],cardValues=[num(insights.totalResults),insights.overallCpl==null?'—':brl(insights.overallCpl),brl(row.spend)];cardXs.forEach((x,index)=>{roundRect(ctx,x,276,204,374,10,'#fff','#edf0f4');ctx.fillStyle='#fff0eb';ctx.beginPath();ctx.arc(x+102,345,40,0,Math.PI*2);ctx.fill();ctx.fillStyle=orange;ctx.font='800 26px Arial';ctx.textAlign='center';ctx.fillText(index===0?'●●●':index===1?'◎':'◉',x+102,354);ctx.fillStyle=ink;ctx.font='800 14px Arial';ctx.fillText(cardLabels[index],x+102,430);ctx.strokeStyle='#ffaf97';ctx.beginPath();ctx.moveTo(x+64,458);ctx.lineTo(x+140,458);ctx.stroke();ctx.fillStyle=orange;const valueSize=fitCanvasText(ctx,cardValues[index],174,32,'800');ctx.font=`800 ${valueSize}px Arial`;ctx.fillText(cardValues[index],x+102,515);ctx.fillRect(x+40,596,30,34);ctx.fillRect(x+85,572,30,58);ctx.fillRect(x+130,545,30,85);ctx.textAlign='left'});ctx.fillStyle=navy;ctx.beginPath();ctx.arc(750,326,22,0,Math.PI*2);ctx.fill();ctx.fillStyle=navy;ctx.font='800 20px Arial';ctx.fillText('DESEMPENHO POR GRUPO DE CAMPANHA',783,334);roundRect(ctx,728,372,245,254,12,'#fff','#f0f2f5');ctx.fillStyle=navy;ctx.font='800 15px Arial';ctx.fillText('TOTAL CONFIRMADO',748,414);ctx.fillStyle=orange;ctx.font='800 60px Arial';ctx.fillText(num(insights.totalResults),748,488);ctx.font='700 22px Arial';ctx.fillText('leads',875,488);ctx.strokeStyle='#ffac91';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(748,511);ctx.lineTo(950,511);ctx.stroke();ctx.fillStyle=ink;ctx.font='400 15px Arial';wrapCanvasText(ctx,`Investimento total de ${brl(row.spend)} no período analisado.`,748,555,190,20,3);const gx=1005,gy=385,gw=545,gh=230,columns=groups.length>4?2:1,rows=Math.max(1,Math.ceil(groups.length/columns)),cellW=gw/columns,cellH=gh/rows,labelSize=Math.max(11,Math.min(17,19-groups.length));groups.forEach((group,index)=>{const col=Math.floor(index/rows),rowIndex=index%rows,x=gx+col*cellW,y=gy+rowIndex*cellH;ctx.fillStyle=ink;const size=fitCanvasText(ctx,group.name,cellW-145,labelSize,'800');ctx.font=`800 ${size}px Arial`;ctx.fillText(group.name,x,y+30);ctx.fillStyle=navy;ctx.font='400 11px Arial';ctx.fillText('LEADS',x+cellW-135,y+10);ctx.fillStyle=orange;ctx.font='800 18px Arial';ctx.fillText(group.complete?num(group.results):'—',x+cellW-135,y+35);ctx.fillStyle=navy;ctx.font='400 11px Arial';ctx.fillText('CPL',x+cellW-72,y+10);ctx.fillStyle=orange;const cpl=group.complete&&group.results?brl(group.spend/group.results):'—';fitCanvasText(ctx,cpl,70,18,'800');ctx.fillText(cpl,x+cellW-72,y+35)});const panels=[{x:40,w:590,title:'Resumo do período',text:`${displayName} gerou ${num(insights.totalResults)} resultados confirmados, com investimento total de ${brl(row.spend)} entre ${context.from.toLocaleDateString('pt-BR')} e ${context.to.toLocaleDateString('pt-BR')}.`},{x:646,w:450,title:'O que está bom',text:insights.good},{x:1112,w:448,title:'O que pode melhorar',text:insights.improve}];panels.forEach((panel,index)=>{roundRect(ctx,panel.x,670,panel.w,172,10,'#fff','#dde3ea');ctx.fillStyle=index===0?navy:'#fff0eb';ctx.beginPath();ctx.arc(panel.x+69,755,40,0,Math.PI*2);ctx.fill();ctx.fillStyle=ink;ctx.font='800 16px Arial';ctx.fillText(panel.title,panel.x+134,720);ctx.fillStyle=orange;ctx.fillRect(panel.x+134,735,42,2);ctx.fillStyle=ink;ctx.font='700 14px Arial';wrapCanvasText(ctx,panel.text,panel.x+134,770,panel.w-160,19,4)});ctx.strokeStyle='#ffb49d';ctx.beginPath();ctx.moveTo(135,875);ctx.lineTo(648,875);ctx.moveTo(952,875);ctx.lineTo(1465,875);ctx.stroke();ctx.fillStyle='#414855';ctx.font='400 13px Arial';ctx.fillText('Relatório desenvolvido por',686,880);ctx.fillStyle=orange;ctx.font='700 13px Arial';ctx.fillText('Hurtz',862,880)}
const drawPngReportWithoutReferenceIcons=drawPngReport;
drawPngReport=async function(accountId,displayName){
  await drawPngReportWithoutReferenceIcons(accountId,displayName);
  const canvas=document.querySelector('#pngReportCanvas');
  const ctx=canvas.getContext('2d');
  const orange='#ff4b22',navy='#062b70',reportBg='#f8f9fc',peach='#fff0eb';

  // Substitui os caracteres provisórios do cabeçalho por ícones vetoriais.
  ctx.fillStyle=reportBg;
  ctx.fillRect(48,210,45,50);
  ctx.fillRect(416,210,45,50);
  drawReportIcon(ctx,'calendar',73,238,orange,.72);
  drawReportSpecificIcon(ctx,'megaphone',441,238,orange,.62);

  // Ícones dos indicadores principais, seguindo a linguagem da referência.
  [40,260,480].forEach((x,index)=>{
    ctx.fillStyle=peach;
    ctx.beginPath();
    ctx.arc(x+102,345,40,0,Math.PI*2);
    ctx.fill();
    drawReportIcon(ctx,index===0?'people':index===1?'target':'money',x+102,345,orange,.9);
  });

  // O CPL usa um gráfico circular, enquanto volume e investimento usam barras.
  ctx.fillStyle='#fff';
  ctx.fillRect(282,533,160,106);
  ctx.lineWidth=22;
  ctx.strokeStyle='#f2e2dc';
  ctx.beginPath();
  ctx.arc(362,584,42,0,Math.PI*2);
  ctx.stroke();
  ctx.strokeStyle=orange;
  ctx.beginPath();
  ctx.arc(362,584,42,-Math.PI/2,Math.PI*1.15);
  ctx.stroke();
  ctx.lineWidth=1;

  ctx.fillStyle=navy;
  ctx.beginPath();
  ctx.arc(750,326,22,0,Math.PI*2);
  ctx.fill();
  drawReportSpecificIcon(ctx,'layers',750,326,'#fff',.52);

  // Organiza grupos, leads e CPL em uma grade comparável linha a linha.
  const reportRow=currentReportContext?.payload.accounts?.[accountId];
  const gridGroups=reportRow?reportGroupsForRow(reportRow):[];
  const gridX=992,gridY=370,gridW=558,gridH=256,headerH=36;
  const campaignCol=340,leadsCol=105;
  ctx.fillStyle=reportBg;ctx.fillRect(gridX-4,gridY-4,gridW+8,gridH+8);
  roundRect(ctx,gridX,gridY,gridW,gridH,8,'#fff','#dfe4eb');
  ctx.fillStyle='#f4f6f9';ctx.fillRect(gridX+1,gridY+1,gridW-2,headerH);
  ctx.strokeStyle='#dfe4eb';ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(gridX+campaignCol,gridY);ctx.lineTo(gridX+campaignCol,gridY+gridH);
  ctx.moveTo(gridX+campaignCol+leadsCol,gridY);ctx.lineTo(gridX+campaignCol+leadsCol,gridY+gridH);
  ctx.moveTo(gridX,gridY+headerH);ctx.lineTo(gridX+gridW,gridY+headerH);
  ctx.stroke();
  ctx.fillStyle=navy;ctx.font='800 11px Arial';
  ctx.fillText('GRUPO DE CAMPANHA',gridX+14,gridY+23);
  ctx.textAlign='center';
  ctx.fillText('LEADS',gridX+campaignCol+leadsCol/2,gridY+23);
  ctx.fillText('CPL',gridX+campaignCol+leadsCol+(gridW-campaignCol-leadsCol)/2,gridY+23);
  ctx.textAlign='left';
  if(gridGroups.length){
    const rowH=(gridH-headerH)/gridGroups.length;
    gridGroups.forEach((group,index)=>{
      const top=gridY+headerH+index*rowH,centerY=top+rowH/2;
      if(index){ctx.strokeStyle='#dfe4eb';ctx.beginPath();ctx.moveTo(gridX,top);ctx.lineTo(gridX+gridW,top);ctx.stroke()}
      ctx.fillStyle='#030316';
      const labelSize=fitCanvasText(ctx,group.name,campaignCol-28,Math.min(14,Math.max(9,rowH*.28)),'800');
      ctx.font=`800 ${labelSize}px Arial`;ctx.fillText(group.name,gridX+14,centerY+labelSize*.35);
      ctx.fillStyle=orange;ctx.textAlign='center';ctx.font=`800 ${Math.min(17,Math.max(11,rowH*.34))}px Arial`;
      ctx.fillText(group.complete?num(group.results):'—',gridX+campaignCol+leadsCol/2,centerY+5);
      const groupCpl=group.complete&&group.results?brl(group.spend/group.results):'—';
      ctx.fillText(groupCpl,gridX+campaignCol+leadsCol+(gridW-campaignCol-leadsCol)/2,centerY+5);
      ctx.textAlign='left';
    });
  }else{
    ctx.fillStyle='#566071';ctx.font='400 14px Arial';ctx.textAlign='center';
    ctx.fillText('Nenhuma campanha com gasto no período.',gridX+gridW/2,gridY+headerH+106);
    ctx.textAlign='left';
  }

  const panelIcons=[
    {x:109,type:'document',background:navy,color:'#fff'},
    {x:715,type:'clipboard',background:peach,color:navy},
    {x:1181,type:'trend',background:peach,color:navy}
  ];
  panelIcons.forEach(icon=>{
    ctx.fillStyle=icon.background;
    ctx.beginPath();
    ctx.arc(icon.x,755,40,0,Math.PI*2);
    ctx.fill();
    drawReportIcon(ctx,icon.type,icon.x,755,icon.color,.9);
  });

  // Centraliza o crédito e posiciona a marca imediatamente após o texto.
  const footerLead='Relatório desenvolvido por',footerBrand='Hurtz';
  ctx.fillStyle=reportBg;ctx.fillRect(670,860,250,30);
  ctx.font='400 13px Arial';const leadWidth=ctx.measureText(footerLead).width;
  ctx.font='700 13px Arial';const brandWidth=ctx.measureText(footerBrand).width;
  const footerX=800-(leadWidth+6+brandWidth)/2;
  ctx.fillStyle='#414855';ctx.font='400 13px Arial';ctx.fillText(footerLead,footerX,880);
  ctx.fillStyle=orange;ctx.font='700 13px Arial';ctx.fillText(footerBrand,footerX+leadWidth+6,880);
};

async function openPngReport(accountId){currentPngAccountId=accountId;const row=currentReportContext?.payload.accounts?.[accountId];if(!row)return;const input=document.querySelector('#pngReportName');input.value=row.name||row.id;document.querySelector('#pngReportModal').classList.add('open');document.querySelector('#pngReportModal').setAttribute('aria-hidden','false');await drawPngReport(accountId,input.value)}
function closePngReport(){document.querySelector('#pngReportModal').classList.remove('open');document.querySelector('#pngReportModal').setAttribute('aria-hidden','true')}
function renderReport(payload,from,to,selectedIds){const rows=selectedIds.map(id=>payload.accounts?.[id]).filter(Boolean),failures=[];rows.forEach(row=>{const campaigns=row.campaigns||[],sum=campaigns.reduce((total,campaign)=>total+Number(campaign.spend||0),0);if(!row.reconciled||Math.abs(Number(row.spend||0)-sum)>=.01)failures.push(row.name||row.id)});if(rows.length!==selectedIds.length)failures.push('Conta sem retorno da API');if(failures.length)throw new Error(`Relatório bloqueado: auditoria incompleta em ${failures.join(', ')}.`);const accountHtml=rows.map(row=>{const groups=reportGroupsForRow(row);return `<section class="report-account"><div class="report-account-head"><div><span>CONTA DE ANÚNCIO</span><h3>${escapeHtml(row.name||row.id)}</h3></div><div class="report-account-head-actions"><b>Auditada com a Meta</b><button type="button" data-create-png="${row.id}">Criar relatório em PNG</button></div></div><div class="report-groups">${groups.map(group=>`<article><strong>${escapeHtml(group.name)}</strong><div><span>LEADS</span><b>${group.complete?num(group.results):'Sem dados de lead'}</b></div><div><span>Custo por lead</span><b>${group.complete&&group.results?brl(group.spend/group.results):'—'}</b></div>${!group.complete?'<small>Coleta de resultado incompleta; nenhum valor foi estimado.</small>':''}</article>`).join('')||'<p>Nenhuma campanha teve gasto no período.</p>'}</div><footer><span>Valor gasto</span><strong>${brl(row.spend)}</strong></footer></section>`}).join('');return `<div class="report-document"><header><div><p>HURTZ • PERFORMANCE</p><h1>Relatório Meta Ads</h1><span>Período: ${from.toLocaleDateString('pt-BR')} até ${to.toLocaleDateString('pt-BR')}</span></div><button type="button" id="printReportButton">Baixar / imprimir PDF</button></header>${accountHtml}<div class="report-audit-footer">Dados da API Meta • ${rows.length} conta(s) reconciliada(s) • valores não estimados</div></div>`}
async function createReport(event){const selectedIds=[...document.querySelectorAll('#reportAccountOptions input:checked')].map(input=>input.value),from=parseDate(document.querySelector('#reportDateFrom').value),to=parseDate(document.querySelector('#reportDateTo').value),status=document.querySelector('#reportStatus'),output=document.querySelector('#reportOutput');if(!selectedIds.length)return alert('Selecione pelo menos uma conta.');if(from>to)return alert('A data inicial deve ser anterior à data final.');showReportLoader(true);event.currentTarget.disabled=true;status.textContent='Consultando e auditando campanhas...';try{const query=`from=${iso(from)}&to=${iso(to)}&accounts=${encodeURIComponent(selectedIds.join(','))}`,[spendResponse,analysisResponse]=await Promise.all([fetch(`/api/meta-spend?${query}`),fetch(`/api/meta-analysis?${query}`)]),payload=await spendResponse.json(),analysis=await analysisResponse.json();if(!spendResponse.ok)throw new Error(payload.error||'Falha ao consultar a Meta.');if(!analysisResponse.ok)throw new Error(analysis.error||'Falha ao consultar métricas para o relatório PNG.');const analysisFailures=selectedIds.filter(id=>!analysis.accounts?.[id]?.reconciled);if(analysisFailures.length)throw new Error('Relatório PNG bloqueado: métricas analíticas ainda não reconciliadas.');currentReportContext={payload,analysis,from,to,selectedIds};output.innerHTML=renderReport(payload,from,to,selectedIds);output.hidden=false;status.textContent=`Relatório pronto: ${selectedIds.length} conta(s), período ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}.`;document.querySelector('#printReportButton').onclick=()=>window.print();output.querySelectorAll('[data-create-png]').forEach(button=>button.onclick=()=>openPngReport(button.dataset.createPng))}catch(error){output.hidden=true;status.textContent=error.message}finally{showReportLoader(false);event.currentTarget.disabled=false}}
document.querySelector('#analysisAccountSelect').onchange=event=>{analysisSelectedAccount=event.target.value;document.querySelector('#analysisAccountsButton').hidden=analysisSelectedAccount!=='all';document.querySelector('#analysisAccountPanel').hidden=true;loadDetailedAnalysis()};document.querySelectorAll('[data-analysis-range]').forEach(button=>button.onclick=event=>setAnalysisRange(button.dataset.analysisRange,true,event.currentTarget));document.querySelector('#applyAnalysisFilter').onclick=event=>{const from=parseDate(document.querySelector('#analysisDateFrom').value),to=parseDate(document.querySelector('#analysisDateTo').value);if(from>to)return alert('A data inicial não pode ser posterior à data final.');analysisFrom=from;analysisTo=to;document.querySelectorAll('[data-analysis-range]').forEach(button=>button.classList.remove('active'));return loadDetailedAnalysis(event.currentTarget)};
document.querySelector('#analysisAccountsButton').onclick=()=>{const panel=document.querySelector('#analysisAccountPanel');panel.hidden=!panel.hidden;renderAnalysisAccountOptions()};document.querySelector('#closeAnalysisAccounts').onclick=()=>document.querySelector('#analysisAccountPanel').hidden=true;document.querySelector('#analysisToggleAll').onclick=()=>{const boxes=[...document.querySelectorAll('#analysisAccountOptions input')],all=boxes.every(box=>box.checked);boxes.forEach(box=>box.checked=!all)};document.querySelector('#applyAnalysisAccounts').onclick=event=>{if(!applyAnalysisAccountChecks())return;document.querySelector('#analysisAccountPanel').hidden=true;loadDetailedAnalysis(event.currentTarget)};document.querySelector('#saveAnalysisPreset').onclick=()=>{const name=document.querySelector('#analysisPresetName').value.trim();if(!name)return alert('Digite um nome para o filtro.');const checked=[...document.querySelectorAll('#analysisAccountOptions input:checked')].map(input=>input.value);if(checked.length<2)return alert('Selecione pelo menos duas contas.');const presets=readAnalysisPresets();presets[name]=checked;localStorage.setItem(ANALYSIS_PRESET_KEY,JSON.stringify(presets));refreshAnalysisPresets();document.querySelector('#analysisSavedPreset').value=name};document.querySelector('#analysisSavedPreset').onchange=event=>{const ids=readAnalysisPresets()[event.target.value];if(!ids)return;document.querySelectorAll('#analysisAccountOptions input').forEach(input=>input.checked=ids.includes(input.value));document.querySelector('#analysisPresetName').value=event.target.value};document.querySelector('#deleteAnalysisPreset').onclick=()=>{const name=document.querySelector('#analysisSavedPreset').value;if(!name)return;const presets=readAnalysisPresets();delete presets[name];localStorage.setItem(ANALYSIS_PRESET_KEY,JSON.stringify(presets));document.querySelector('#analysisPresetName').value='';refreshAnalysisPresets()};
document.querySelector('#closeComparisonModal').onclick=closeComparisonModal;document.querySelector('#comparisonModal').onclick=event=>{if(event.target.id==='comparisonModal')closeComparisonModal()};
document.querySelector('#reportsNav').onclick=event=>{event.preventDefault();history.replaceState(null,'','#reports');showDashboardView('reports')};document.querySelector('#createReportButton').onclick=createReport;document.querySelector('#reportToggleAccounts').onclick=()=>{const boxes=[...document.querySelectorAll('#reportAccountOptions input')],all=boxes.length&&boxes.every(box=>box.checked);boxes.forEach(box=>box.checked=!all);document.querySelector('#reportToggleAccounts').textContent=all?'Selecionar todas':'Limpar seleção'};
document.querySelector('#closePngReport').onclick=closePngReport;document.querySelector('#pngReportModal').onclick=event=>{if(event.target.id==='pngReportModal')closePngReport()};document.querySelector('#updatePngReport').onclick=()=>drawPngReport(currentPngAccountId,document.querySelector('#pngReportName').value.trim()||'Conta de anúncio');document.querySelector('#downloadPngReport').onclick=async()=>{const name=document.querySelector('#pngReportName').value.trim()||'Conta de anúncio';await drawPngReport(currentPngAccountId,name);const canvas=document.querySelector('#pngReportCanvas'),slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'conta';canvas.toBlob(blob=>{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`relatorio-performance-${slug}-${iso(currentReportContext.from)}-a-${iso(currentReportContext.to)}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')};
function setReportLoaderProgress(done,total,detail='Conciliando campanhas com a Meta...'){
  const loader=document.querySelector('#reportLoader'),title=loader?.querySelector('strong'),description=loader?.querySelector('span');
  if(title)title.textContent=`${done} de ${total} relatórios auditados`;
  if(description)description.textContent=detail;
}
async function fetchReportBatch(accountIds,from,to){
  const query=`from=${iso(from)}&to=${iso(to)}&accounts=${encodeURIComponent(accountIds.join(','))}`;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),190000);
  try{
    const [spendResponse,analysisResponse]=await Promise.all([
      fetch(`/api/meta-spend?${query}`,{signal:controller.signal}),
      fetch(`/api/meta-analysis?${query}`,{signal:controller.signal})
    ]);
    const [spend,analysis]=await Promise.all([spendResponse.json(),analysisResponse.json()]);
    if(!spendResponse.ok)throw new Error(spend.error||'Falha ao consultar gastos e campanhas.');
    if(!analysisResponse.ok)throw new Error(analysis.error||'Falha ao consultar métricas analíticas.');
    const missing=accountIds.filter(id=>!spend.accounts?.[id]||!analysis.accounts?.[id]);
    if(missing.length)throw new Error(`A Meta não retornou ${missing.length} conta(s) deste lote.`);
    const unreconciled=accountIds.filter(id=>!spend.accounts[id].reconciled||!analysis.accounts[id].reconciled);
    if(unreconciled.length)throw new Error(`Auditoria divergente em ${unreconciled.length} conta(s) deste lote.`);
    return {spend,analysis};
  }catch(error){
    if(error.name==='AbortError')throw new Error('A consulta excedeu o limite de tempo. Tente novamente; os lotes concluídos permanecem identificados no contador.');
    throw error;
  }finally{clearTimeout(timeout)}
}
async function createReportInBatches(event){
  const button=event.currentTarget,selectedIds=[...document.querySelectorAll('#reportAccountOptions input:checked')].map(input=>input.value),from=parseDate(document.querySelector('#reportDateFrom').value),to=parseDate(document.querySelector('#reportDateTo').value),status=document.querySelector('#reportStatus'),output=document.querySelector('#reportOutput');
  if(!selectedIds.length)return alert('Selecione pelo menos uma conta.');
  if(from>to)return alert('A data inicial deve ser anterior à data final.');
  const batchSize=3,payload={accounts:{}},analysis={accounts:{}};
  let completed=0;
  button.disabled=true;output.hidden=true;setReportLoaderProgress(0,selectedIds.length,'Preparando o primeiro lote de contas...');showReportLoader(true);
  try{
    for(let index=0;index<selectedIds.length;index+=batchSize){
      const batch=selectedIds.slice(index,index+batchSize),number=Math.floor(index/batchSize)+1,totalBatches=Math.ceil(selectedIds.length/batchSize);
      status.textContent=`Auditando lote ${number} de ${totalBatches} (${completed} de ${selectedIds.length} contas concluídas)...`;
      setReportLoaderProgress(completed,selectedIds.length,`Consultando lote ${number} de ${totalBatches} • ${batch.length} conta(s)`);
      const result=await fetchReportBatch(batch,from,to);
      Object.assign(payload.accounts,result.spend.accounts);
      Object.assign(analysis.accounts,result.analysis.accounts);
      batch.forEach(id=>{const local=accounts.find(account=>account.id===id),row=payload.accounts[id];if(row&&local&&!row.name)row.name=local.name});
      completed+=batch.length;
      setReportLoaderProgress(completed,selectedIds.length,completed===selectedIds.length?'Montando os relatórios finais...':`Lote ${number} auditado. Preparando o próximo...`);
      if(completed<selectedIds.length)await new Promise(resolve=>setTimeout(resolve,450));
    }
    currentReportContext={payload,analysis,from,to,selectedIds};
    output.innerHTML=renderReport(payload,from,to,selectedIds);output.hidden=false;
    status.textContent=`Relatórios prontos: ${selectedIds.length} conta(s) auditadas, período ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}.`;
    document.querySelector('#printReportButton').onclick=()=>window.print();
    output.querySelectorAll('[data-create-png]').forEach(reportButton=>reportButton.onclick=()=>openPngReport(reportButton.dataset.createPng));
  }catch(error){
    output.hidden=true;status.textContent=`Criação interrompida após ${completed} de ${selectedIds.length} contas: ${error.message}`;
  }finally{showReportLoader(false);button.disabled=false}
}
function reportAccountName(id){return accounts.find(account=>account.id===id)?.name||id}
function renderReportRunSummary(total,ready,failures){
  const root=document.querySelector('#reportRunSummary');if(!root)return;
  root.hidden=false;
  root.innerHTML=`<span>Selecionadas <b>${total}</b></span><span class="success">Relatórios prontos <b>${ready}</b></span><span class="failed">Não passaram <b>${failures.length}</b></span>${failures.length?`<details><summary>Ver contas que não passaram</summary><ul>${failures.map(item=>`<li><b>${escapeHtml(item.name)}</b>: ${escapeHtml(item.reason)}</li>`).join('')}</ul></details>`:''}`;
}
function mergeReportBatch(payload,analysis,result,ids,successfulIds){
  Object.assign(payload.accounts,result.spend.accounts);Object.assign(analysis.accounts,result.analysis.accounts);
  ids.forEach(id=>{const local=accounts.find(account=>account.id===id),row=payload.accounts[id];if(row&&local&&!row.name)row.name=local.name;if(!successfulIds.includes(id))successfulIds.push(id)});
}
function setReportLoaderOutcome(ready,failed,processed,total,detail){
  const loader=document.querySelector('#reportLoader'),title=loader?.querySelector('strong'),description=loader?.querySelector('span');
  if(title)title.textContent=`${ready} prontos • ${failed} não passaram`;
  if(description)description.textContent=`${processed} de ${total} contas verificadas • ${detail}`;
}
async function createReportResilient(event){
  const button=event.currentTarget,selectedIds=[...document.querySelectorAll('#reportAccountOptions input:checked')].map(input=>input.value),from=parseDate(document.querySelector('#reportDateFrom').value),to=parseDate(document.querySelector('#reportDateTo').value),status=document.querySelector('#reportStatus'),output=document.querySelector('#reportOutput');
  if(!selectedIds.length)return alert('Selecione pelo menos uma conta.');
  if(from>to)return alert('A data inicial deve ser anterior à data final.');
  const payload={accounts:{}},analysis={accounts:{}},successfulIds=[],failures=[];let processed=0;
  button.disabled=true;output.hidden=true;renderReportRunSummary(selectedIds.length,0,[]);setReportLoaderOutcome(0,0,0,selectedIds.length,'validando contas monitoradas');showReportLoader(true);
  try{
    const config=await syncAccountsForAudit(selectedIds);
    const allowed=new Set((config.accounts||[]).map(account=>account.id));
    const eligible=[];
    selectedIds.forEach(id=>{if(allowed.has(id))eligible.push(id);else{failures.push({id,name:reportAccountName(id),reason:'Conta ainda não habilitada na lista de monitoramento auditado.'});processed++}});
    renderReportRunSummary(selectedIds.length,0,failures);setReportLoaderOutcome(0,failures.length,processed,selectedIds.length,'iniciando contas habilitadas');
    const batchSize=3,totalBatches=Math.ceil(eligible.length/batchSize);
    for(let index=0;index<eligible.length;index+=batchSize){
      const batch=eligible.slice(index,index+batchSize),number=Math.floor(index/batchSize)+1;
      status.textContent=`Auditando lote ${number} de ${totalBatches} • ${successfulIds.length} relatório(s) pronto(s) • ${failures.length} não passaram.`;
      setReportLoaderOutcome(successfulIds.length,failures.length,processed,selectedIds.length,`consultando lote ${number} de ${totalBatches}`);
      try{
        const result=await fetchReportBatch(batch,from,to);mergeReportBatch(payload,analysis,result,batch,successfulIds);processed+=batch.length;
      }catch(batchError){
        setReportLoaderOutcome(successfulIds.length,failures.length,processed,selectedIds.length,`isolando as ${batch.length} contas do lote ${number}`);
        for(const id of batch){
          try{const result=await fetchReportBatch([id],from,to);mergeReportBatch(payload,analysis,result,[id],successfulIds)}
          catch(error){failures.push({id,name:reportAccountName(id),reason:error.message})}
          processed++;renderReportRunSummary(selectedIds.length,successfulIds.length,failures);setReportLoaderOutcome(successfulIds.length,failures.length,processed,selectedIds.length,'validação individual em andamento');
          await new Promise(resolve=>setTimeout(resolve,250));
        }
      }
      renderReportRunSummary(selectedIds.length,successfulIds.length,failures);setReportLoaderOutcome(successfulIds.length,failures.length,processed,selectedIds.length,processed===selectedIds.length?'montando relatórios finais':'preparando próximo lote');
      if(processed<selectedIds.length)await new Promise(resolve=>setTimeout(resolve,450));
    }
    const auditedIds=successfulIds.filter(id=>{const row=payload.accounts[id],campaignSum=(row?.campaigns||[]).reduce((sum,campaign)=>sum+Number(campaign.spend||0),0),valid=row?.reconciled&&analysis.accounts[id]?.reconciled&&Math.abs(Number(row.spend||0)-campaignSum)<.01;if(!valid)failures.push({id,name:reportAccountName(id),reason:'A reconciliação final da conta não coincidiu com a soma das campanhas.'});return valid});
    renderReportRunSummary(selectedIds.length,auditedIds.length,failures);
    if(!auditedIds.length){output.hidden=true;status.textContent=`Nenhum relatório foi liberado. ${failures.length} conta(s) não passaram pela auditoria.`;return}
    currentReportContext={payload,analysis,from,to,selectedIds:auditedIds};
    output.innerHTML=renderReport(payload,from,to,auditedIds);output.hidden=false;
    status.textContent=`Processo concluído: ${auditedIds.length} relatório(s) pronto(s) e ${failures.length} conta(s) não passaram.`;
    document.querySelector('#printReportButton').onclick=()=>window.print();
    output.querySelectorAll('[data-create-png]').forEach(reportButton=>reportButton.onclick=()=>openPngReport(reportButton.dataset.createPng));
  }catch(error){status.textContent=`Falha geral antes da conclusão: ${error.message}`;renderReportRunSummary(selectedIds.length,successfulIds.length,failures)}
  finally{showReportLoader(false);button.disabled=false}
}
document.querySelector('#createReportButton').onclick=createReportResilient;
const renderReportWithoutAuditTooltip=renderReport;
renderReport=function(...args){return renderReportWithoutAuditTooltip(...args).replaceAll('<b>Auditada com a Meta</b>','<b class="report-audit-badge" tabindex="0" aria-label="Auditoria concluída com a Meta" data-tooltip="Auditoria concluída: o valor usado da conta foi comparado com a soma das campanhas retornadas pela API da Meta. Se houver divergência, o relatório é bloqueado.">Auditada com a Meta <span aria-hidden="true">ⓘ</span></b>')};
const renderReportWithoutBulkDownload=renderReport;
renderReport=function(...args){return renderReportWithoutBulkDownload(...args).replace('<button type="button" id="printReportButton">Baixar / imprimir PDF</button>','<div class="report-download-actions"><button type="button" id="downloadAllPngReports">Baixar todos em PNG (.zip)</button><button type="button" id="printReportButton">Baixar / imprimir PDF</button></div>')};
const reportDisplayNameOverrides=new Map();let pngReportMode='single';
function safeReportFileName(value){const clean=String(value||'Conta de anúncio').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').replace(/[. ]+$/g,'').trim();return clean||'Conta de anúncio'}
function canvasAsPngBlob(){return new Promise((resolve,reject)=>document.querySelector('#pngReportCanvas').toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar o PNG.')),'image/png'))}
function downloadBlob(blob,fileName){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
const openPngReportWithDefaultName=openPngReport;
openPngReport=async function(accountId){pngReportMode='single';document.querySelector('#bulkPngEditor').hidden=true;document.querySelector('#pngReportModalTitle').textContent='Relatório de Performance';document.querySelector('#downloadPngReport').textContent='Baixar PNG';await openPngReportWithDefaultName(accountId);const custom=reportDisplayNameOverrides.get(accountId);if(custom){document.querySelector('#pngReportName').value=custom;await drawPngReport(accountId,custom)}};
function renderBulkPngNames(){const root=document.querySelector('#bulkPngNames');root.innerHTML=(currentReportContext?.selectedIds||[]).map(id=>{const row=currentReportContext.payload.accounts[id],displayName=reportDisplayNameOverrides.get(id)||row?.name||id;return `<label class="bulk-png-name-row ${id===currentPngAccountId?'active':''}" data-bulk-png-row="${id}"><input maxlength="70" value="${escapeHtml(displayName)}" data-bulk-png-name="${id}" aria-label="Nome exibido para ${escapeHtml(row?.name||id)}"><button type="button" data-preview-png="${id}">Visualizar</button></label>`}).join('')}
async function previewBulkPng(accountId){const row=currentReportContext?.payload.accounts?.[accountId];if(!row)return;currentPngAccountId=accountId;const displayName=reportDisplayNameOverrides.get(accountId)||row.name||accountId;document.querySelector('#pngReportName').value=displayName;renderBulkPngNames();await drawPngReport(accountId,displayName)}
async function openBulkPngEditor(){if(!currentReportContext?.selectedIds?.length)return alert('Crie os relatórios auditados antes de preparar o ZIP.');pngReportMode='bulk';document.querySelector('#bulkPngEditor').hidden=false;document.querySelector('#pngReportModalTitle').textContent='Preparar relatórios em PNG';document.querySelector('#downloadPngReport').textContent='Baixar todos em ZIP';document.querySelector('#pngReportModal').classList.add('open');document.querySelector('#pngReportModal').setAttribute('aria-hidden','false');await previewBulkPng(currentReportContext.selectedIds[0])}
document.querySelector('#bulkPngNames').addEventListener('input',event=>{const id=event.target.dataset.bulkPngName;if(!id)return;reportDisplayNameOverrides.set(id,event.target.value.trim()||currentReportContext.payload.accounts[id]?.name||id);if(id===currentPngAccountId)document.querySelector('#pngReportName').value=event.target.value});
document.querySelector('#bulkPngNames').addEventListener('click',event=>{const button=event.target.closest('[data-preview-png]');if(button)previewBulkPng(button.dataset.previewPng)});
document.querySelector('#updatePngReport').onclick=async()=>{const displayName=document.querySelector('#pngReportName').value.trim()||'Conta de anúncio';reportDisplayNameOverrides.set(currentPngAccountId,displayName);if(pngReportMode==='bulk')renderBulkPngNames();await drawPngReport(currentPngAccountId,displayName)};
document.querySelector('#downloadPngReport').onclick=async event=>{if(pngReportMode==='bulk')return downloadAllPngReports(event.currentTarget);const displayName=document.querySelector('#pngReportName').value.trim()||'Conta de anúncio',row=currentReportContext?.payload.accounts?.[currentPngAccountId];reportDisplayNameOverrides.set(currentPngAccountId,displayName);await drawPngReport(currentPngAccountId,displayName);downloadBlob(await canvasAsPngBlob(),`${safeReportFileName(row?.name||currentPngAccountId)}.png`)};
async function downloadAllPngReports(button){
  if(!currentReportContext?.selectedIds?.length)return alert('Crie os relatórios auditados antes de baixar o ZIP.');
  if(!window.JSZip)return alert('O compactador de arquivos não foi carregado. Atualize a página e tente novamente.');
  const ids=currentReportContext.selectedIds,zip=new JSZip(),usedNames=new Set();button.disabled=true;showReportLoader(true);
  try{
    for(let index=0;index<ids.length;index++){
      const id=ids[index],row=currentReportContext.payload.accounts[id],displayName=reportDisplayNameOverrides.get(id)||row?.name||id,baseName=safeReportFileName(row?.name||id);let fileName=`${baseName}.png`,suffix=2;
      while(usedNames.has(fileName.toLocaleLowerCase('pt-BR')))fileName=`${baseName} (${suffix++}).png`;
      usedNames.add(fileName.toLocaleLowerCase('pt-BR'));
      setReportLoaderProgress(index,ids.length,`Gerando ${fileName}`);await drawPngReport(id,displayName);zip.file(fileName,await canvasAsPngBlob());
      setReportLoaderProgress(index+1,ids.length,index+1===ids.length?'Compactando os arquivos...':'Preparando o próximo PNG...');await new Promise(resolve=>setTimeout(resolve,35));
    }
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},metadata=>setReportLoaderProgress(ids.length,ids.length,`Compactando ZIP • ${Math.round(metadata.percent)}%`));
    downloadBlob(blob,`Relatórios Meta Ads - ${currentReportContext.from.toLocaleDateString('pt-BR').replaceAll('/','-')} a ${currentReportContext.to.toLocaleDateString('pt-BR').replaceAll('/','-')}.zip`);
  }catch(error){alert(`Não foi possível gerar o ZIP: ${error.message}`)}finally{showReportLoader(false);button.disabled=false}
}
document.addEventListener('click',event=>{const button=event.target.closest('#downloadAllPngReports');if(button)openBulkPngEditor()});
let alertsInitialized=false;
const ALERT_API_BASE=MONITOR_API_BASE;
const ALERT_SESSION_KEY=MONITOR_SESSION_KEY;
function showAlertLogin(message=''){document.querySelector('#alertLoginModal').hidden=false;document.querySelector('#alertLoginStatus').textContent=message;setTimeout(()=>document.querySelector('#alertLoginUser').focus(),50)}
function hideAlertLogin(){document.querySelector('#alertLoginModal').hidden=true;document.querySelector('#alertLoginPassword').value='';document.querySelector('#alertLoginStatus').textContent=''}
async function alertFetchJson(url,options={}){const token=localStorage.getItem(ALERT_SESSION_KEY);if(ALERT_API_BASE&&!token){showAlertLogin();throw new Error('Faça login para acessar o monitoramento.')}let response;try{response=await fetch(`${ALERT_API_BASE}${url}`,{...options,headers:{...(options.headers||{}),...(token?{Authorization:`Bearer ${token}`}:{})}})}catch{throw new Error('A API segura da VPS não respondeu.')}const type=response.headers.get('content-type')||'';if(response.status===401){localStorage.removeItem(ALERT_SESSION_KEY);showAlertLogin('Sua sessão expirou. Entre novamente.');throw new Error('Sessão expirada.')}if(!type.includes('application/json'))throw new Error('A API de monitoramento respondeu em formato inválido.');const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Falha na consulta.');return payload}
function alertKindLabel(kind){return ({daily_limit:'Limite diário',spend_velocity:'Ritmo de gasto',opportunity:'Oportunidade',test:'Teste',technical:'Monitoramento técnico'})[kind]||'Notificação'}
function alertTone(kind,severity){if(severity==='critical')return'critical';if(severity==='recommendation')return'recommendation';if(kind==='technical')return'technical';return'warning'}
function renderAlertHistory(payload){
  const history=payload.history||[],delivered=history.filter(item=>item.delivered).length,failed=history.filter(item=>!item.delivered).length,today=new Date().toLocaleDateString('en-CA'),todayCount=history.filter(item=>String(item.created_at||'').slice(0,10)===today).length;
  document.querySelector('#alertStats').innerHTML=[['Alertas hoje',todayCount],['Entregues',delivered],['Falhas',failed],['Última execução',payload.last_run?new Date(payload.last_run).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—']].map(([label,value])=>`<article class="alert-stat"><span>${label}</span><strong>${value}</strong></article>`).join('');
  const connection=document.querySelector('#alertConnection');connection.textContent=payload.evolution_configured?'Evolution API configurada':'Evolution API pendente';connection.classList.toggle('connected',payload.evolution_configured);
  document.querySelector('#alertPill').textContent=failed;
  document.querySelector('#alertHistory').innerHTML=history.length?`<div class="alert-history-list">${history.map(item=>`<article class="alert-event"><span class="alert-dot ${alertTone(item.kind,item.severity)}"></span><div><b>${alertKindLabel(item.kind)}</b><small>${escapeHtml(item.account_name||'Sistema')} • ${new Date(item.created_at).toLocaleString('pt-BR')}</small></div><div class="alert-event-message">${escapeHtml(item.message)}</div><span class="alert-delivery ${item.delivered?'':'failed'}">${item.delivered?(item.delivery==='dry-run'?'Validado sem envio':'Entregue'):'Falhou'}<small>${escapeHtml(item.delivery||'')}</small></span></article>`).join('')}</div>`:'<div class="alert-empty">Nenhuma notificação registrada. Salve as regras e faça um teste controlado.</div>';
  const config=payload.config||{};
  document.querySelector('#alertsEnabled').checked=Boolean(config.enabled);
  document.querySelector('#alertDryRun').checked=config.dry_run!==false;
  document.querySelector('#alertVelocity').checked=config.velocity_enabled!==false;
  document.querySelector('#alertRecommendations').checked=config.recommendations_enabled!==false;
  document.querySelector('#alertThresholds').value=(config.thresholds||[75,90,100,120]).join(', ');
  document.querySelector('#alertVelocityWindow').value=String(config.velocity_window_minutes||60);document.querySelector('#alertVelocityPercent').value=config.velocity_percent||100;
  document.querySelector('#alertWhatsAppPhone').value=config.evolution_phone||'';
  document.querySelector('#alertQuietStart').value=config.quiet_start||'21:00';document.querySelector('#alertQuietEnd').value=config.quiet_end||'07:00';document.querySelector('#alertSummaryTime').value=config.daily_summary_time||'19:30';
  if(config.evolution_instance){const instanceSelect=document.querySelector('#alertEvolutionInstance'),destination=document.querySelector('#whatsappDestination');instanceSelect.innerHTML=`<option value="${escapeHtml(config.evolution_instance)}">${escapeHtml(config.evolution_instance)}</option>`;document.querySelector('#alertEvolutionGroup').innerHTML=`<option value="${escapeHtml(config.evolution_group_jid||'')}">${escapeHtml(config.evolution_group_name||'Grupo configurado')}</option>`;destination.hidden=false;document.querySelector('#whatsappConnectionResult').textContent=`Número conectado e configurado para ${config.evolution_group_name||'o grupo selecionado'}.`;document.querySelector('#whatsappConnectionResult').className='whatsapp-connection-result success'}
}
async function loadAlerts(trigger=null){
  if(trigger)setButtonLoading(trigger,true,'Atualizando alertas...');
  try{renderAlertHistory(await alertFetchJson('/api/alerts'))}catch(error){document.querySelector('#alertConnection').textContent='API de monitoramento indisponível';document.querySelector('#alertHistory').innerHTML=`<div class="alert-empty">${escapeHtml(error.message)}</div>`}finally{if(trigger)setButtonLoading(trigger,false)}
}
function initializeAlerts(){if(ALERT_API_BASE&&!localStorage.getItem(ALERT_SESSION_KEY))return showAlertLogin();if(alertsInitialized)return loadAlerts();alertsInitialized=true;loadAlerts()}
document.querySelector('#alertLoginForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,status=document.querySelector('#alertLoginStatus'),username=document.querySelector('#alertLoginUser').value.trim(),password=document.querySelector('#alertLoginPassword').value;button.disabled=true;status.textContent='Entrando...';try{const response=await fetch(`${ALERT_API_BASE}/api/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})}),payload=await response.json();if(!response.ok)throw new Error(payload.error||'Não foi possível entrar.');localStorage.setItem(ALERT_SESSION_KEY,payload.token);location.reload()}catch(error){status.textContent=error.message||'Falha no login.'}finally{button.disabled=false}});
document.querySelector('#alertLogout').onclick=()=>{localStorage.removeItem(ALERT_SESSION_KEY);alertsInitialized=false;showAlertLogin('Acesso desconectado deste navegador.')};
document.querySelector('#alertSettings').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter,status=document.querySelector('#alertFormStatus'),thresholds=document.querySelector('#alertThresholds').value.split(',').map(value=>Number(value.trim())).filter(Number.isFinite);
  if(!thresholds.length)return status.textContent='Informe pelo menos um percentual válido.';
  const instanceSelect=document.querySelector('#alertEvolutionInstance'),groupSelect=document.querySelector('#alertEvolutionGroup'),config={enabled:document.querySelector('#alertsEnabled').checked,dry_run:document.querySelector('#alertDryRun').checked,velocity_enabled:document.querySelector('#alertVelocity').checked,velocity_window_minutes:Number(document.querySelector('#alertVelocityWindow').value),velocity_percent:Number(document.querySelector('#alertVelocityPercent').value),recommendations_enabled:document.querySelector('#alertRecommendations').checked,thresholds,quiet_start:document.querySelector('#alertQuietStart').value,quiet_end:document.querySelector('#alertQuietEnd').value,daily_summary_time:document.querySelector('#alertSummaryTime').value,evolution_phone:document.querySelector('#alertWhatsAppPhone').value,evolution_instance:instanceSelect.value,evolution_group_jid:groupSelect.value,evolution_group_name:groupSelect.selectedOptions[0]?.textContent||''};
  if(config.enabled&&(!config.evolution_instance||!config.evolution_group_jid))return status.textContent='Verifique um WhatsApp conectado e selecione o grupo antes de ativar.';
  setButtonLoading(button,true,'Salvando regras...');try{await alertFetchJson('/api/alerts/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});status.textContent='Configurações salvas na VPS.';await loadAlerts()}catch(error){status.textContent=error.message||'Falha ao salvar.'}finally{setButtonLoading(button,false)}
});
const alertTestModal=document.querySelector('#alertTestModal');
function currentAlertDestinationConfig(){const instanceSelect=document.querySelector('#alertEvolutionInstance'),groupSelect=document.querySelector('#alertEvolutionGroup');return{enabled:document.querySelector('#alertsEnabled').checked,dry_run:document.querySelector('#alertDryRun').checked,velocity_enabled:document.querySelector('#alertVelocity').checked,velocity_window_minutes:Number(document.querySelector('#alertVelocityWindow').value),velocity_percent:Number(document.querySelector('#alertVelocityPercent').value),recommendations_enabled:document.querySelector('#alertRecommendations').checked,thresholds:document.querySelector('#alertThresholds').value.split(',').map(value=>Number(value.trim())).filter(Number.isFinite),quiet_start:document.querySelector('#alertQuietStart').value,quiet_end:document.querySelector('#alertQuietEnd').value,daily_summary_time:document.querySelector('#alertSummaryTime').value,evolution_phone:document.querySelector('#alertWhatsAppPhone').value,evolution_instance:instanceSelect.value,evolution_group_jid:groupSelect.value,evolution_group_name:groupSelect.selectedOptions[0]?.textContent||''}}
function closeAlertTest(){alertTestModal.hidden=true;document.querySelector('#alertTestStatus').textContent=''}
document.querySelector('#sendAlertTest').onclick=()=>{const phone=document.querySelector('#alertWhatsAppPhone').value.replace(/\D/g,''),instance=document.querySelector('#alertEvolutionInstance').value,groupSelect=document.querySelector('#alertEvolutionGroup'),group=groupSelect.value,groupName=groupSelect.selectedOptions[0]?.textContent||'';if(!phone||!instance||!group)return document.querySelector('#alertFormStatus').textContent='Verifique o WhatsApp e selecione o grupo antes do teste.';document.querySelector('#alertTestPhone').textContent=phone;document.querySelector('#alertTestInstance').textContent=instance;document.querySelector('#alertTestGroup').textContent=groupName;document.querySelector('#alertTestMessage').value=`✅ Teste de alertas Hurtz\n\nA integração do Monitor Meta Ads com o grupo “${groupName}” está funcionando.\n\nEsta é uma mensagem de teste e nenhuma campanha foi alterada.`;alertTestModal.hidden=false};
document.querySelector('#closeAlertTest').onclick=closeAlertTest;document.querySelector('#cancelAlertTest').onclick=closeAlertTest;
document.querySelector('#confirmAlertTest').onclick=async event=>{const button=event.currentTarget,status=document.querySelector('#alertTestStatus'),message=document.querySelector('#alertTestMessage').value.trim(),config=currentAlertDestinationConfig();if(!message)return status.textContent='Digite a mensagem que será enviada.';if(!config.evolution_instance||!config.evolution_group_jid)return status.textContent='Selecione novamente a instância e o grupo.';setButtonLoading(button,true,'Enviando teste...');try{await alertFetchJson('/api/alerts/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});const payload=await alertFetchJson('/api/alerts/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});if(!payload.ok)throw new Error('A Evolution API não confirmou o envio.');document.querySelector('#alertFormStatus').textContent='Mensagem de teste enviada ao grupo.';closeAlertTest();await loadAlerts()}catch(error){status.textContent=error.message||'Falha no envio.'}finally{setButtonLoading(button,false)}};
document.querySelector('#checkWhatsAppPhone').onclick=async event=>{const button=event.currentTarget,result=document.querySelector('#whatsappConnectionResult'),phone=document.querySelector('#alertWhatsAppPhone').value.replace(/\D/g,''),destination=document.querySelector('#whatsappDestination'),instanceSelect=document.querySelector('#alertEvolutionInstance');destination.hidden=true;result.className='whatsapp-connection-result';setButtonLoading(button,true,'Verificando WhatsApp...');try{const payload=await alertFetchJson(`/api/evolution/phone?phone=${encodeURIComponent(phone)}`),connected=(payload.instances||[]).filter(item=>item.connected);if(!connected.length)throw new Error(payload.found?'O número existe, mas não está conectado agora.':'Esse número não foi encontrado na Evolution API.');instanceSelect.innerHTML=connected.map(item=>`<option value="${escapeHtml(item.instance)}">${escapeHtml(item.instance)} • ${escapeHtml(item.phone)}</option>`).join('');destination.hidden=false;result.textContent='WhatsApp conectado. Agora selecione o grupo que receberá os alertas.';result.classList.add('success');await loadEvolutionGroups(instanceSelect.value)}catch(error){result.textContent=error.message;result.classList.add('error')}finally{setButtonLoading(button,false)}};
async function loadEvolutionGroups(instance){const select=document.querySelector('#alertEvolutionGroup');select.innerHTML='<option value="">Buscando grupos...</option>';try{const payload=await alertFetchJson(`/api/evolution/groups?instance=${encodeURIComponent(instance)}`);select.innerHTML='<option value="">Selecione um grupo</option>'+(payload.groups||[]).map(group=>`<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join('');if(!(payload.groups||[]).length)select.innerHTML='<option value="">Nenhum grupo encontrado</option>'}catch(error){select.innerHTML=`<option value="">${escapeHtml(error.message)}</option>`}}
document.querySelector('#alertEvolutionInstance').onchange=event=>loadEvolutionGroups(event.target.value);
document.querySelector('#refreshAlerts').onclick=event=>loadAlerts(event.currentTarget);
const showDashboardViewBeforeAlerts=showDashboardView;
showDashboardView=function(view){
  if(view!=='alerts'){document.querySelector('#alerts').hidden=true;return showDashboardViewBeforeAlerts(view)}
  document.querySelector('main>header').hidden=true;document.querySelector('#analysis').hidden=true;document.querySelector('#reports').hidden=true;document.querySelector('#alerts').hidden=false;document.querySelector('#summaryCards').hidden=true;document.querySelector('#accounts').hidden=true;
  document.querySelectorAll('.sidebar nav a').forEach(link=>link.classList.toggle('active',link.id==='alertsNav'));initializeAlerts();
};
document.querySelector('#alertsNav').onclick=null;
['analysisNav','reportsNav'].forEach(id=>document.querySelector(`#${id}`).addEventListener('click',()=>document.querySelector('#alerts').hidden=true));
document.querySelectorAll('.sidebar nav a[href="#"],.sidebar nav a[href="#accounts"]').forEach(link=>link.addEventListener('click',()=>document.querySelector('#alerts').hidden=true));
async function hydrateAlertPlans(){try{const response=await fetch('/api/alert-plans'),payload=await response.json(),remotePlans=payload.plans||{};if(Object.keys(remotePlans).length){for(const account of accounts)if(remotePlans[account.id])account.plan={...account.plan,...remotePlans[account.id]}}else savePlans();renderSummary();renderAccounts(document.querySelector('#searchInput').value)}catch{}}
hydrateAlertPlans();
document.querySelector('#analysisNav').onclick=null;document.querySelector('#reportsNav').onclick=null;
const requestedView=new URLSearchParams(location.search).get('view');
if(requestedView==='analysis')showDashboardView('analysis');else if(requestedView==='reports')showDashboardView('reports');else if(requestedView==='alerts')showDashboardView('alerts');
if(MONITOR_API_BASE&&!localStorage.getItem(MONITOR_SESSION_KEY))showAlertLogin();
