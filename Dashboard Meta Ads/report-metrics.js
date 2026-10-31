'use strict';
// Converte a linha de Insights da Meta nas métricas do relatório.
// A Meta devolve gasto e alcance como texto, e ações (leads, cliques no link,
// reproduções de 3 segundos) como listas de {action_type, value}.

const INSIGHT_FIELDS = 'spend,impressions,reach,cpm,ctr,frequency,inline_link_clicks,actions,video_3_sec_watched_actions';

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
  const threeSecondViews = actionValue(row.video_3_sec_watched_actions, 'video_view')
    ?? (Array.isArray(row.video_3_sec_watched_actions) && row.video_3_sec_watched_actions[0]
      ? Number(row.video_3_sec_watched_actions[0].value) : null);
  return {
    spend,
    impressions: Number.isFinite(impressions) ? impressions : null,
    cpm: row.cpm != null ? Number(row.cpm) : null,
    ctr: row.ctr != null ? Number(row.ctr) : null,
    frequency: row.frequency != null ? Number(row.frequency) : null,
    linkClicks: actionValue(row.actions, 'link_click') ?? (row.inline_link_clicks != null ? Number(row.inline_link_clicks) : null),
    leads,
    costPerLead: leads && spend != null && leads > 0 ? spend / leads : null,
    hookRate: threeSecondViews != null && impressions > 0 ? (threeSecondViews / impressions) * 100 : null,
  };
}

module.exports = {INSIGHT_FIELDS, parseInsightRow};
