'use strict';
const {evaluateAccountAlerts} = require('./alert-evaluator');

// Roda os alertas de cada conexão salva. Cada usuário recebe somente os avisos
// das próprias contas, no WhatsApp e grupo que ele configurou. Toda chamada
// externa entra por `deps`, para que a regra seja testada sem a Meta nem o WhatsApp.
async function runPersonalAlerts({users, dateKey, now, deps}) {
  const results = [];
  for (const user of users) {
    const config = await deps.loadConfig(user.id);
    if (!config?.enabled || !config.instance || !config.groupJid) {
      results.push({userId: user.id, skipped: 'desativado'});
      continue;
    }
    const plans = (await deps.loadPlans(user.id)) || {};
    // Contas de cartão também geram alerta de limite diário; o saldo pré-pago só entra quando existe.
    const accountIds = Object.keys(plans);
    if (!accountIds.length) {
      results.push({userId: user.id, skipped: 'sem contas'});
      continue;
    }

    let balances = {}, spends = {};
    try { balances = (await deps.fetchBalances(user.id, accountIds)) || {}; }
    catch { results.push({userId: user.id, error: 'saldo pré-pago indisponível'}); }
    try { spends = (await deps.fetchSpend(user.id, accountIds, dateKey)) || {}; }
    catch { results.push({userId: user.id, error: 'gasto de hoje indisponível'}); }

    for (const id of accountIds) {
      const balance = balances[id]?.audited ? balances[id].balance : null;
      const alerts = evaluateAccountAlerts({
        name: plans[id].name || id,
        dateKey,
        plan: plans[id],
        spend: spends[id] ?? null,
        balance,
        config,
      });
      for (const alert of alerts) {
        if (await deps.alreadySent(user.id, alert.key)) continue;
        if (config.dryRun) {
          await deps.markSent(user.id, alert.key, now, {delivered: false});
          results.push({userId: user.id, key: alert.key, delivered: false});
          continue;
        }
        // Uma falha de envio não é registrada como enviada, para tentar de novo no próximo ciclo.
        try {
          await deps.send(config, alert.text);
        } catch {
          results.push({userId: user.id, key: alert.key, delivered: false, error: 'envio falhou'});
          continue;
        }
        await deps.markSent(user.id, alert.key, now, {delivered: true});
        results.push({userId: user.id, key: alert.key, delivered: true});
      }
    }
  }
  return results;
}

module.exports = {runPersonalAlerts};
