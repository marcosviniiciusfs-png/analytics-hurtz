'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseInsightRow} = require('./report-metrics');

test('parses CPM, CTR, frequency, link clicks and spend from an insight row', () => {
  const row = {spend: '150.00', impressions: '10000', cpm: '15.0', ctr: '1.2', frequency: '2.1', actions: [{action_type: 'link_click', value: '120'}, {action_type: 'lead', value: '5'}]};
  const m = parseInsightRow(row);
  assert.equal(m.spend, 150);
  assert.equal(m.cpm, 15);
  assert.equal(m.ctr, 1.2);
  assert.equal(m.frequency, 2.1);
  assert.equal(m.linkClicks, 120);
  assert.equal(m.leads, 5);
});

test('cost per lead is spend divided by leads, and null without leads', () => {
  assert.equal(parseInsightRow({spend: '150', impressions: '1000', actions: [{action_type: 'lead', value: '5'}]}).costPerLead, 30);
  assert.equal(parseInsightRow({spend: '150', impressions: '1000', actions: []}).costPerLead, null);
});

test('hook rate is the 3-second video views as a percentage of impressions', () => {
  const m = parseInsightRow({spend: '50', impressions: '2000', actions: [{action_type: 'video_view', value: '500'}]});
  assert.equal(m.hookRate, 25);
});

test('missing data stays null instead of becoming zero', () => {
  const m = parseInsightRow({impressions: '0'});
  assert.equal(m.hookRate, null);
  assert.equal(m.costPerLead, null);
  assert.equal(m.spend, null);
  assert.equal(parseInsightRow(null), null);
});
