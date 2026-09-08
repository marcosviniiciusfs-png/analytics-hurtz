'use strict';
const crypto=require('node:crypto');
const {AsyncLocalStorage}=require('node:async_hooks');
const context=new AsyncLocalStorage();
const tables=['task_columns','tasks','task_projects','task_modules','task_cycles','task_subtasks','task_comments','task_attachments','task_activities','task_notifications','creative_videos'];
const parents={column_id:'task_columns',task_id:'tasks',project_id:'task_projects',module_id:'task_modules',cycle_id:'task_cycles'};
const fail=(status,message)=>Object.assign(new Error(message),{status});
function createStore(vault){
 const workspaceSnapshot=Symbol('workspaceSnapshot');
 function user(){const u=context.getStore();if(!u?.id)throw fail(401,'Entre no seu espaço local.');return u}
 function get(kind,fallback){const u=user();if(kind==='workspace'&&u[workspaceSnapshot])return structuredClone(u[workspaceSnapshot]);const value=vault.read(kind,u.id)??fallback;if(kind==='workspace'&&value)u[workspaceSnapshot]=structuredClone(value);return value}
 function put(kind,value){const u=user();vault.write(kind,u.id,value);if(kind==='workspace')u[workspaceSnapshot]=structuredClone(value);return value}
 function state(){let s=get('workspace',null);if(!s){s=Object.fromEntries(tables.map(t=>[t,[]]));s.task_columns=['A fazer','Em andamento','Concluído'].map((title,position)=>({id:crypto.randomUUID(),title,position,role:['standard','in_progress','completed'][position]}));put('workspace',s)}return s}
 function matches(row,key,value){
  if(['select','order','limit','on_conflict'].includes(key))return true;
  if(key==='or')return value.replace(/^\(|\)$/g,'').split(',').some(v=>{const i=v.indexOf('.');return matches(row,v.slice(0,i),v.slice(i+1))});
  const i=value.indexOf('.'),op=value.slice(0,i),v=value.slice(i+1),a=row[key];
  if(op==='eq')return String(a)===v;if(op==='lt')return a!=null&&String(a)<v;
  if(op==='in')return v.replace(/^\(|\)$/g,'').split(',').includes(String(a));
  if(op==='is')return v==='null'?a==null:String(a)===v;
  throw fail(400,'Filtro local inválido.');
 }
 async function request(resource,options={}){
  const url=new URL(resource,'http://local/'),table=url.pathname.slice(1),method=(options.method||'GET').toUpperCase();
  if(!tables.includes(table))throw fail(403,'Recurso fora do espaço individual.');
  if(method!=='GET')delete user()[workspaceSnapshot];
  const s=state(),rows=s[table],where=row=>[...url.searchParams].every(([k,v])=>matches(row,k,v));let result=rows.filter(where);
  if(method==='GET'){
   const order=(url.searchParams.get('order')||'').split(',').filter(Boolean);
   result.sort((a,b)=>{for(const entry of order){const[k,d]=entry.split('.'),v=typeof a[k]==='number'?a[k]-b[k]:String(a[k]||'').localeCompare(String(b[k]||''));if(v)return d==='desc'?-v:v}return 0});
   result=result.slice(0,Math.min(10000,Number(url.searchParams.get('limit'))||10000));const select=url.searchParams.get('select');
   return select&&select!=='*'?result.map(r=>Object.fromEntries(select.split(',').map(k=>[k,r[k]??null]))):result;
  }
  function validate(row){for(const[k,t]of Object.entries(parents))if(row[k]&&!s[t].some(r=>r.id===row[k]))throw fail(403,'O item relacionado não pertence ao seu usuário.');if(row.module_id&&row.project_id&&s.task_modules.find(r=>r.id===row.module_id)?.project_id!==row.project_id)throw fail(400,'Módulo de outro projeto.');}
  const now=new Date().toISOString();
  if(method==='POST'){
   const body=JSON.parse(options.body||'{}'),incoming=Array.isArray(body)?body:[body],conflict=(url.searchParams.get('on_conflict')||'').split(',').filter(Boolean);result=[];
   for(const item of incoming){validate(item);const existing=conflict.length?rows.find(r=>conflict.every(k=>r[k]===item[k])):null;const row={...item,id:existing?.id||crypto.randomUUID(),created_at:existing?.created_at||now,updated_at:now};
    if(table==='tasks'){row.labels??=[];row.priority??='medium';row.expires_at=null}if(table==='task_subtasks')row.is_done??=false;if(table==='task_projects')row.is_active??=true;if(table==='task_notifications')row.is_read??=false;
    if(existing)Object.assign(existing,row);else rows.push(row);result.push(row);
   }
  }else if(method==='PATCH'){
   if(!result.length)throw fail(404,'Item não encontrado no seu espaço.');const changes=JSON.parse(options.body||'{}');delete changes.id;delete changes.created_at;
   for(const row of result){validate({...row,...changes});Object.assign(row,changes,{updated_at:now});if(table==='tasks'&&Object.hasOwn(changes,'completed_at'))row.expires_at=changes.completed_at?new Date(Date.parse(changes.completed_at)+72*3600000).toISOString():null}
  }else if(method==='DELETE'){
   const ids=new Set(result.map(r=>r.id));s[table]=rows.filter(r=>!ids.has(r.id));
   if(table==='tasks')for(const name of tables)if(name.startsWith('task_'))s[name]=s[name].filter(r=>!ids.has(r.task_id));
   for(const[k,parent]of Object.entries(parents))if(parent===table)for(const name of tables)for(const row of s[name])if(ids.has(row[k]))row[k]=null;
  }else throw fail(405,'Método não permitido.');
  put('workspace',s);return result;
 }
 async function attachment(resource,options={}){
  const prefix='object/task-attachments',method=options.method||'GET',s=state();
  if(!resource.startsWith(prefix))throw fail(403,'Armazenamento inválido.');
  const validate=file=>{if(!/^[\da-f-]{36}\/[\da-f-]{36}-[^/]+$/i.test(file)||!s.tasks.some(t=>t.id===file.split('/')[0]))throw fail(403,'O anexo não pertence ao seu usuário.')};
  const attachments=get('attachments',{});
  if(method==='DELETE'){const files=JSON.parse(options.body).prefixes;if(!Array.isArray(files))throw fail(400,'Anexos inválidos.');files.forEach(validate);files.forEach(f=>delete attachments[f]);put('attachments',attachments);return new Response('{}')}
  const file=resource.slice(prefix.length+1);validate(file);
  if(method==='POST'){const bytes=Buffer.from(options.body);if(bytes.length>5*1024*1024)throw fail(413,'O limite por anexo é 5 MB.');if(Object.keys(attachments).length>=200)throw fail(413,'Limite de anexos locais atingido.');attachments[file]=bytes.toString('base64');put('attachments',attachments);return new Response('{}')}
  if(!attachments[file])throw fail(404,'Anexo não encontrado.');return new Response(Buffer.from(attachments[file],'base64'));
 }
 return {context,user,get,put,request,attachment};
}
module.exports={createStore,context,fail};
