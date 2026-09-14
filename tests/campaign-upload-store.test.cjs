const {test}=require('node:test'),assert=require('node:assert/strict');
const {createUploadStore}=require('../Dashboard Meta Ads/campaign-upload-store');
test('parts are owned, ordered, replayable and finalized only once',async()=>{
 const store=createUploadStore(),bytes=Buffer.alloc(2*1024*1024+37,127),s=store.start('a','act_1',{size:bytes.length,type:'video/mp4'});
 assert.throws(()=>store.part(s.upload,'b','act_1',0,bytes.subarray(0,s.chunkSize)),{status:410});
 assert.throws(()=>store.part(s.upload,'a','act_2',0,bytes.subarray(0,s.chunkSize)),{status:410});
 assert.throws(()=>store.finish(s.upload,'a','act_1',()=>{}),{status:409});
 assert.throws(()=>store.part(s.upload,'a','act_1',1,bytes.subarray(0,s.chunkSize)),{status:409});
 for(let offset=0;offset<bytes.length;offset+=s.chunkSize){const part=bytes.subarray(offset,offset+s.chunkSize),first=store.part(s.upload,'a','act_1',offset,part);assert.deepEqual(store.part(s.upload,'a','act_1',offset,part),first)}
 let calls=0;const send=async file=>{calls++;assert.deepEqual(file.data,bytes);assert.equal(file.type,'video/mp4');return {key:'media'}};
 const [a,b]=await Promise.all([store.finish(s.upload,'a','act_1',send),store.finish(s.upload,'a','act_1',send)]);assert.deepEqual(a,b);assert.equal(calls,1);assert.deepEqual(await store.finish(s.upload,'a','act_1',send),a);assert.equal(calls,1);
});
test('uncertain provider failure is never automatically sent to Meta twice',async()=>{
 const store=createUploadStore(),s=store.start('a','act_1',{size:3,type:'image/png'});store.part(s.upload,'a','act_1',0,Buffer.from('abc'));let calls=0;const send=async()=>{calls++;throw Error('uncertain')};
 await assert.rejects(store.finish(s.upload,'a','act_1',send),/uncertain/);await assert.rejects(store.finish(s.upload,'a','act_1',send),/uncertain/);assert.equal(calls,1);
});
