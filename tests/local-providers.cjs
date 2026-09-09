// Test process only. Reject all unmocked external traffic.
const original=global.fetch,instances=[],deletedComments=new Set();
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
global.fetch=async(input,options={})=>{
 const url=new URL(input),headers=new Headers(options.headers),token=headers.get('Authorization')||'',who=token.includes('facebook-b-')?'b':'a';
 if(['127.0.0.1','localhost'].includes(url.hostname))return original(input,options);
 if(url.hostname==='graph.facebook.com'){
  const route=url.pathname.replace('/v25.0/','');
  if(route==='app')return response({id:'2093320124537661',name:'Tryv CRM'});
  if(route==='me')return response({id:who,name:'Facebook '+who});
  if(route==='me/businesses')return response({data:[{id:who==='a'?'900':'901'}]});
  if(route.endsWith('/owned_pages'))return response({data:[{id:who==='a'?'100':'200',name:'Page '+who}]});
  if(route.endsWith('/client_pages'))return response({data:[{id:who==='a'?'500':'600',name:'Partner page '+who}]});
  if(route==='me/accounts')return response({data:[{id:who==='a'?'100':'200',name:'Page '+who},{id:who==='a'?'300':'400',name:'Empty page '+who}]});
  if(route==='me/permissions'&&token.includes('limited'))return response({data:[{permission:'ads_read',status:'granted'},{permission:'pages_show_list',status:'granted'}]});
  if(route==='me/permissions')return response({data:[...(token.includes('instagram')?[{permission:'instagram_basic',status:'granted'},{permission:'instagram_manage_comments',status:'granted'}]:[]),{permission:'ads_read',status:'granted'},{permission:'business_management',status:'granted'},{permission:'pages_show_list',status:'granted'},{permission:'pages_read_engagement',status:'granted'},{permission:'pages_read_user_content',status:'granted'},{permission:'pages_manage_engagement',status:'granted'}]});
  if(route==='me/adaccounts')return response({data:[{id:who==='a'?'act_111':'act_222',name:'Account '+who,account_status:1}]});
  if(route.endsWith('/ads'))return response({data:[{id:who==='a'?'101':'202',name:'Ad '+who,created_time:'2026-08-28T12:00:00Z',effective_status:'ACTIVE',campaign:{name:'Campaign'},adset:{name:'Adset'},creative:{...(token.includes('instagram')?{effective_instagram_media_id:'700'}:{}),effective_object_story_id:who==='a'?'100_101':'200_202'}}]});
  if(url.searchParams.get('fields')?.startsWith('instagram_business_account')){if(route==='500')return response({error:{code:10,message:'Denied'}},403);return response(route==='100'?{instagram_business_account:{id:'800',username:'page_instagram'}}:{id:route});}
  if(route==='700')return response({id:'700',owner:{id:token.includes('wrongowner')?'999':'800'},timestamp:'2026-08-28T12:00:00Z',permalink:'https://www.instagram.com/p/example/'});
  if(route==='700/comments')return response({data:deletedComments.has('701')?[]:[{id:'701',text:'Instagram comment',username:'instagram_author',timestamp:new Date().toISOString(),hidden:false,like_count:3},{id:'702',text:'Old comment',timestamp:'2020-01-01T00:00:00Z'}]});
  if(route==='701'){if(options.method==='POST'&&(!new URLSearchParams(options.body).has('hide')||new URLSearchParams(options.body).has('is_hidden')))throw new Error('Wrong Instagram moderation parameter');if(url.searchParams.get('ad_id')!=='101')throw new Error('Missing Instagram ad context');if(options.method==='DELETE')deletedComments.add('701');return response({success:true});}
  if(route==='100'||route==='200')return response({access_token:(route==='100'?'facebook-a-page-token':'facebook-b-page-token')+(token.includes('unconfirmed')?'-unconfirmed':'')+(token.includes('wrongowner')?'-wrongowner':'')});
  if(['100_101','200_202'].includes(route))return response({created_time:'2026-08-29T12:00:00Z'});
  if(route.endsWith('/comments'))return response({data:deletedComments.has(who==='a'?'100_1001':'200_2001')?[]:[{id:who==='a'?'100_1001':'200_2001',message:'Comment '+who,permalink_url:'https://www.facebook.com/example/posts/101?comment_id=1001',created_time:new Date().toISOString(),from:{id:'author-'+who,name:'Author',picture:{data:{url:'https://media.local.test/avatar.png'}}},is_hidden:false}]});
  if(['100_1001','200_2001'].includes(route)){const success=!token.includes('unconfirmed');if(success&&options.method==='DELETE')deletedComments.add(route);return response({success});}
  throw new Error('Unmocked Meta endpoint: '+route);
 }
 if(url.hostname==='api.apify.com')return response([{id:'10000001',webVideoUrl:'https://www.tiktok.com/@test/video/10000001',text:'HB20 seminovo',authorMeta:{name:'test'},videoMeta:{coverUrl:'https://media.local.test/cover.png',duration:10},mediaUrls:['https://media.local.test/video.mp4'],playCount:42}]);
 if(url.hostname==='media.local.test')return new Response(Buffer.from('fake test media'),{headers:{'Content-Type':url.pathname.endsWith('.png')?'image/png':'video/mp4'}});
 if(url.hostname==='evolution.local.test'){
  if(url.pathname==='/instance/create'){const p=JSON.parse(options.body);instances.push({name:p.instanceName,ownerJid:'5511999999999@s.whatsapp.net',connectionStatus:'open'});return response({instance:{status:'open'},qrcode:{base64:'data:image/png;base64,aGVsbG8='}})}
  if(url.pathname==='/instance/fetchInstances')return response(instances);
  if(url.pathname.startsWith('/instance/connectionState/'))return response({instance:{state:'open'}});
  if(url.pathname.startsWith('/group/fetchAllGroups/'))return response([{id:'123@g.us',subject:'Test group'}]);
  if(url.pathname.startsWith('/instance/connect/'))return response({base64:'data:image/png;base64,aGVsbG8='});
  throw new Error('Unexpected Evolution mutation in tests: '+url.pathname);
 }
 throw new Error('External network blocked by test provider: '+url.hostname);
};
