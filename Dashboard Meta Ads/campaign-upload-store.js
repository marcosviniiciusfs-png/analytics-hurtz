'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const fail=(status,message)=>Object.assign(new Error(message),{status});
function createUploadStore(){
 const sessions=new Map(),ttl=30*60*1000;
 function owned(key,user,account){const s=sessions.get(key);if(!s||s.user!==user||s.account!==account)throw fail(410,'O envio expirou. Selecione o arquivo novamente.');return s}
 function cleanFile(s){if(s.file){fs.unlinkSync(s.file);fs.rmdirSync(s.directory);s.file=null}}
 function start(user,account,{size,type}){
  if(!Number.isInteger(size)||size<1||size>100*1024*1024||!['image/jpeg','image/png','video/mp4'].includes(type))throw fail(400,'Use JPG, PNG ou MP4 de até 100 MB.');
  if(sessions.size>=100||[...sessions.values()].filter(s=>s.user===user&&s.file).length>=2)throw fail(429,'Conclua o envio em andamento antes de iniciar outro.');
  const key=crypto.randomUUID(),directory=fs.mkdtempSync(path.join(os.tmpdir(),'hurtz-upload-'));fs.chmodSync(directory,0o700);const file=path.join(directory,'media');fs.writeFileSync(file,Buffer.alloc(0),{mode:0o600});
  const s={user,account,size,type,file,directory,received:0};sessions.set(key,s);
  const timer=setTimeout(()=>{if(s.promise&&!s.result&&!s.error){timer.refresh();return}cleanFile(s);sessions.delete(key)},ttl);timer.unref();
  return {upload:key,chunkSize:1024*1024};
 }
 function part(key,user,account,offset,bytes){const s=owned(key,user,account);
  if(s.promise)throw fail(409,'O arquivo já está sendo enviado à Meta.');
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>1024*1024||!Number.isInteger(offset))throw fail(400,'Parte de arquivo inválida.');
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  if(s.last&&offset===s.last.offset&&hash===s.last.hash)return {received:s.received};
  if(offset!==s.received||s.received+bytes.length>s.size)throw fail(409,'A sequência do arquivo não confere.');
  fs.appendFileSync(s.file,bytes);s.last={offset,hash};s.received+=bytes.length;return {received:s.received};
 }
 function finish(key,user,account,send){const s=owned(key,user,account);if(s.promise)return s.promise;
  if(s.received!==s.size)throw fail(409,'Aguarde o envio completo do arquivo.');
  s.promise=Promise.resolve().then(()=>send({type:s.type,data:fs.readFileSync(s.file)})).then(result=>{s.result=result;return result},error=>{s.error=true;throw error}).finally(()=>cleanFile(s));return s.promise;
 }
 return {start,part,finish};
}
module.exports={createUploadStore};
