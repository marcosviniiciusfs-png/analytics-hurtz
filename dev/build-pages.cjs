'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'Dashboard Meta Ads'),target=path.join(root,'.codex-tmp/pages');
const files=['index.html','app.js','local-ui.js','styles.css','brand-overrides.css','CNAME','comparison-arrow.json','report-loader.json','toaster.json','gear.svg','hurtz-logo.png','hurtz-tiktok-collector.zip'];
fs.mkdirSync(target,{recursive:true});
for(const file of fs.readdirSync(target)){if(!files.includes(file))throw new Error('Unexpected existing page artifact: '+file)}
for(const file of files)fs.copyFileSync(path.join(source,file),path.join(target,file));
console.log('Public artifact ready: '+files.length+' files; backend and private data excluded.');
