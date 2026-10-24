const {test}=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {inspectWebsitePixels,pixelIdsFromCode,publicURL,resolvePublic,readPublicText}=require('../Dashboard Meta Ads/website-pixel-inspector');

test('detects literal fbq init and Facebook noscript IDs, without treating scripts or arbitrary IDs as pixels',()=>{
 assert.deepEqual(pixelIdsFromCode(`fbq('init', '123456');_fbq("init","987654",{});fbq('init','123456');<img src="https://www.facebook.com/tr?id=111222&amp;ev=PageView">`),['123456','987654','111222']);
 assert.deepEqual(pixelIdsFromCode(`fbq('init','123'+'456'); pixelId='111222'; https://evil.example/tr?id=333444; fbq('track','123456'); connect.facebook.net/en_US/fbevents.js`),[]);
});

test('one site pixel in the current account is suggested; multiple matches stay ambiguous',async()=>{
 const readText=async url=>({url,text:`fbq('init','123456');fbq('init','987654')`});
 const one=await inspectWebsitePixels('https://example.com',[{id:'123456',name:'Loja'}],{readText});
 assert.equal(one.state,'matched');assert.equal(one.suggestedPixelId,'123456');assert.deepEqual(one.foreignPixelIds,['987654']);assert.equal(one.coverage,'public_code');
 const multiple=await inspectWebsitePixels('https://example.com',[{id:'123456'},{id:'987654'}],{readText});
 assert.equal(multiple.state,'multiple');assert.equal(multiple.suggestedPixelId,null);
});

test('unavailable and foreign pixels never become an automatic suggestion',async()=>{
 const result=await inspectWebsitePixels('https://example.com',[{id:'123456',is_unavailable:true}],{readText:async()=>({text:`fbq('init','123456')`})});
 assert.equal(result.state,'not_in_account');assert.equal(result.suggestedPixelId,null);assert.deepEqual(result.matches,[]);
});

test('same-origin script reading is bounded and external scripts are not fetched',async()=>{
 const calls=[];
 const result=await inspectWebsitePixels('https://example.com', [{id:'123456',name:'Loja'}],{readText:async(url,options)=>{
  calls.push({url,options});return {url,text:calls.length===1?`<script src="/a.js"></script><script src="https://external.example/b.js"></script><script src="/b.js"></script><script src="/c.js"></script><script src="/d.js"></script>`:`fbq('init','123456')`};
 }});
 assert.equal(result.state,'matched');assert.equal(calls.length,4);assert.deepEqual(calls.map(call=>call.url),['https://example.com/','https://example.com/a.js','https://example.com/b.js','https://example.com/c.js']);
 assert.ok(calls.every(call=>call.options.deadline===calls[0].options.deadline));assert.ok(calls.every(call=>!('headers' in call.options)));
});

test('an inaccessible site is different from a page whose public code contains no detectable pixel',async()=>{
 const missing=await inspectWebsitePixels('https://example.com',[],{readText:async()=>({text:'<script src="https://www.googletagmanager.com/gtm.js"></script>'})});
 assert.equal(missing.state,'not_detected');
 const failed=await inspectWebsitePixels('https://example.com',[],{readText:async()=>{throw Error('timeout')}});
 assert.equal(failed.state,'unavailable');
});

test('private addresses, alternate numeric IP forms, credentials, ports and non-HTTPS URLs are refused',()=>{
 for(const value of ['http://example.com','https://user:secret@example.com','https://example.com:8443','https://localhost','https://api.internal','https://127.0.0.1','https://2130706433','https://0x7f000001','https://10.0.0.1','https://169.254.169.254','https://172.16.1.1','https://192.168.1.1','https://[::1]','https://[::ffff:127.0.0.1]','https://100.64.0.1','https://198.18.0.1'])assert.throws(()=>publicURL(value),value);
 assert.equal(publicURL('https://example.com/path#fragment').href,'https://example.com/path');
});

test('DNS results must all be public, and a DNS timeout obeys the shared deadline',async()=>{
 await assert.rejects(resolvePublic('https://example.com',{lookup:async()=>[{address:'8.8.8.8'},{address:'127.0.0.1'}]}));
 await assert.rejects(resolvePublic('https://example.com',{lookup:()=>new Promise(()=>{}),deadline:Date.now()+5}),/Tempo/);
 assert.equal(await resolvePublic('https://example.com',{lookup:async()=>[{address:'8.8.8.8'}]}),'8.8.8.8');
});

function transport(responses,calls){
 return (url,options,callback)=>{
  calls.push({url:url.href,options});
  const request=new EventEmitter(),response=new PassThrough(),item=responses.shift();
  response.statusCode=item.status||200;response.headers=item.headers||{'content-type':'text/html'};
  queueMicrotask(()=>{callback(response);response.end(item.body||'')});
  return request;
 };
}

test('HTTPS transport pins public DNS, keeps TLS hostname, and sends no cookies or Meta authorization',async()=>{
 const calls=[],lookup=async()=>[{address:'8.8.8.8'}];
 const result=await readPublicText('https://example.com',{lookup,get:transport([{body:'ok'}],calls)});
 assert.equal(result.text,'ok');assert.equal(calls[0].url,'https://example.com/');
 const pinned=await new Promise((resolve,reject)=>calls[0].options.lookup('example.com',{all:true},(error,addresses)=>error?reject(error):resolve(addresses)));
 assert.deepEqual(pinned,[{address:'8.8.8.8',family:4}]);
 assert.equal(calls[0].options.headers.Authorization,undefined);assert.equal(calls[0].options.headers.Cookie,undefined);assert.equal(calls[0].options.rejectUnauthorized,undefined);
});

test('every redirect is validated before another request, and oversized or non-code responses fail',async()=>{
 const calls=[],lookup=async()=>[{address:'8.8.8.8'}];
 await assert.rejects(readPublicText('https://example.com',{lookup,get:transport([{status:302,headers:{location:'https://127.0.0.1/admin'}}],calls)}));
 assert.equal(calls.length,1);
 await assert.rejects(readPublicText('https://example.com',{lookup,maxBytes:4,get:transport([{body:'too much text'}],[])}),/limite/);
 await assert.rejects(readPublicText('https://example.com',{lookup,get:transport([{headers:{'content-type':'application/octet-stream'},body:'binary'}],[])}),/público/);
});
