'use strict';
// Converte a linha de Insights da Meta nas métricas do relatório.
// A Meta devolve gasto e alcance como texto, e ações (leads, cliques no link,
// reproduções de 3 segundos) como listas de {action_type, value}.

// video_3_sec_watched_actions não é aceito como campo na API atual; as reproduções de 3 segundos vêm em actions (video_view).
const INSIGHT_FIELDS = 'spend,impressions,reach,cpm,cpc,ctr,frequency,inline_link_clicks,actions';

// Conversas iniciadas no WhatsApp, quando a campanha mede mensagens.
const MESSAGING_CONVERSATIONS = 'onsite_conversion.messaging_conversation_started_7d';

function actionValue(list, type) {
  const item = (list || []).find(entry => entry.action_type === type);
  return item ? Number(item.value) : null;
}

// Retorna null para a métrica quando a Meta não a informou, para que as regras
// não tratem um dado ausente como zero.
function parseInsightRow(row) {
  if (!row) return null;
  const impressions = Number(row.impressions);
  const spend = row.spend != null ? Number(row.spend) : null;
  const leads = actionValue(row.actions, 'lead');
  const conversations = actionValue(row.actions, MESSAGING_CONVERSATIONS);
  const threeSecondViews = actionValue(row.actions, 'video_view');
  const linkClicks = actionValue(row.actions, 'link_click') ?? (row.inline_link_clicks != null ? Number(row.inline_link_clicks) : null);
  // Resultado principal: leads quando existem, senão conversas no WhatsApp. Zero só quando a Meta
  // devolveu a lista de ações; sem a lista não dá para afirmar que não houve resultado.
  const results = leads || conversations || (Array.isArray(row.actions) ? 0 : null);
  return {
    spend,
    impressions: Number.isFinite(impressions) ? impressions : null,
    cpm: row.cpm != null ? Number(row.cpm) : null,
    cpc: row.cpc != null ? Number(row.cpc) : null,
    ctr: row.ctr != null ? Number(row.ctr) : null,
    linkCtr: linkClicks != null && impressions > 0 ? (linkClicks / impressions) * 100 : null,
    frequency: row.frequency != null ? Number(row.frequency) : null,
    linkClicks,
    leads,
    conversations,
    results,
    costPerLead: leads && spend != null && leads > 0 ? spend / leads : null,
    costPerResult: results && spend != null ? spend / results : null,
    hookRate: threeSecondViews != null && impressions > 0 ? (threeSecondViews / impressions) * 100 : null,
  };
}

module.exports = {INSIGHT_FIELDS, parseInsightRow};
