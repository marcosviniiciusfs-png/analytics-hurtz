const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createUploadStore}=require('../Dashboard Meta Ads/campaign-upload-store');
test('client resumes an acknowledged part after a lost response without duplicating media',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../Dashboard Meta Ads/campaign-manager-ui.js'),'utf8');const {uploadCampaignMedia}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const store=createUploadStore(),bytes=Buffer.alloc(3*1024*1024+10,73),file=new File([bytes],'creative.mp4',{type:'video/mp4'});let lost=true,starts=0,sends=0,parts=[];
 const request=async(action,data)=>{
  if(action==='upload-start'){starts++;return store.start('user','act_1',data)}
  if(action==='upload-part'){const offset=Number(data.get('offset'));parts.push(offset);const result=store.part(data.get('upload'),'user','act_1',offset,Buffer.from(await data.get('file').arrayBuffer()));if(lost){lost=false;throw new TypeError('Failed to fetch')}return result}
  if(action==='upload-finish')return store.finish(data.upload,'user','act_1',async media=>{sends++;assert.deepEqual(media.data,bytes);return {key:'complete'}});
  throw Error(action);
 };
 await assert.rejects(uploadCampaignMedia(request,file,file.type),TypeError);const progress=[];assert.deepEqual(await uploadCampaignMedia(request,file,file.type,p=>progress.push(p)),{key:'complete'});assert.equal(starts,1);assert.equal(sends,1);assert.deepEqual(parts.slice(0,2),[0,0]);assert.equal(progress.at(-1),100);
});
