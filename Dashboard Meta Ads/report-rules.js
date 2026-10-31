'use strict';
// Regras do relatório de métricas: cada métrica fora do padrão aponta a causa
// mais provável e o que otimizar na conta. Limiares definidos pelo usuário:
// CPM acima de R$ 25 é alto; CTR abaixo de 1% é crítico e acima de 1,50% é bom.

const THRESHOLDS = {
  cpmHigh: 25,
  ctrCritical: 1,
  ctrGood: 1.5,
  frequencyHigh: 3,
};

const money = value => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
const pct = value => `${Number(value).toFixed(2).replace('.', ',')}%`;

// Recebe as métricas do período e a meta de custo por lead da conta.
// Devolve os achados, do mais grave para o menos grave.
function evaluateReport(metrics, targets = {}) {
  const findings = [];
  const {cpm, ctr, linkClicks, costPerLead, frequency, hookRate, spend, leads} = metrics;

  if (cpm != null) {
    if (cpm > THRESHOLDS.cpmHigh) {
      const causes = [];
      if (frequency != null && frequency > THRESHOLDS.frequencyHigh) causes.push(`a frequência de ${frequency.toFixed(1).replace('.', ',')} indica que o público já viu o anúncio demais`);
      if (ctr != null && ctr < THRESHOLDS.ctrCritical) causes.push('o CTR baixo faz o leilão cobrar mais por cada mil impressões');
      findings.push({
        metric: 'CPM', status: 'alto', value: money(cpm),
        message: `O CPM está em ${money(cpm)}, acima do limite de ${money(THRESHOLDS.cpmHigh)}.`,
        suggestion: causes.length
          ? `Possíveis causas: ${causes.join('; ')}. Amplie o público ou renove o criativo.`
          : 'Revise o público e os posicionamentos: posicionamentos caros e públicos muito estreitos elevam o CPM.',
      });
    }
  }

  if (ctr != null) {
    if (ctr < THRESHOLDS.ctrCritical) {
      findings.push({
        metric: 'CTR', status: 'crítico', value: pct(ctr),
        message: `O CTR está em ${pct(ctr)}, abaixo de ${pct(THRESHOLDS.ctrCritical)}.`,
        suggestion: `Revise os 3 primeiros segundos do vídeo e a chamada para ação. ${hookRate != null && hookRate < 25 ? `O hook rate de ${pct(hookRate)} também é baixo, então o gancho inicial não está prendendo a atenção.` : 'Teste um criativo novo com uma abertura mais direta.'}`,
      });
    } else if (ctr > THRESHOLDS.ctrGood) {
      findings.push({ metric: 'CTR', status: 'bom', value: pct(ctr), message: `O CTR está em ${pct(ctr)}, acima de ${pct(THRESHOLDS.ctrGood)}.`, suggestion: 'O criativo está funcionando. Mantenha e acompanhe a frequência.' });
    } else {
      findings.push({ metric: 'CTR', status: 'médio', value: pct(ctr), message: `O CTR está em ${pct(ctr)}, entre ${pct(THRESHOLDS.ctrCritical)} e ${pct(THRESHOLDS.ctrGood)}.`, suggestion: 'Teste variações do texto e da chamada para ação para subir o CTR.' });
    }
  }

  if (linkClicks != null && ctr != null && ctr > THRESHOLDS.ctrGood && linkClicks === 0) {
    findings.push({ metric: 'Cliques no link', status: 'crítico', value: '0', message: 'Há impressões e CTR bom, mas nenhum clique no link.', suggestion: 'Confira se o link está correto e se a página de destino carrega. O anúncio chama atenção, mas o clique não está acontecendo.' });
  }

  if (costPerLead != null && targets.maxCostPerLead > 0) {
    if (costPerLead > targets.maxCostPerLead) {
      const reasons = [];
      if (ctr != null && ctr < THRESHOLDS.ctrGood) reasons.push('CTR abaixo do esperado, então menos pessoas chegam à oferta');
      if (frequency != null && frequency > THRESHOLDS.frequencyHigh) reasons.push('frequência alta, com perda de eficiência');
      findings.push({
        metric: 'Custo por lead', status: 'alto', value: money(costPerLead),
        message: `O custo por lead está em ${money(costPerLead)}, acima do máximo de ${money(targets.maxCostPerLead)}.`,
        suggestion: reasons.length ? `Causas prováveis: ${reasons.join('; ')}.` : 'Revise a oferta e o formulário: um formulário longo reduz a conversão.',
      });
    }
  }

  if (frequency != null && frequency > THRESHOLDS.frequencyHigh) {
    findings.push({ metric: 'Frequência', status: 'alto', value: frequency.toFixed(1), message: `A frequência está em ${frequency.toFixed(1).replace('.', ',')}.`, suggestion: 'Público saturado: renove o criativo ou amplie o público para reduzir o desgaste.' });
  }

  if (hookRate != null) {
    findings.push({ metric: 'Hook rate (3s)', status: 'info', value: pct(hookRate), message: `${pct(hookRate)} das impressões assistiram pelo menos 3 segundos do vídeo.`, suggestion: 'Esta métrica mede o gancho inicial. Ela cai quando a abertura não prende a atenção.' });
  }

  const order = {crítico: 0, alto: 1, médio: 2, info: 3, bom: 4};
  return findings.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

module.exports = {evaluateReport, THRESHOLDS};
