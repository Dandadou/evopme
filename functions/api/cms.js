const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const allowedKeys=new Set([
'home.hero.eyebrow','home.hero.title_line_1','home.hero.title_line_2','home.hero.title_line_3','home.hero.text','home.hero.image',
'home.mission.eyebrow','home.mission.title_line_1','home.mission.title_line_2','home.mission.title_line_3','home.mission.lead','home.mission.body_1','home.mission.body_2','home.mission.closing',
'home.pillars.eyebrow','home.pillars.title','home.pillars.intro',
'home.pillar1.label','home.pillar1.title','home.pillar1.text','home.pillar2.label','home.pillar2.title','home.pillar2.text','home.pillar3.label','home.pillar3.title','home.pillar3.text',
'home.why.eyebrow','home.why.title','home.why1.label','home.why1.title','home.why1.text','home.why2.label','home.why2.title','home.why2.text','home.why3.label','home.why3.title','home.why3.text','home.why4.label','home.why4.title','home.why4.text',
'home.evoot.eyebrow','home.evoot.title','home.evoot.text','home.evoot.image',
'home.training.eyebrow','home.training.title','home.training.text1','home.training.text2',
'home.cta.eyebrow','home.cta.title','home.cta.text'
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

export async function getPublicCmsContent(env,hostname='evolutionpme.ca'){
 if(!env.CMS_DB)return json({ok:true,content:{},popup:null});
 const {results=[]}=await env.CMS_DB.prepare('SELECT key,value,type,updated_at FROM cms_content ORDER BY key').all();
 let popup=null;
 try{
  const site=await env.CMS_DB.prepare('SELECT id FROM sites WHERE hostname=? OR slug=? ORDER BY CASE WHEN hostname=? THEN 0 ELSE 1 END LIMIT 1').bind(hostname,'evolution-pme',hostname).first();
  if(site){popup=await env.CMS_DB.prepare("SELECT id,name,title,body,image_url,button_label,button_url,style,dismissible,delay_seconds,frequency_days,starts_at,ends_at,audience FROM site_popups WHERE site_id=? AND enabled=1 AND (starts_at IS NULL OR starts_at='' OR starts_at<=CURRENT_TIMESTAMP) AND (ends_at IS NULL OR ends_at='' OR ends_at>=CURRENT_TIMESTAMP) ORDER BY id DESC LIMIT 1").bind(site.id).first();}
 }catch{}
 return json({ok:true,content:Object.fromEntries(results.map(r=>[r.key,r])),popup});
}


export async function getCmsMedia(request,env){
 if(!env.CMS_MEDIA)return new Response('Média introuvable.',{status:404});
 const url=new URL(request.url);
 const raw=url.pathname.slice('/media/'.length);
 let key='';
 try{key=raw.split('/').filter(Boolean).map(decodeURIComponent).join('/')}catch{return new Response('Chemin invalide.',{status:400})}
 if(!key||key.includes('..'))return new Response('Chemin invalide.',{status:400});
 const object=await env.CMS_MEDIA.get(key);
 if(!object)return new Response('Média introuvable.',{status:404});
 const headers=new Headers();
 object.writeHttpMetadata(headers);
 headers.set('etag',object.httpEtag);
 headers.set('cache-control',headers.get('cache-control')||'public, max-age=31536000, immutable');
 headers.set('x-content-type-options','nosniff');
 return new Response(object.body,{headers});
}

export async function handleCms(request,env){
 if(!env.CMS_DB)return json({error:'La base D1 du CMS n’est pas encore liée au Worker.'},503);
 const url=new URL(request.url);



 // Consultation S&S depuis le backend. Les clés restent dans les secrets Cloudflare.
 if(url.pathname==='/api/cms/ss-catalogue'&&request.method==='GET'){
  const auth=await requireUser(request,env,'cms.content.view');if(auth.response)return auth.response;
  const account=env.SS_ACCOUNT_NUMBER,apiKey=env.SS_API_KEY;
  if(!account||!apiKey)return json({configured:false,error:'Configure SS_ACCOUNT_NUMBER et SS_API_KEY dans les secrets du Worker evopme.'},503);
  const query=String(url.searchParams.get('q')||'').trim().toLowerCase();
  const styleId=Number(url.searchParams.get('styleId')||0);
  if((!Number.isSafeInteger(styleId)||styleId<1)&&query.length<2)return json({configured:true,products:[],hint:'Saisis au moins deux caractères pour rechercher.'});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch('https://api-ca.ssactivewear.com/v2/products/',{headers:{authorization:'Basic '+btoa(account+':'+apiKey),accept:'application/json'},signal:controller.signal});
   if(!response.ok)return json({error:response.status===401||response.status===403?'Identifiants S&S refusés.':'Réponse S&S '+response.status},502);
   const raw=await response.json();
   if(!Array.isArray(raw))return json({error:'Réponse produits S&S invalide.'},502);
   const matches=raw.filter(p=>styleId>0?Number(p.styleID)===styleId:[p.sku,p.styleName,p.brandName,p.colorName,p.sizeName].some(v=>String(v||'').toLowerCase().includes(query)));
   const items=matches.slice(0,styleId>0?1500:250).map(p=>({
     sku:String(p.sku||''),styleId:Number(p.styleID)||0,name:[p.brandName,p.styleName].filter(Boolean).join(' '),color:String(p.colorName||''),size:String(p.sizeName||''),cost:Number(p.customerPrice)||0,retail:Number(p.retailPrice)||0
   }));
   return json({configured:true,products:items,matchLimit:styleId>0?1500:250,matchCount:matches.length,source:'S&S Canada',totalSource:raw.length});
  }catch(error){return json({error:'Connexion à S&S impossible. Vérifie les secrets et la disponibilité de l’API.'},502)}
  finally{clearTimeout(timeout)}
 }

 // Listes de prix internes : coûts et marges accessibles uniquement via Cloudflare Access.
 if(url.pathname==='/api/cms/pricing'&&['GET','POST','DELETE'].includes(request.method)){
  const auth=await requireUser(request,env,request.method==='GET'?'cms.content.view':'cms.content.edit');
  if(auth.response)return auth.response;
  await env.CMS_DB.prepare("CREATE TABLE IF NOT EXISTS internal_pricing_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, category TEXT NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'unité', min_qty INTEGER NOT NULL DEFAULT 1, cost_cents INTEGER NOT NULL DEFAULT 0, margin_percent REAL NOT NULL DEFAULT 30, price_cents INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  const org=auth.user.organization_id;
  if(request.method==='GET'){
   const {results=[]}=await env.CMS_DB.prepare('SELECT id,category,name,unit,min_qty,cost_cents,margin_percent,price_cents,updated_at FROM internal_pricing_rules WHERE organization_id=? ORDER BY category,name,min_qty LIMIT 5000').bind(org).all();
   return json({ok:true,rules:results});
  }
  let body;try{body=await request.json()}catch{return json({error:'Données JSON invalides.'},400)}
  if(request.method==='DELETE'){
   const id=Number(body?.id);
   if(!Number.isSafeInteger(id)||id<1)return json({error:'Identifiant invalide.'},400);
   await env.CMS_DB.prepare('DELETE FROM internal_pricing_rules WHERE id=? AND organization_id=?').bind(id,org).run();
   return json({ok:true});
  }
  const p=body?.rule||{},id=Number(p.id||0);
  const category=String(p.category||'').trim().slice(0,80),name=String(p.name||'').trim().slice(0,180),unit=String(p.unit||'unité').trim().slice(0,30);
  const minQty=Number(p.min_qty),cost=Number(p.cost_cents),margin=Number(p.margin_percent);
  if(!category||!name||!unit||!Number.isSafeInteger(minQty)||minQty<1||minQty>1000000||!Number.isSafeInteger(cost)||cost<0||cost>100000000||!Number.isFinite(margin)||margin<0||margin>=100)return json({error:'Champs invalides. La marge doit être entre 0 et moins de 100 %.'},400);
  const fixed= p.fixed_price_cents===undefined||p.fixed_price_cents===null ? null : Number(p.fixed_price_cents);
  if(fixed!==null&&(!Number.isSafeInteger(fixed)||fixed<cost||fixed>1000000000))return json({error:'Prix fixe invalide : il doit couvrir le coût.'},400);
  const price=fixed===null?Math.ceil(cost/(1-margin/100)):fixed;
  const actualMargin=price?Math.round((price-cost)/price*100000)/1000:0;
  if(!Number.isSafeInteger(price)||price>1000000000)return json({error:'Prix trop élevé.'},400);
  if(id){
   if(!Number.isSafeInteger(id)||id<1)return json({error:'Identifiant invalide.'},400);
   const result=await env.CMS_DB.prepare('UPDATE internal_pricing_rules SET category=?,name=?,unit=?,min_qty=?,cost_cents=?,margin_percent=?,price_cents=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?').bind(category,name,unit,minQty,cost,actualMargin,price,id,org).run();
   if(!result.meta?.changes)return json({error:'Tarif introuvable.'},404);
   return json({ok:true,id,price_cents:price});
  }
  const result=await env.CMS_DB.prepare('INSERT INTO internal_pricing_rules (organization_id,category,name,unit,min_qty,cost_cents,margin_percent,price_cents) VALUES (?,?,?,?,?,?,?,?)').bind(org,category,name,unit,minQty,cost,actualMargin,price).run();
  return json({ok:true,id:result.meta?.last_row_id,price_cents:price});
 }

 // Catalogue interne indépendant de S&S. Protégé par Cloudflare Access et les permissions CMS.
 // Paliers de prix propres à chaque produit, sans données fournisseur présumées.
 if(url.pathname==='/api/cms/catalogue-prices'&&['GET','PUT'].includes(request.method)){
  const auth=await requireUser(request,env,request.method==='GET'?'cms.content.view':'cms.content.edit');
  if(auth.response)return auth.response;
  await env.CMS_DB.prepare("CREATE TABLE IF NOT EXISTS internal_catalogue_price_tiers (organization_id INTEGER NOT NULL, product_id INTEGER NOT NULL, min_qty INTEGER NOT NULL, price_cents INTEGER NOT NULL, PRIMARY KEY (organization_id,product_id,min_qty))").run();
  const org=auth.user.organization_id;
  if(request.method==='GET'){
   const productId=Number(url.searchParams.get('product_id'));
   if(!Number.isSafeInteger(productId)||productId<1)return json({error:'Produit invalide.'},400);
   const product=await env.CMS_DB.prepare('SELECT id FROM internal_catalogue WHERE id=? AND organization_id=?').bind(productId,org).first();
   if(!product)return json({error:'Produit introuvable.'},404);
   const {results=[]}=await env.CMS_DB.prepare('SELECT min_qty,price_cents FROM internal_catalogue_price_tiers WHERE organization_id=? AND product_id=? ORDER BY min_qty').bind(org,productId).all();
   return json({ok:true,tiers:results});
  }
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const productId=Number(body.product_id),tiers=body.tiers;
  if(!Number.isSafeInteger(productId)||productId<1||!Array.isArray(tiers)||tiers.length>20)return json({error:'Paliers invalides.'},400);
  const product=await env.CMS_DB.prepare('SELECT id FROM internal_catalogue WHERE id=? AND organization_id=?').bind(productId,org).first();
  if(!product)return json({error:'Produit introuvable.'},404);
  const seen=new Set();
  for(const t of tiers){
   if(!Number.isSafeInteger(t.min_qty)||t.min_qty<1||t.min_qty>100000000||!Number.isSafeInteger(t.price_cents)||t.price_cents<0||t.price_cents>1000000000||seen.has(t.min_qty))return json({error:'Quantités ou prix invalides.'},400);
   seen.add(t.min_qty);
  }
  const statements=[env.CMS_DB.prepare('DELETE FROM internal_catalogue_price_tiers WHERE organization_id=? AND product_id=?').bind(org,productId),...tiers.map(t=>env.CMS_DB.prepare('INSERT INTO internal_catalogue_price_tiers (organization_id,product_id,min_qty,price_cents) VALUES (?,?,?,?)').bind(org,productId,t.min_qty,t.price_cents))];
  await env.CMS_DB.batch(statements);
  return json({ok:true});
 }
 if(url.pathname==='/api/cms/catalogue'&&['GET','POST','DELETE'].includes(request.method)){
  const auth=await requireUser(request,env,request.method==='GET'?'cms.content.view':'cms.content.edit');
  if(auth.response)return auth.response;
  await env.CMS_DB.prepare("CREATE TABLE IF NOT EXISTS internal_catalogue (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL, sku TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', cost_cents INTEGER NOT NULL DEFAULT 0, price_cents INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  const org=auth.user.organization_id;
  if(request.method==='GET'){
   const {results=[]}=await env.CMS_DB.prepare('SELECT id,sku,name,category,description,image_url,cost_cents,price_cents,stock,active,updated_at FROM internal_catalogue WHERE organization_id=? ORDER BY name COLLATE NOCASE,id DESC LIMIT 1000').bind(org).all();
   return json({ok:true,products:results});
  }
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  if(request.method==='DELETE'){
   const id=Number(body?.id);if(!Number.isSafeInteger(id)||id<1)return json({error:'Identifiant invalide.'},400);
   await env.CMS_DB.prepare('DELETE FROM internal_catalogue WHERE id=? AND organization_id=?').bind(id,org).run();
   return json({ok:true});
  }
  const p=body?.product||{},id=Number(p.id||0),name=String(p.name||'').trim().slice(0,180);
  if(!name)return json({error:'Le nom du produit est requis.'},400);
  const cents=value=>{const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=10000000&&Number.isInteger(n)?n:null};
  const cost=cents(p.cost_cents??0),price=cents(p.price_cents??0),stock=Number(p.stock??0);
  if(cost===null||price===null||!Number.isSafeInteger(stock)||stock<0||stock>100000000)return json({error:'Prix ou quantité invalide.'},400);
  const fields=[String(p.sku||'').trim().slice(0,100),name,String(p.category||'').trim().slice(0,120),String(p.description||'').trim().slice(0,3000),String(p.image_url||'').trim().slice(0,1000),cost,price,stock,p.active===false?0:1];
  if(id){
   if(!Number.isSafeInteger(id)||id<1)return json({error:'Identifiant invalide.'},400);
   const result=await env.CMS_DB.prepare('UPDATE internal_catalogue SET sku=?,name=?,category=?,description=?,image_url=?,cost_cents=?,price_cents=?,stock=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?').bind(...fields,id,org).run();
   if(!result.meta?.changes)return json({error:'Produit introuvable.'},404);
   return json({ok:true,id});
  }
  const result=await env.CMS_DB.prepare('INSERT INTO internal_catalogue (sku,name,category,description,image_url,cost_cents,price_cents,stock,active,organization_id) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(...fields,org).run();
  return json({ok:true,id:result.meta?.last_row_id});
 }

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
 if(request.method==='GET'&&url.pathname==='/api/cms/sites'){
  const auth=await requireUser(request,env,'cms.content.view'); if(auth.response)return auth.response;
  let results=[];
  if(auth.user.role==='super_admin'){
   ({results=[]}=await env.CMS_DB.prepare('SELECT s.id,s.organization_id,o.name organization_name,s.slug,s.name,s.hostname,s.theme_key,s.status,s.settings,s.created_at,s.updated_at FROM sites s JOIN organizations o ON o.id=s.organization_id ORDER BY o.name,s.id').all());
  }else{
   ({results=[]}=await env.CMS_DB.prepare('SELECT s.id,s.organization_id,o.name organization_name,s.slug,s.name,s.hostname,s.theme_key,s.status,s.settings,s.created_at,s.updated_at FROM sites s JOIN organizations o ON o.id=s.organization_id WHERE s.organization_id=? ORDER BY s.id').bind(auth.user.organization_id).all());
  }
  return json({ok:true,sites:results});
 }
 async function managedSite(auth,requestedId){
  const id=Number(requestedId||0);
  if(auth.user.role==='super_admin'&&id)return env.CMS_DB.prepare('SELECT id,organization_id,name,hostname,theme_key FROM sites WHERE id=?').bind(id).first();
  if(id)return env.CMS_DB.prepare('SELECT id,organization_id,name,hostname,theme_key FROM sites WHERE id=? AND organization_id=?').bind(id,auth.user.organization_id).first();
  return env.CMS_DB.prepare('SELECT id,organization_id,name,hostname,theme_key FROM sites WHERE organization_id=? ORDER BY id LIMIT 1').bind(auth.user.organization_id).first();
 }
 if(request.method==='GET'&&url.pathname==='/api/cms/popups'){
  const auth=await requireUser(request,env,'cms.content.view'); if(auth.response)return auth.response;
  const site=await managedSite(auth,url.searchParams.get('site_id'));
  if(!site)return json({ok:true,popups:[]});
  const {results=[]}=await env.CMS_DB.prepare('SELECT * FROM site_popups WHERE site_id=? ORDER BY id DESC').bind(site.id).all();
  return json({ok:true,site,popups:results});
 }
 if(request.method==='PUT'&&url.pathname==='/api/cms/popups'){
  const auth=await requireUser(request,env,'cms.content.edit'); if(auth.response)return auth.response;
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const p=body?.popup||{};
  const site=await managedSite(auth,p.site_id);
  if(!site)return json({error:'Site introuvable ou non autorisé.'},404);
  const id=Number(p.id||0);
  const style=['info','promo','important'].includes(p.style)?p.style:'info';
  const vals=[String(p.name||'Pop-up').trim(),String(p.title||'').trim(),String(p.body||'').trim(),String(p.image_url||'').trim(),String(p.button_label||'').trim(),String(p.button_url||'').trim(),style,p.enabled?1:0,p.dismissible===false?0:1,Math.max(0,Number(p.delay_seconds)||0),Math.max(0,Number(p.frequency_days)||0),p.starts_at||null,p.ends_at||null,['all','desktop','mobile'].includes(p.audience)?p.audience:'all'];
  if(id){
   const owned=await env.CMS_DB.prepare('SELECT id FROM site_popups WHERE id=? AND site_id=?').bind(id,site.id).first();
   if(!owned)return json({error:'Pop-up introuvable.'},404);
   await env.CMS_DB.prepare('UPDATE site_popups SET name=?,title=?,body=?,image_url=?,button_label=?,button_url=?,style=?,enabled=?,dismissible=?,delay_seconds=?,frequency_days=?,starts_at=?,ends_at=?,audience=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...vals,id).run();
   return json({ok:true,id});
  }
  const result=await env.CMS_DB.prepare('INSERT INTO site_popups (site_id,name,title,body,image_url,button_label,button_url,style,enabled,dismissible,delay_seconds,frequency_days,starts_at,ends_at,audience) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(site.id,...vals).run();
  return json({ok:true,id:result.meta?.last_row_id});
 }
 if(request.method==='DELETE'&&url.pathname==='/api/cms/popups'){
  const auth=await requireUser(request,env,'cms.content.edit'); if(auth.response)return auth.response;
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const id=Number(body?.id||0); if(!id)return json({error:'Identifiant du pop-up manquant.'},400);
  const popup=await env.CMS_DB.prepare('SELECT p.id,p.site_id,s.organization_id FROM site_popups p JOIN sites s ON s.id=p.site_id WHERE p.id=?').bind(id).first();
  if(!popup)return json({error:'Pop-up introuvable.'},404);
  if(auth.user.role!=='super_admin'&&popup.organization_id!==auth.user.organization_id)return json({error:'Permission insuffisante.'},403);
  await env.CMS_DB.prepare('DELETE FROM site_popups WHERE id=?').bind(id).run();
  return json({ok:true});
 }
 if(request.method==='POST'&&url.pathname==='/api/cms/media'){
  const auth=await requireUser(request,env,'cms.media.upload'); if(auth.response)return auth.response;
  if(!env.CMS_MEDIA)return json({error:'Le stockage d’images R2 n’est pas encore lié au Worker.'},503);
  let data;try{data=await request.formData()}catch{return json({error:'Téléversement invalide.'},400)}
  const site=await managedSite(auth,data.get('site_id'));
  if(!site)return json({error:'Site introuvable ou non autorisé.'},404);
  const file=data.get('file');
  if(!(file instanceof File)||!file.size)return json({error:'Choisis une image à téléverser.'},400);
  const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'};
  const ext=allowed[file.type];
  if(!ext)return json({error:'Format non accepté. Utilise JPG, PNG, WebP, GIF ou AVIF.'},400);
  if(file.size>8*1024*1024)return json({error:'Image trop lourde. Maximum 8 Mo.'},413);
  const key=`sites/${site.id}/popups/${crypto.randomUUID()}.${ext}`;
  await env.CMS_MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{originalName:file.name||'image',siteId:String(site.id)}});
  const publicPath='/media/'+key.split('/').map(encodeURIComponent).join('/');
  return json({ok:true,url:publicPath,key});
 }
 if(request.method==='GET'&&url.pathname==='/api/cms/invoice-payments'){
  const auth=await requireUser(request,env,'payments.manage'); if(auth.response)return auth.response;
  const site=await managedSite(auth,url.searchParams.get('site_id'));
  if(!site)return json({ok:true,payments:[]});
  let results=[];
  try{
   ({results=[]}=await env.CMS_DB.prepare('SELECT id,site_id,invoice_number,client_name,client_email,amount_cents,currency,description,due_date,status,token,stripe_checkout_session_id,stripe_payment_intent_id,paid_at,created_at,updated_at FROM invoice_payment_requests WHERE site_id=? ORDER BY id DESC LIMIT 200').bind(site.id).all());
  }catch{return json({ok:true,site,payments:[],migration_required:true})}
  return json({ok:true,site,payments:results});
 }
 if(request.method==='POST'&&url.pathname==='/api/cms/invoice-payments'){
  const auth=await requireUser(request,env,'payments.manage'); if(auth.response)return auth.response;
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const p=body?.payment||{};
  const site=await managedSite(auth,p.site_id);
  if(!site)return json({error:'Site introuvable ou non autorisé.'},404);
  const invoiceNumber=String(p.invoice_number||'').trim().slice(0,100);
  const clientName=String(p.client_name||'').trim().slice(0,160);
  const clientEmail=String(p.client_email||'').trim().toLowerCase().slice(0,320);
  const amountCents=Number(p.amount_cents||0);
  const description=String(p.description||'').trim().slice(0,500);
  const dueDate=/^\d{4}-\d{2}-\d{2}$/.test(String(p.due_date||''))?String(p.due_date):null;
  if(!invoiceNumber)return json({error:'Le numéro de facture est requis.'},400);
  if(!Number.isInteger(amountCents)||amountCents<=0||amountCents>999999999)return json({error:'Montant invalide.'},400);
  if(clientEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))return json({error:'Adresse courriel invalide.'},400);
  const token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
  let result;
  try{
   result=await env.CMS_DB.prepare("INSERT INTO invoice_payment_requests (site_id,invoice_number,client_name,client_email,amount_cents,currency,description,due_date,token,status) VALUES (?,?,?,?,?,'cad',?,?,?,'pending')").bind(site.id,invoiceNumber,clientName,clientEmail,amountCents,description,dueDate,token).run();
  }catch{return json({error:'Le module Paiements doit d’abord être initialisé dans D1.'},503)}
  const host=site.hostname?('https://'+site.hostname):new URL(request.url).origin;
  return json({ok:true,id:result.meta?.last_row_id,token,payment_url:`${host}/paiement.html?token=${token}`});
 }
 if(request.method==='DELETE'&&url.pathname==='/api/cms/invoice-payments'){
  const auth=await requireUser(request,env,'payments.manage'); if(auth.response)return auth.response;
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const id=Number(body?.id||0); if(!id)return json({error:'Identifiant manquant.'},400);
  const row=await env.CMS_DB.prepare('SELECT ip.id,ip.status,s.organization_id FROM invoice_payment_requests ip JOIN sites s ON s.id=ip.site_id WHERE ip.id=?').bind(id).first();
  if(!row)return json({error:'Demande de paiement introuvable.'},404);
  if(auth.user.role!=='super_admin'&&row.organization_id!==auth.user.organization_id)return json({error:'Permission insuffisante.'},403);
  if(row.status==='paid')return json({error:'Un paiement confirmé ne peut pas être désactivé.'},409);
  await env.CMS_DB.prepare("UPDATE invoice_payment_requests SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  return json({ok:true});
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
