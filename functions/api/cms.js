const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const allowedKeys=new Set([
'home.hero.eyebrow','home.hero.title_line_1','home.hero.title_line_2','home.hero.title_line_3','home.hero.text','home.hero.image',
'home.mission.eyebrow','home.mission.title_line_1','home.mission.title_line_2','home.mission.title_line_3','home.mission.lead','home.mission.body_1','home.mission.body_2','home.mission.closing'
]);

let accessKeysCache={expires:0,keys:null};

function decodeBase64Url(value){
 const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
 const padded=normalized+'='.repeat((4-normalized.length%4)%4);
 const binary=atob(padded);
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function decodeJsonPart(value){
 return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}
async function getAccessKeys(teamDomain){
 const now=Date.now();
 if(accessKeysCache.keys&&accessKeysCache.expires>now)return accessKeysCache.keys;
 const response=await fetch(`${teamDomain}/cdn-cgi/access/certs`,{headers:{accept:'application/json'}});
 if(!response.ok)throw new Error('Impossible de récupérer les clés Cloudflare Access.');
 const jwks=await response.json();
 if(!Array.isArray(jwks.keys))throw new Error('Réponse JWKS Cloudflare Access invalide.');
 accessKeysCache={keys:jwks.keys,expires:now+5*60*1000};
 return jwks.keys;
}
async function verifyAccessJwt(request,env){
 if(!env.TEAM_DOMAIN||!env.POLICY_AUD)throw new Error('Configuration Cloudflare Access incomplète.');
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token)throw new Error('Jeton Cloudflare Access manquant.');
 const parts=token.split('.');
 if(parts.length!==3)throw new Error('Jeton Cloudflare Access invalide.');
 const [encodedHeader,encodedPayload,encodedSignature]=parts;
 const header=decodeJsonPart(encodedHeader);
 const payload=decodeJsonPart(encodedPayload);
 if(header.alg!=='RS256'||!header.kid)throw new Error('Algorithme ou clé JWT invalide.');
 const keys=await getAccessKeys(env.TEAM_DOMAIN);
 const jwk=keys.find(key=>key.kid===header.kid);
 if(!jwk)throw new Error('Clé de signature Cloudflare Access introuvable.');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decodeBase64Url(encodedSignature),new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
 if(!valid)throw new Error('Signature Cloudflare Access invalide.');
 const now=Math.floor(Date.now()/1000);
 if(typeof payload.exp!=='number'||payload.exp<=now)throw new Error('Jeton Cloudflare Access expiré.');
 if(typeof payload.nbf==='number'&&payload.nbf>now+60)throw new Error('Jeton Cloudflare Access pas encore valide.');
 if(payload.iss!==env.TEAM_DOMAIN)throw new Error('Émetteur Cloudflare Access invalide.');
 const audiences=Array.isArray(payload.aud)?payload.aud:[payload.aud];
 if(!audiences.includes(env.POLICY_AUD))throw new Error('Audience Cloudflare Access invalide.');
 if(typeof payload.email!=='string'||!payload.email.trim())throw new Error('Identité Cloudflare Access sans courriel.');
 return payload;
}

async function currentUser(request,env){
 let identity;
 try{identity=await verifyAccessJwt(request,env)}catch{return null}
 const email=identity.email.trim().toLowerCase();
 const user=await env.CMS_DB.prepare(`
  SELECT u.id,u.email,u.display_name,u.status,o.id organization_id,o.slug organization_slug,o.name organization_name,r.slug role
  FROM users u
  JOIN memberships m ON m.user_id=u.id
  JOIN organizations o ON o.id=m.organization_id
  JOIN roles r ON r.id=m.role_id
  WHERE lower(u.email)=? AND u.status='active' AND o.status='active'
  ORDER BY CASE WHEN r.slug='super_admin' THEN 0 ELSE 1 END,m.id
  LIMIT 1`).bind(email).first();
 if(!user)return null;
 const {results=[]}=await env.CMS_DB.prepare(`
  SELECT p.slug FROM permissions p
  JOIN role_permissions rp ON rp.permission_id=p.id
  JOIN roles r ON r.id=rp.role_id
  WHERE r.slug=? ORDER BY p.slug`).bind(user.role).all();
 user.permissions=results.map(x=>x.slug);
 return user;
}
const can=(user,permission)=>!!user&&(user.role==='super_admin'||user.permissions.includes(permission));
async function requireUser(request,env,permission){
 const user=await currentUser(request,env);
 if(!user)return {response:json({error:'Authentification Cloudflare Access requise ou invalide.'},401)};
 if(permission&&!can(user,permission))return {response:json({error:'Permission insuffisante.'},403)};
 return {user};
}

export async function handleCms(request,env){
 if(!env.CMS_DB)return json({error:'La base D1 du CMS n’est pas encore liée au Worker.'},503);
 const url=new URL(request.url);

 if(request.method==='GET'&&url.pathname==='/api/cms/me'){
  const auth=await requireUser(request,env); if(auth.response)return auth.response;
  return json({ok:true,user:auth.user});
 }
 if(request.method==='GET'&&url.pathname==='/api/cms/content'){
  const auth=await requireUser(request,env,'cms.content.view'); if(auth.response)return auth.response;
  const {results=[]}=await env.CMS_DB.prepare('SELECT key,value,type,updated_at FROM cms_content ORDER BY key').all();
  return json({ok:true,user:auth.user,content:Object.fromEntries(results.map(r=>[r.key,r]))});
 }
 if(request.method==='PUT'&&url.pathname==='/api/cms/content'){
  const auth=await requireUser(request,env,'cms.content.edit'); if(auth.response)return auth.response;
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
  const auth=await requireUser(request,env,'submissions.view'); if(auth.response)return auth.response;
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
