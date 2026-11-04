'use strict';
// Regras do relatório de métricas: cada métrica fora do padrão aponta a causa
// mais provável e o que otimizar na conta. Limiares definidos pelo usuário:
// CPM acima de R$ 25 é alto; CTR abaixo de 1% é crítico e acima de 1,50% é bom.

const THRESHOLDS = {
  cpmHigh: 25,
  cpcHigh: 2.5,
  ctrCritical: 1,
  ctrGood: 1.5,
  linkCtrCritical: 0.5,
  linkCtrGood: 1,
  frequencyHigh: 3,
  hookLow: 25,
  // Gasto a partir do qual a falta de resultado já é crítica.
  noResultSpend: 100,
};

const money = value => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
const pct = value => `${Number(value).toFixed(2).replace('.', ',')}%`;

// Recebe as métricas do período e a meta de custo por lead da conta.
// Devolve os achados, do mais grave para o menos grave.
function evaluateReport(metrics, targets = {}) {
  const findings = [];
  const {cpm, cpc, ctr, linkCtr, linkClicks, costPerLead, results, frequency, hookRate, spend} = metrics;

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
    if (hookRate < THRESHOLDS.hookLow) {
      findings.push({ metric: 'Hook rate (3s)', status: 'alto', value: pct(hookRate), message: `Só ${pct(hookRate)} das impressões assistiram 3 segundos do vídeo, abaixo de ${pct(THRESHOLDS.hookLow)}.`, suggestion: 'A abertura não prende. Comece pela dor ou pelo resultado, sem vinheta, com legenda visível desde o primeiro segundo.' });
    } else {
      findings.push({ metric: 'Hook rate (3s)', status: 'info', value: pct(hookRate), message: `${pct(hookRate)} das impressões assistiram pelo menos 3 segundos do vídeo.`, suggestion: 'Esta métrica mede o gancho inicial. Ela cai quando a abertura não prende a atenção.' });
    }
  }

  // Custo por clique: o leilão cobra caro quando o anúncio não atrai cliques.
  if (cpc != null && cpc > THRESHOLDS.cpcHigh) {
    findings.push({
      metric: 'CPC', status: 'médio', value: money(cpc),
      message: `O custo por clique está em ${money(cpc)}, acima de ${money(THRESHOLDS.cpcHigh)}.`,
      suggestion: ctr != null && ctr < THRESHOLDS.ctrGood
        ? 'O CTR baixo encarece o clique: melhore o gancho e a chamada para ação antes de mexer no lance.'
        : 'Teste públicos mais frios e posicionamentos mais baratos. Se o CTR estiver bom, o custo vem do leilão.',
    });
  }

  // Cliques no link medidos sobre as impressões: mostra se o interesse vira visita.
  if (linkCtr != null) {
    if (linkCtr < THRESHOLDS.linkCtrCritical) {
      findings.push({
        metric: 'CTR no link', status: 'crítico', value: pct(linkCtr),
        message: `Só ${pct(linkCtr)} das impressões viraram clique no link, abaixo de ${pct(THRESHOLDS.linkCtrCritical)}.`,
        suggestion: ctr != null && ctr >= THRESHOLDS.ctrGood
          ? 'O anúncio chama atenção, mas não leva ao clique: a oferta ou a chamada para ação não convence. Deixe a oferta na primeira frase e use um botão de ação mais claro.'
          : 'Clique fraco no link: revise a oferta, a chamada para ação e a página de destino.',
      });
    } else if (linkCtr > THRESHOLDS.linkCtrGood) {
      findings.push({ metric: 'CTR no link', status: 'bom', value: pct(linkCtr), message: `${pct(linkCtr)} das impressões viraram clique no link, acima de ${pct(THRESHOLDS.linkCtrGood)}.`, suggestion: 'A oferta leva ao clique. Mantenha o criativo e teste variações da página de destino.' });
    }
  }

  // Gasto relevante sem nenhum lead nem conversa: a otimização segue sem resultado para se guiar.
  if (spend != null && spend >= THRESHOLDS.noResultSpend && results === 0) {
    findings.push({
      metric: 'Resultado', status: 'crítico', value: money(spend),
      message: `${money(spend)} gastos no período sem nenhum lead ou conversa.`,
      suggestion: 'Pause os conjuntos sem resultado e confira se o evento de conversão (pixel, formulário ou conversa) está registrando. Sem ele, a Meta otimiza às cegas.',
    });
  }

  const order = {crítico: 0, alto: 1, médio: 2, info: 3, bom: 4};
  return findings.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

module.exports = {evaluateReport, THRESHOLDS};
