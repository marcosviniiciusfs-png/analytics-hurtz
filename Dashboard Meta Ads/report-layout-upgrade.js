(async()=>{
  if(window.hurtzReportLayoutUpgradeApplied)return;
  if(typeof reportPngEdits==='undefined'||typeof drawPngReport!=='function')throw new Error('Abra o dashboard antes de aplicar a atualização.');
  const previousDraw=drawPngReport,previousRender=renderPngReportFields;
  // Keep a recovery copy in this tab, without replacing the live report objects.
  window.hurtzReportLayoutRecovery={context:currentReportContext,edits:JSON.parse(JSON.stringify([...reportPngEdits])),names:[...reportDisplayNameOverrides],accountId:currentPngAccountId,mode:pngReportMode};
  function pngReportLayout(edit){
  const extraMetrics=edit.extraMetrics||[],count=3+extraMetrics.length;
  const groupPercent=Math.max(35,Math.min(60,Number(edit.groupWidth)||55));
  const groupW=1520*groupPercent/100,groupX=1560-groupW,metricsW=groupX-80;
  return {groupPercent,groupX,groupW,cardW:(metricsW-16*(count-1))/count};
}
function drawReportCellText(ctx,text,x,y,width,size,color,align='left'){
  ctx.save();ctx.fillStyle=color;ctx.textAlign=align;
  fitCanvasText(ctx,text,width,size,'800');
  ctx.fillText(String(text??''),x,y,width);ctx.restore();
}
function drawEditableReportBlocks(ctx,edit){
  const orange='#ff4b22',navy='#062b70',ink='#030316';
  const {groupX,groupW,cardW}=pngReportLayout(edit);
  const metrics=[{label:edit.leadsLabel,value:edit.leadsValue,icon:'people'},{label:edit.cplLabel,value:edit.cplValue,icon:'target'},{label:edit.spendLabel,value:edit.spendValue,icon:'money'},...(edit.extraMetrics||[])];
  // Clear the entire previous layout, including text that extended past its cards.
  ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#f8f9fc';ctx.fillRect(0,270,1600,390);
  metrics.forEach((metric,index)=>{
    const x=40+index*(cardW+16),cx=x+cardW/2;
    roundRect(ctx,x,276,cardW,374,10,'#fff','#edf0f4');
    ctx.fillStyle='#fff0eb';ctx.beginPath();ctx.arc(cx,345,Math.min(40,cardW*.32),0,Math.PI*2);ctx.fill();
    drawReportIcon(ctx,metric.icon||'trend',cx,345,orange,Math.min(.9,cardW/120));
    drawReportCellText(ctx,metric.label,cx,430,cardW-20,14,ink,'center');
    ctx.fillStyle='#ffaf97';ctx.fillRect(cx-cardW*.19,458,cardW*.38,1);
    drawReportCellText(ctx,metric.value,cx,515,cardW-24,32,orange,'center');
    if(index===1){const radius=Math.min(42,cardW*.24);ctx.lineWidth=Math.min(22,cardW*.12);ctx.strokeStyle='#f2e2dc';ctx.beginPath();ctx.arc(cx,584,radius,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=orange;ctx.beginPath();ctx.arc(cx,584,radius,-Math.PI/2,Math.PI*1.15);ctx.stroke()}
    else{ctx.fillStyle=orange;[34,58,85].forEach((height,i)=>ctx.fillRect(x+cardW*(.2+i*.22),630-height,cardW*.15,height))}
  });
  ctx.fillStyle=navy;ctx.beginPath();ctx.arc(groupX+22,326,22,0,Math.PI*2);ctx.fill();drawReportSpecificIcon(ctx,'layers',groupX+22,326,'#fff',.52);
  drawReportCellText(ctx,edit.groupTitle,groupX+55,334,groupW-55,20,navy);
  const totalW=Math.min(245,groupW*.29),gridX=groupX+totalW+18,gridW=groupW-totalW-18;
  roundRect(ctx,groupX,372,totalW,254,12,'#fff','#edf0f4');
  drawReportCellText(ctx,edit.confirmedLabel,groupX+20,414,totalW-40,15,navy);
  drawReportCellText(ctx,edit.confirmedValue,groupX+20,488,totalW-40,48,orange);
  drawReportCellText(ctx,edit.confirmedUnit,groupX+20,514,totalW-40,16,orange);
  ctx.fillStyle='#ffac91';ctx.fillRect(groupX+20,531,totalW-40,1);ctx.fillStyle=ink;ctx.font='400 15px Arial';wrapCanvasText(ctx,edit.investmentText,groupX+20,555,totalW-40,20,3);
  const gridY=370,gridH=256,headerH=36,campaignCol=gridW*.60,leadsCol=gridW*.19,cplCol=gridW-campaignCol-leadsCol;
  roundRect(ctx,gridX,gridY,gridW,gridH,8,'#fff','#dfe4eb');ctx.fillStyle='#f4f6f9';ctx.fillRect(gridX+1,gridY+1,gridW-2,headerH);
  ctx.strokeStyle='#dfe4eb';ctx.lineWidth=1;ctx.beginPath();[campaignCol,campaignCol+leadsCol].forEach(offset=>{ctx.moveTo(gridX+offset,gridY);ctx.lineTo(gridX+offset,gridY+gridH)});ctx.moveTo(gridX,gridY+headerH);ctx.lineTo(gridX+gridW,gridY+headerH);ctx.stroke();
  drawReportCellText(ctx,'GRUPO DE CAMPANHA',gridX+14,gridY+23,campaignCol-28,11,navy);
  drawReportCellText(ctx,edit.leadsLabel,gridX+campaignCol+leadsCol/2,gridY+23,leadsCol-12,11,navy,'center');
  drawReportCellText(ctx,'CPL',gridX+gridW-cplCol/2,gridY+23,cplCol-12,11,navy,'center');
  const groups=edit.groups||[],rowH=(gridH-headerH)/Math.max(1,groups.length);
  groups.forEach((group,index)=>{
    const top=gridY+headerH+index*rowH,centerY=top+rowH/2,size=Math.min(14,Math.max(8,rowH*.28));
    ctx.save();ctx.beginPath();ctx.rect(gridX,top,gridW,rowH);ctx.clip();
    if(index){ctx.strokeStyle='#dfe4eb';ctx.beginPath();ctx.moveTo(gridX,top);ctx.lineTo(gridX+gridW,top);ctx.stroke()}
    drawReportCellText(ctx,group.name,gridX+14,centerY+size*.35,campaignCol-28,size,ink);
    drawReportCellText(ctx,group.results,gridX+campaignCol+leadsCol/2,centerY+size*.35,leadsCol-12,size,orange,'center');
    drawReportCellText(ctx,group.cpl,gridX+gridW-cplCol/2,centerY+size*.35,cplCol-12,size,orange,'center');ctx.restore();
  });ctx.restore();
}


  function updatedRenderPngReportFields(accountId=currentPngAccountId){
  const root=document.querySelector('#pngReportFields'),edit=currentPngEdit(accountId);if(!root||!edit){if(root)root.innerHTML='';return}
  root.innerHTML=`
    <fieldset><legend>Cabeçalho</legend><div class="png-edit-grid">
      ${pngEditorControl('Título do relatório','reportTitle',edit.reportTitle)}
      ${pngEditorControl('Nome da conta','accountName',edit.accountName)}
      ${pngEditorControl('Período exibido','period',edit.period)}
      ${pngEditorControl('Rótulo de campanhas','campaignsLabel',edit.campaignsLabel)}
      ${pngEditorControl('Produtos / campanhas reconhecidas','products',edit.products,{wide:true})}
    </div></fieldset>
    <fieldset><legend>Métricas principais</legend><div class="png-edit-grid metrics">
      ${pngEditorControl('Nome da métrica 1','leadsLabel',edit.leadsLabel)}${pngEditorControl('Valor da métrica 1','leadsValue',edit.leadsValue)}
      ${pngEditorControl('Nome da métrica 2','cplLabel',edit.cplLabel)}${pngEditorControl('Valor da métrica 2','cplValue',edit.cplValue)}
      ${pngEditorControl('Nome da métrica 3','spendLabel',edit.spendLabel)}${pngEditorControl('Valor da métrica 3','spendValue',edit.spendValue)}
      ${(edit.extraMetrics||[]).map((metric,index)=>`<label class="png-edit-control"><span>Nome da métrica ${index+4}</span><input data-png-metric-index="${index}" data-png-metric-field="label" value="${escapeHtml(metric.label)}"></label><label class="png-edit-control"><span>Valor da métrica ${index+4}</span><input data-png-metric-index="${index}" data-png-metric-field="value" value="${escapeHtml(metric.value)}"></label><button type="button" class="png-group-add" data-remove-png-metric="${index}">Remover métrica ${index+4}</button>`).join('')}
      <button type="button" class="png-group-add" data-add-png-metric ${(edit.extraMetrics||[]).length>=3?'disabled':''}>+ Adicionar métrica</button>
    </div></fieldset>
    <fieldset><legend>Layout do relatório</legend><label class="png-edit-control"><span>Largura do bloco de campanhas: <output id="pngGroupWidthValue">${pngReportLayout(edit).groupPercent}%</output></span><input type="range" min="35" max="60" step="1" value="${pngReportLayout(edit).groupPercent}" data-png-field="groupWidth" aria-label="Largura do bloco de campanhas"></label></fieldset>
    <fieldset><legend>Desempenho por grupo de campanha</legend><div class="png-edit-grid">
      ${pngEditorControl('Título do bloco','groupTitle',edit.groupTitle,{wide:true})}
      ${pngEditorControl('Rótulo do total','confirmedLabel',edit.confirmedLabel)}${pngEditorControl('Total confirmado','confirmedValue',edit.confirmedValue)}
      ${pngEditorControl('Unidade do total','confirmedUnit',edit.confirmedUnit)}${pngEditorControl('Texto do investimento','investmentText',edit.investmentText,{wide:true})}
    </div><div class="png-group-editor"><div class="png-group-editor-header"><span>Nome reconhecido / não reconhecido</span><span>Leads</span><span>CPL</span><span class="png-group-action-title">Ação</span></div>
      ${(edit.groups||[]).map((group,index)=>`<div class="png-group-edit-row"><input value="${escapeHtml(group.name)}" data-png-group-index="${index}" data-png-group-field="name" aria-label="Nome do grupo ${index+1}"><input value="${escapeHtml(group.results)}" data-png-group-index="${index}" data-png-group-field="results" aria-label="Leads do grupo ${index+1}"><input value="${escapeHtml(group.cpl)}" data-png-group-index="${index}" data-png-group-field="cpl" aria-label="CPL do grupo ${index+1}"><button class="png-group-remove" type="button" data-remove-png-group="${index}" title="Apagar esta campanha do relatório" aria-label="Apagar ${escapeHtml(group.name||`campanha ${index+1}`)} do relatório"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 3h4l1 3H7l1-3Zm-2 3 1 11h6l1-11M9 9v5m2-5v5"/></svg></button></div>`).join('')||'<p class="png-edit-empty">Nenhuma campanha será exibida. Use “Restaurar dados auditados” para recuperar as linhas.</p>'}
      <button class="png-group-add" type="button" data-add-png-group><span>+</span> Adicionar campanha</button>
    </div></fieldset>
    <fieldset><legend>Textos de análise</legend><div class="png-edit-grid">
      ${pngEditorControl('Título do resumo','summaryTitle',edit.summaryTitle)}${pngEditorControl('Resumo','summaryText',edit.summaryText,{wide:true,multiline:true})}
      ${pngEditorControl('Título — ponto positivo','goodTitle',edit.goodTitle)}${pngEditorControl('O que está bom','goodText',edit.goodText,{wide:true,multiline:true})}
      ${pngEditorControl('Título — melhoria','improveTitle',edit.improveTitle)}${pngEditorControl('O que pode melhorar','improveText',edit.improveText,{wide:true,multiline:true})}
    </div></fieldset>`;
}

  drawPngReport=async function(accountId,displayName){await previousDraw(accountId,displayName);const edit=reportPngEdits.get(accountId);if(edit)drawEditableReportBlocks(document.querySelector('#pngReportCanvas').getContext('2d'),edit)};
  renderPngReportFields=updatedRenderPngReportFields;
  try{if(currentPngAccountId){const edit=reportPngEdits.get(currentPngAccountId);renderPngReportFields();if(edit)await drawPngReport(currentPngAccountId,edit.accountName)}}
  catch(error){drawPngReport=previousDraw;renderPngReportFields=previousRender;throw error}
  document.querySelector('#pngReportFields').addEventListener('input',event=>{
    const edit=currentPngEdit();if(!edit)return;
    if(event.target.dataset.pngField==='groupWidth')document.querySelector('#pngGroupWidthValue').textContent=pngReportLayout(edit).groupPercent+'%';
    const index=Number(event.target.dataset.pngMetricIndex),field=event.target.dataset.pngMetricField;
    if(field&&edit.extraMetrics?.[index]){edit.extraMetrics[index][field]=event.target.value;schedulePngEditorRedraw()}
  });
  document.querySelector('#pngReportFields').addEventListener('click',event=>{
  const add=event.target.closest('[data-add-png-metric]'),remove=event.target.closest('[data-remove-png-metric]');if(!add&&!remove)return;
  const edit=currentPngEdit();if(!edit)return;edit.extraMetrics=edit.extraMetrics||[];
  if(add){if(edit.extraMetrics.length>=3)return;edit.extraMetrics.push({label:'NOVA MÉTRICA',value:'—'})}
  else edit.extraMetrics.splice(Number(remove.dataset.removePngMetric),1);
  renderPngReportFields();schedulePngEditorRedraw();
  document.querySelector(add?`[data-png-metric-index="${edit.extraMetrics.length-1}"][data-png-metric-field="label"]`:'[data-add-png-metric]')?.focus();
});

  window.hurtzReportLayoutUpgradeApplied=true;
  alert('Relatório atualizado sem recarregar a página. Suas edições foram preservadas.');
})().catch(error=>{console.error(error);alert('Não foi possível aplicar a atualização. Mantenha esta aba aberta: '+error.message)});
