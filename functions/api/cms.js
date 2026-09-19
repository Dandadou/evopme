const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const allowedKeys=new Set([
'home.hero.eyebrow','home.hero.title_line_1','home.hero.title_line_2','home.hero.title_line_3','home.hero.text','home.hero.image',
'home.mission.eyebrow','home.mission.title_line_1','home.mission.title_line_2','home.mission.title_line_3','home.mission.lead','home.mission.body_1','home.mission.body_2','home.mission.closing'
]);
export async function handleCms(request,env){
 if(!env.CMS_DB)return json({error:'La base D1 du CMS n’est pas encore liée au Worker.'},503);
 const url=new URL(request.url);
 if(request.method==='GET'&&url.pathname==='/api/cms/content'){
  const {results=[]}=await env.CMS_DB.prepare('SELECT key,value,type,updated_at FROM cms_content ORDER BY key').all();
  return json({ok:true,content:Object.fromEntries(results.map(r=>[r.key,r]))});
 }
 if(request.method==='PUT'&&url.pathname==='/api/cms/content'){
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const entries=Object.entries(body?.content||{}).filter(([key])=>allowedKeys.has(key));
  if(!entries.length)return json({error:'Aucun champ CMS autorisé à enregistrer.'},400);
  const statements=entries.map(([key,item])=>{
   const value=String(typeof item==='object'&&item!==null?item.value:item??'').trim();
   const type=String(typeof item==='object'&&item!==null?item.type:'text');
   return env.CMS_DB.prepare("INSERT INTO cms_content (key,value,type,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,type=excluded.type,updated_at=CURRENT_TIMESTAMP").bind(key,value,type);
  });
  await env.CMS_DB.batch(statements); return json({ok:true,saved:statements.length});
 }
 if(request.method==='GET'&&url.pathname==='/api/cms/submissions'){
  const {results=[]}=await env.CMS_DB.prepare('SELECT id,form_type,name,email,company,phone,service,message,created_at FROM cms_submissions ORDER BY id DESC LIMIT 100').all();
  return json({ok:true,submissions:results});
 }
 return json({error:'Méthode non permise.'},405);
}
export async function saveSubmission(env,data){
 if(!env.CMS_DB)return;
 const get=k=>String(data.get(k)||'').trim();
 const payload={}; for(const [k,v] of data.entries()){if(!(v instanceof File))payload[k]=String(v)}
 await env.CMS_DB.prepare('INSERT INTO cms_submissions (form_type,name,email,company,phone,service,message,payload) VALUES (?,?,?,?,?,?,?,?)')
 .bind(get('form_type')||'contact',get('nom'),get('courriel'),get('entreprise'),get('telephone'),get('service'),get('message'),JSON.stringify(payload)).run();
}
