import json
import os
import unittest
from decimal import Decimal
from unittest.mock import patch

os.environ.setdefault('META_ACCESS_TOKEN', 'test-only')
import dashboard_spend as spend
import analysis_breakdowns as analysis
from result_metrics import result_metrics


class ResultsTests(unittest.TestCase):
    def test_aggregate_is_not_added_to_leaf_actions(self):
        actions={'lead': 20, 'onsite_conversion.lead_grouped': 15,
                 'onsite_conversion.lead': 15, 'offsite_conversion.fb_pixel_lead': 5}
        self.assertEqual(result_metrics(actions)['results'],20)

    def test_disjoint_sources_without_aggregate(self):
        self.assertEqual(result_metrics({'onsite_conversion.lead':15,
            'offsite_conversion.fb_pixel_lead':5})['results'],20)

    def test_mixed_conversations_and_leads_remain_separate(self):
        actions={'lead': 12, 'onsite_conversion.messaging_conversation_started_7d': 8}
        m=result_metrics(actions)
        self.assertEqual((m['results'],m['leads'],m['conversations']),(12,12,8))
        row={'actions':[{'action_type':k,'value':str(v)} for k,v in actions.items()]}
        self.assertEqual(analysis.result_count(row),spend.choose_result(actions,'OUTCOME_ENGAGEMENT','WhatsApp')[2])

    def test_form_under_other_objective_and_misleading_name(self):
        label,kind,count=spend.choose_result({'onsite_conversion.lead':Decimal(7)},'OUTCOME_TRAFFIC','WhatsApp antigo')
        self.assertEqual((label,count),('Formulário',7))

    def test_campaigns_with_results_without_spend_and_active_without_delivery(self):
        def get(path,params):
            if path.endswith('/campaigns'):
                return [{'id':'1','name':'Form novo','objective':'OUTCOME_LEADS','effective_status':'ACTIVE'},
                        {'id':'2','name':'WhatsApp','objective':'OUTCOME_ENGAGEMENT','effective_status':'PAUSED'},
                        {'id':'3','name':'Form sem entrega','objective':'OUTCOME_LEADS','effective_status':'ACTIVE'}]
            base={'date_start':'2026-09-01','spend':'10','actions':[{'action_type':'onsite_conversion.lead','value':'9'}]}
            if params['level']=='account':return [{**base,'account_name':'Conta'}]
            return [{**base,'campaign_id':'1','campaign_name':'Form novo','spend':'0'},
                    {**base,'campaign_id':'2','campaign_name':'WhatsApp','actions':[]}]
        with patch.object(spend,'get',side_effect=get):
            row=spend.audit('act_1',json.dumps({'since':'2026-09-01','until':'2026-09-01'}))
        self.assertTrue(row['reconciled'])
        campaigns={c['campaign_id']:c for c in row['campaigns']}
        self.assertEqual(campaigns['1']['results'],9)
        self.assertEqual(campaigns['2']['effective_status'],'PAUSED')
        self.assertTrue(campaigns['3']['no_delivery_in_period'])
        self.assertEqual(row['active_campaign_count'],2)

    def test_pagination_is_fully_consumed(self):
        from io import BytesIO
        pages=[{'data':[{'id':'1'}],'paging':{'next':'https://graph.facebook.com/v25.0/next'}},
               {'data':[{'id':'2'}]}]
        with patch.object(spend.urllib.request,'urlopen',side_effect=[BytesIO(json.dumps(p).encode()) for p in pages]):
            self.assertEqual([r['id'] for r in spend.get('act_1/insights',{})],['1','2'])

    def test_missing_creative_permission_does_not_discard_insights(self):
        def get(path,params):
            metric={'spend':'30','actions':[{'action_type':'onsite_conversion.lead','value':'6'}]}
            return [{**metric,'ad_id':'11','campaign_id':'1','campaign_name':'Form','objective':'OUTCOME_LEADS'}] if params['level'] in ('ad','campaign') else [metric]
        with patch.object(analysis,'get',side_effect=get),patch.object(analysis.urllib.request,'urlopen',side_effect=RuntimeError('not permitted')):
            row=analysis.breakdown('act_1','{}',True)
        self.assertTrue(row['reconciled'])
        self.assertEqual(row['ads'][0]['results'],6)
        self.assertEqual(row['ads'][0]['objective'],'OUTCOME_LEADS')
        self.assertTrue(row['metadata_warnings'])

    def test_account_consolidates_form_and_messaging_campaigns(self):
        def get(path,params):
            lead={'action_type':'lead','value':'6'}
            message={'action_type':'onsite_conversion.messaging_conversation_started_7d','value':'11'}
            if params['level']=='account':return [{'spend':'50','actions':[lead,message]}]
            return [{'campaign_id':'1','ad_id':'11','spend':'20','actions':[lead]},
                    {'campaign_id':'2','ad_id':'22','spend':'30','actions':[message]}]
        with patch.object(analysis,'get',side_effect=get),patch.object(analysis.urllib.request,'urlopen',side_effect=RuntimeError('no preview')):
            row=analysis.breakdown('act_1','{}',True)
        self.assertEqual(row['account']['results'],17)
        self.assertEqual(row['account']['leads'],6)
        self.assertEqual(row['account']['conversations'],11)
        self.assertEqual(sum(ad['results'] for ad in row['ads']),17)

if __name__=='__main__':unittest.main()
