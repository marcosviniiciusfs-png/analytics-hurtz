const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createQueryPolicy}=require('./meta-query-policy');
const base={kind:'spend',from:'2026-09-01',to:'2026-09-15',reportOnly:false,ids:['act_1']};
const result=input=>({accounts:Object.fromEntries(input.ids.map(id=>[id,{id,reconciled:true,spend:20}]))});

test('overlapping requests share account work and repeat/refresh use the cache',async()=>{
 let clock=1000000,calls=[];const policy=createQueryPolicy({now:()=>clock});
 const load=async input=>{calls.push(input.ids);return result(input)};
 const a=policy.report('user:revision',base,load);
 const b=policy.report('user:revision',{...base,ids:['act_1','act_2']},load);
 const [one,two]=await Promise.all([a,b]);
 assert.deepEqual(calls,[['act_1'],['act_2']]);assert.equal(one.accounts.act_1.spend,20);assert.equal(two.accounts.act_2.spend,20);
 await policy.report('user:revision',base,load,true);assert.equal(calls.length,2);
 clock+=61000;await policy.report('user:revision',base,load);assert.equal(calls.length,2);
 await policy.report('user:revision',base,load,true);assert.equal(calls.length,3);
 clock+=301000;await policy.report('user:revision',base,load);assert.equal(calls.length,4);
});
test('users, connection revisions, periods and report kinds never share data',async()=>{
 const policy=createQueryPolicy();let calls=0;const load=async input=>{calls++;return result(input)};
 for(const scope of ['a:1','b:1','a:2'])await policy.report(scope,base,load);
 await policy.report('a:1',{...base,from:'2026-08-01'},load);
 await policy.report('a:1',{...base,kind:'analysis'},load);
 await policy.report('a:1',{...base,reportOnly:true},load);assert.equal(calls,6);
});
test('rate limiting stops queued work, preserves successful cache and expires',async()=>{
 let clock=1000000,calls=0;const policy=createQueryPolicy({now:()=>clock});
 await policy.report('a',base,async input=>result(input));
 const limited=async input=>{calls++;return {accounts:{[input.ids[0]]:{id:input.ids[0],rate_limited:true,retry_after:180}}}};
 const results=await Promise.allSettled([
  policy.report('a',{...base,ids:['act_2']},limited),
  policy.report('b',base,limited)
 ]);
 assert.ok(results.every(x=>x.status==='rejected'&&x.reason.status===429));assert.equal(calls,1);
 assert.equal((await policy.report('a',base,limited)).accounts.act_1.spend,20);
 clock+=181000;await policy.report('a',{...base,ids:['act_2']},async input=>{calls++;return result(input)});assert.equal(calls,2);
});
test('failed and unreconciled results are not cached, and one runner is active at a time',async()=>{
 const policy=createQueryPolicy();let active=0,peak=0,calls=0;
 const load=async input=>{active++;peak=Math.max(peak,active);calls++;await new Promise(r=>setImmediate(r));active--;return {accounts:{[input.ids[0]]:{id:input.ids[0],reconciled:false,error:'temporary'}}}};
 await Promise.all(['a','b','c'].map(scope=>policy.report(scope,base,load)));
 await policy.report('a',base,load);assert.equal(calls,4);assert.equal(peak,1);
});
test('cache remains bounded and rejection releases in-flight work',async()=>{
 const policy=createQueryPolicy({maxEntries:1});let calls=0;const load=async input=>{calls++;return result(input)};
 await assert.rejects(policy.report('a',base,async()=>{throw Error('failure')}));
 await policy.report('a',base,load);await policy.report('b',base,load);await policy.report('a',base,load);assert.equal(calls,3);
});
