"""One result mapping for campaign audits, analysis and exports.

Meta returns overlapping aggregate and leaf action types. Never add an
aggregate to its children. Campaign names and objectives are not evidence
that an attributed lead came from an instant form or WhatsApp.
"""
from decimal import Decimal

ZERO = Decimal('0')
MESSAGE = 'onsite_conversion.messaging_conversation_started_7d'


def result_metrics(actions):
    def first(types):
        for key in types:
            value = Decimal(str(actions.get(key, 0)))
            if value > 0:
                return key, value
        return None, ZERO

    # These are alternative representations of the same lead family.
    lead_key, leads = first(('lead', 'onsite_conversion.lead_grouped',
                             'onsite_conversion.lead', 'offsite_conversion.fb_pixel_lead',
                             'offsite_conversion.lead', 'offsite_complete_registration_add_meta_leads'))
    if lead_key != 'lead':
        onsite_key, onsite = first(('onsite_conversion.lead_grouped', 'onsite_conversion.lead'))
        offsite_key, offsite = first(('offsite_conversion.fb_pixel_lead', 'offsite_conversion.lead'))
        if onsite_key and offsite_key:
            lead_key, leads = 'lead_sources', onsite + offsite
    message = Decimal(str(actions.get(MESSAGE, 0)))
    if lead_key == 'onsite_conversion.lead':
        label = 'Formulário'
    elif lead_key in ('offsite_conversion.fb_pixel_lead', 'offsite_conversion.lead'):
        label = 'Lead no site'
    else:
        label = 'Lead (Meta)'
    # A conversation may also be classified as a lead by Meta. Keep separate
    # counts; use leads as the primary metric when both exist, never their sum.
    if leads > 0:
        return {'label': label, 'type': lead_key, 'results': leads,
                'leads': leads, 'conversations': message, 'mixed': message > 0}
    if message > 0:
        return {'label': 'Mensagem', 'type': MESSAGE, 'results': message,
                'leads': ZERO, 'conversations': message, 'mixed': False}
    return {'label': 'Sem resultado atribuído', 'type': None, 'results': ZERO,
            'leads': ZERO, 'conversations': ZERO, 'mixed': False}


def serializable_metrics(actions):
    mapped = result_metrics(actions)
    return {'objective_label': mapped['label'], 'result_type': mapped['type'],
            'results': float(mapped['results']), 'leads': float(mapped['leads']),
            'conversations': float(mapped['conversations']), 'mixed_results': mapped['mixed']}
