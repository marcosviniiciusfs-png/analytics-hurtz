'use strict';
const fs = require('node:fs');
const {configuration} = require('./facebook-token');
if (configuration()) {
  console.info('Meta OAuth configuration available.');
} else {
  // Report names and presence only. Never print credential values or file contents.
  const relevant = name => /(?:META|FACEBOOK|FB).*(?:APP|OAUTH|SECRET)/i.test(name);
  const directory = '/opt/meta-ads-cli/secrets';
  const files = new Set([directory + '/.env', directory + '/tryv-oauth.env', process.env.META_OAUTH_FILE].filter(Boolean));
  try {
    for (const name of fs.readdirSync(directory)) {
      if (/^(?:[a-z0-9_-]+\.)?env$|\.env$/i.test(name)) files.add(directory + '/' + name);
    }
  } catch {}
  console.error(JSON.stringify({event: 'meta_oauth_configuration_missing', environmentKeys: Object.keys(process.env).filter(relevant)}));
  for (const file of files) {
    try {
      const names = fs.readFileSync(file, 'utf8').split(/\r?\n/).map(line => /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/.exec(line)?.[1]).filter(name => name && relevant(name));
      console.error(JSON.stringify({file, present: true, keys: names}));
    } catch { console.error(JSON.stringify({file, readable: false})); }
  }
  console.error('Meta OAuth configuration missing or invalid; keeping the running API.');
  process.exitCode = 1;
}
