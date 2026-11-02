'use strict';
// Horários do alerta de saldo: 1 ou 2 por dia, no fuso de São Paulo.
// O agendador roda a cada 15 minutos; a janela de 30 minutos garante que um ciclo caia nela,
// e a marcação por dia e horário impede o envio em duplicidade.

const TIMEZONE = 'America/Sao_Paulo';
const WINDOW_MINUTES = 30;
const MAX_TIMES = 2;

// Aceita "HH:MM" e devolve a lista única e ordenada; ignora entradas inválidas.
function normalizeTimes(input) {
  const list = Array.isArray(input) ? input : [];
  const valid = list
    .map(value => String(value || '').trim())
    .filter(value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
  return [...new Set(valid)].sort().slice(0, MAX_TIMES);
}

// Hora local de São Paulo como minutos desde 00:00.
function localMinutes(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(now));
  const hour = Number(parts.find(part => part.type === 'hour').value);
  const minute = Number(parts.find(part => part.type === 'minute').value);
  return hour * 60 + minute;
}

// Horários cuja janela de 15 minutos contém o instante atual.
function dueSlots(times, now) {
  const current = localMinutes(now);
  return normalizeTimes(times).filter(time => {
    const [hour, minute] = time.split(':').map(Number);
    const start = hour * 60 + minute;
    return current >= start && current < start + WINDOW_MINUTES;
  });
}

function formatBrl(value) {
  return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(value);
}

const percent = value => `${Math.abs(value).toFixed(1).replace('.', ',')}%`;

// Variação do gasto de ontem em relação ao dia anterior a ele.
function dayChange(spend, before, beforeLabel) {
  if (spend == null || before == null) return '⚪ sem comparação com ' + beforeLabel;
  if (before === 0) return spend > 0 ? `🆕 sem gasto em ${beforeLabel}` : `⚪ sem gasto em ${beforeLabel}`;
  const change = (spend - before) / before * 100;
  if (Math.abs(change) < 0.05) return `🟰 igual a ${beforeLabel}`;
  return change > 0 ? `📈 ${percent(change)} acima de ${beforeLabel}` : `📉 ${percent(change)} abaixo de ${beforeLabel}`;
}

// Quanto o gasto de ontem ficou acima ou abaixo de um limite configurado. Sem limite, não aparece.
function limitLine(icon, label, spend, limit) {
  if (!(limit > 0)) return null;
  const prefix = `${icon} ${label} (${formatBrl(limit)})`;
  if (spend == null) return `${prefix}: ⚪ sem dado`;
  const change = (spend - limit) / limit * 100;
  if (Math.abs(change) < 0.05) return `${prefix}: 🟡 no limite`;
  return change > 0 ? `${prefix}: 🔴 ${percent(change)} acima` : `${prefix}: 🟢 ${percent(change)} abaixo`;
}

// Conta sem saldo (zerado ou não lido) recebe a sirene; cartão não tem saldo, então não recebe.
const noBalance = account => !account.isCard && !(account.balance > 0);

// Linha que separa uma conta da outra; longa o bastante para ocupar a largura da mensagem.
const SEPARATOR = '='.repeat(70);

function accountBlock(account, labels) {
  const balanceText = account.isCard ? 'conta cartão' : account.balance == null ? 'saldo indisponível' : formatBrl(account.balance);
  const lines = [
    `${account.isCard ? '💳' : '📣'} *${account.name}*${noBalance(account) ? ' 🚨' : ''}`,
    `💰 Saldo agora: ${balanceText}`,
    `🧾 Gasto de ${labels.yesterday}: ${account.spendYesterday == null ? 'sem dado' : formatBrl(account.spendYesterday)}`,
    `⚖️ ${dayChange(account.spendYesterday, account.spendBefore, labels.before)}`,
    limitLine('🎯', 'Limite diário', account.spendYesterday, account.dailyLimit),
    limitLine('🗓️', 'Média diária do semanal', account.spendYesterday, account.weeklyLimit / 7),
    limitLine('📅', 'Média diária do mensal', account.spendYesterday, account.monthlyLimit / labels.daysInMonth),
  ];
  return lines.filter(Boolean).join('\n');
}

// Sem saldo vai para o topo, depois as contas com saldo e por último os cartões.
const sortRank = account => account.isCard ? 2 : noBalance(account) ? 0 : 1;

// Mensagem de saldo: uma linha por informação e uma linha de separação entre as contas.
// Cada conta traz spendYesterday e spendBefore (o dia anterior a ele) e os limites configurados.
function balanceTimeText({time, accounts, labels}) {
  const sorted = [...accounts].sort((a, b) => sortRank(a) - sortRank(b));
  const blocks = sorted.map(account => accountBlock(account, labels));
  return [`🏦 *Saldo das contas às ${time}*`, blocks.join(`\n${SEPARATOR}\n`)].join('\n\n');
}

module.exports = {normalizeTimes, dueSlots, balanceTimeText, SEPARATOR, TIMEZONE, WINDOW_MINUTES};
