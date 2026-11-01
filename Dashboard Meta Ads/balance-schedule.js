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

// Mensagem com o saldo pré-pago de cada conta; conta sem leitura aparece como indisponível.
function balanceTimeText({time, accounts}) {
  const lines = accounts.map(account => `• ${account.name}: ${account.balance == null ? 'saldo indisponível' : formatBrl(account.balance)}`);
  return [`🏦 Saldo das contas às ${time}`, ...lines].join('\n');
}

module.exports = {normalizeTimes, dueSlots, balanceTimeText, TIMEZONE, WINDOW_MINUTES};
