'use strict';

const states = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};
const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const comparable = value => fold(value).replace(/[^A-Z0-9]/g, '');
const stateAliases = Object.entries(states).flatMap(([code, name]) => [[code, code], [fold(name), code]]).sort((a, b) => b[0].length - a[0].length);

function parseLocationQuery(query) {
  const requested = String(query || '').trim();
  const value = requested.replace(/[–—−]/g, '-').replace(/^(?:(?:escrit[oó]rio|unidade)\s*:?\s+|(?:localiza[cç][aã]o|cidade)\s*:\s*)(?:em\s+)?/i, '').trim();
  const normalized = fold(value);
  for (const [alias, state] of stateAliases) {
    const match = normalized.match(new RegExp('^(.+?)(?:\\s*[-,/|]\\s*|\\s+\\(\\s*|\\s+)'+alias+'\\s*\\)?$'));
    if (match) return {requested, city: value.slice(0, match[1].length).trim(), state, country: 'BR'};
  }
  return {requested, city: value, state: '', country: ''};
}

function matchesState(item, state) {
  if (!state) return true;
  const region = comparable(String(item.region || '').replace(/^(?:state of|estado de|estado do)\s+/i, ''));
  return item.type === 'city' && item.country_code === 'BR' && (region === state || region === comparable(states[state]));
}

async function searchLocations(graph, token, query, limit = 20) {
  const parsed = parseLocationQuery(query);
  const params = {type: 'adgeolocation', location_types: JSON.stringify(parsed.state ? ['city'] : ['city', 'region', 'country']), q: parsed.city, limit};
  if (parsed.country) params.country_code = parsed.country;
  const result = await graph(token, 'search', params);
  const items = (result.data || []).filter(item => ['city', 'region', 'country'].includes(item.type) && item.key && /^[A-Z]{2}$/.test(item.country_code || item.key) && matchesState(item, parsed.state));
  return {parsed, items};
}

function distance(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({length: b.length + 1}, (_, i) => i);
  for (let row = 1; row <= a.length; row++) {
    const current = [row];
    for (let col = 1; col <= b.length; col++) current[col] = Math.min(current[col-1]+1, previous[col]+1, previous[col-1]+(a[row-1] === b[col-1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}

async function resolveLocation(graph, token, query) {
  const {parsed, items} = await searchLocations(graph, token, query);
  const expected = comparable(parsed.city);
  let matches = items.filter(item => comparable(item.name) === expected || (['BRASIL', 'BRAZIL', 'BR'].includes(expected) && item.type === 'country' && (item.country_code || item.key) === 'BR'));
  if (!matches.length && expected.length >= 4) matches = items.filter(item => item.type === 'city' && distance(comparable(item.name), expected) <= 1);
  if (matches.length !== 1) throw Object.assign(new Error('A Meta não confirmou a cidade ou região "'+parsed.requested+'". Escolha uma localização válida na revisão.'), {status: 400});
  const item = matches[0];
  return {key: String(item.key), type: item.type, name: item.name, country: item.country_code || item.key, region: item.region || ''};
}

module.exports = {parseLocationQuery, searchLocations, resolveLocation};
