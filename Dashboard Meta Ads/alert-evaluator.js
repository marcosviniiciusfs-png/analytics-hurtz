'use strict';

const DEFAULT_THRESHOLDS = [75, 90, 100, 120];
const DEFAULT_BALANCE_THRESHOLDS = [50, 75, 90, 100];

const money = value => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
// 🔴 para faixa crítica (100% ou mais) e 🟡 para atenção.
const severityIcon = critical => (critical ? '🔴' : '🟡');
const sortedThresholds = values => [...values].map(Number).filter(Number.isFinite).sort((a, b) => a - b);

// Gera os alertas de uma conta a partir do gasto do dia e do saldo pré-pago real
// da Meta. Cada alerta tem uma chave estável por dia, para que a mesma faixa
// não seja enviada duas vezes.
function evaluateAccountAlerts({name, dateKey, plan = {}, spend = null, balance = null, config = {}}) {
  const label = name || 'Conta';
  const alerts = [];

  const dailyLimit = Number(plan.dailyLimit) || 0;
  if (dailyLimit > 0 && spend != null) {
    const ratio = spend / dailyLimit * 100;
    for (const threshold of sortedThresholds(config.thresholds || DEFAULT_THRESHOLDS)) {
      if (ratio < threshold) continue;
      alerts.push({
        key: `${dateKey}:${label}:limit:${threshold}`,
        severity: threshold >= 100 ? 'critical' : 'warning',
        text: `${severityIcon(threshold >= 100)} 📈 *Alerta de gasto — ${label}*\nA conta atingiu ${ratio.toFixed(0)}% do limite diário.\n📊 Gasto de hoje: ${money(spend)} de ${money(dailyLimit)}.`,
      });
    }
  }

  const deposit = Number(plan.deposit) || 0;
  if (deposit > 0 && balance != null) {
    const consumed = Math.max(0, deposit - balance) / deposit * 100;
    for (const threshold of sortedThresholds(config.balanceThresholds || DEFAULT_BALANCE_THRESHOLDS)) {
      if (consumed < threshold) continue;
      alerts.push({
        key: `${dateKey}:${label}:balance:${threshold}`,
        severity: threshold >= 100 ? 'critical' : 'warning',
        text: `${severityIcon(threshold >= 100)} 💰 *Saldo — ${label}*\n🏦 Saldo pré-pago disponível na Meta: ${money(balance)}.\n📊 Já foram consumidos ${consumed.toFixed(0)}% do depósito de ${money(deposit)}.`,
      });
    }
  }

  return alerts;
}

module.exports = {evaluateAccountAlerts, DEFAULT_THRESHOLDS, DEFAULT_BALANCE_THRESHOLDS};
