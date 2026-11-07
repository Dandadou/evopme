const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const DATES=new Set(['2026-11-21','2026-11-28','2026-12-04','2026-12-05','2026-12-11','2026-12-12','2026-12-18','2026-12-19']);
const CAPACITY=24, MIN_TARGET=10;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds=new Set(['tshirt','manches','ouate','cache','bavette','sac']);
const extraPrices={tshirt:1500,manches:1500,ouate:1800,cache:1500,bavette:1500,sac:1000};
async function ensure(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS workshop_sessions (date TEXT PRIMARY KEY, capacity INTEGER NOT NULL DEFAULT 24, reserved INTEGER NOT NULL DEFAULT 0, minimum_target INTEGER NOT NULL DEFAULT 10)`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS workshop_bookings (id TEXT PRIMARY KEY, date TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, participants_json TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', quantity INTEGER NOT NULL, amount_cents INTEGER NOT NULL, checkout_session_id TEXT, payment_intent_id TEXT, status TEXT NOT NULL DEFAULT 'pending', expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TEXT, notified_at TEXT)`).run();
 await db.prepare(`CREATE INDEX IF NOT EXISTS idx_workshop_bookings_date ON workshop_bookings(date,status)`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS workshop_garment_orders (booking_id TEXT NOT NULL, participant_index INTEGER NOT NULL, item_index INTEGER NOT NULL, garment TEXT NOT NULL, size TEXT NOT NULL, color TEXT NOT NULL, procurement_status TEXT NOT NULL DEFAULT 'to_order', PRIMARY KEY(booking_id,participant_index,item_index))`).run();
}
function validate(body){
 const date=String(body?.date||'');
 const name=String(body?.name||'').trim().slice(0,180);
 const email=String(body?.email||'').trim().toLowerCase().slice(0,180);
 const phone=String(body?.phone||'').trim().slice(0,35);
 const notes=String(body?.notes||'').trim().slice(0,1200);
 const participants=body?.participants;
 if(!DATES.has(date)||date<new Date().toISOString().slice(0,10))throw new Error('Date d’atelier invalide.');
 if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!phone)throw new Error('Coordonnées incomplètes.');
 if(!Array.isArray(participants)||participants.length<1||participants.length>CAPACITY)throw new Error('Nombre de participants invalide.');
 let total=participants.length*6000;
 const normalized=participants.map(p=>{
  const prenom=String(p.prenom||'').trim().slice(0,90);
  const vetement=String(p.vetement||'').trim().slice(0,45);
  const grandeur=String(p.grandeur||'').trim().slice(0,20);
  const couleur=String(p.couleur||'').trim().slice(0,30);
  if(!prenom||!kinds.has(vetement)||!grandeur||!couleur)throw new Error('Choix de vêtement incomplet.');
  const extras=p.supplementaires||[];
  if(!Array.isArray(extras)||extras.length>15)throw new Error('Trop d’articles supplémentaires.');
  const supplementaires=extras.map(e=>{
   const kind=String(e.vetement||'').trim();
   const size=String(e.grandeur||'').trim().slice(0,20);
   const color=String(e.couleur||'').trim().slice(0,30);
   if(!kinds.has(kind)||!size||!color)throw new Error('Article supplémentaire invalide.');
   total+=extraPrices[kind];return {vetement:kind,grandeur:size,couleur:color,prix_cents:extraPrices[kind]};
  });
  return {prenom,vetement,grandeur,couleur,supplementaires};
 });
 return {date,name,email,phone,notes,participants:normalized,total};
}
async function release(db,id,reason){
 const b=await db.prepare("SELECT date,quantity,status FROM workshop_bookings WHERE id=?").bind(id).first();
 if(!b||!['pending','processing'].includes(b.status))return;
 const changed=await db.prepare("UPDATE workshop_bookings SET status=? WHERE id=? AND status IN ('pending','processing')").bind(reason,id).run();
 if(changed.meta?.changes)await db.prepare("UPDATE workshop_sessions SET reserved=MAX(0,reserved-?) WHERE date=?").bind(b.quantity,b.date).run();
}
async function expireHolds(db){
 const r=await db.prepare("SELECT id FROM workshop_bookings WHERE status IN ('pending','processing') AND expires_at < datetime('now') LIMIT 100").all();
 for(const b of r.results||[])await release(db,b.id,'expired');
}
async function reserve(db,date,quantity){
 await db.prepare("INSERT OR IGNORE INTO workshop_sessions(date,capacity,reserved,minimum_target) VALUES (?,24,0,10)").bind(date).run();
 const r=await db.prepare("UPDATE workshop_sessions SET reserved=reserved+? WHERE date=? AND reserved+?<=capacity").bind(quantity,date,quantity).run();
 return !!r.meta?.changes;
}
async function checkout(env,b,origin){
 if(!env.STRIPE_SECRET_KEY)throw new Error('Paiement Stripe indisponible.');
 const p=new URLSearchParams();
 p.set('mode','payment');
 p.set('success_url',origin+'/ateliers-noel.html?paiement=succes&session_id={CHECKOUT_SESSION_ID}');
 p.set('cancel_url',origin+'/ateliers-noel.html?paiement=annule');
 p.set('expires_at',String(Math.floor(Date.now()/1000)+1800));
 p.set('customer_email',b.email);
 p.set('line_items[0][price_data][currency]','cad');
 p.set('line_items[0][price_data][unit_amount]',String(b.total));
 p.set('line_items[0][price_data][product_data][name]',"Atelier de Noël – "+b.date+" – "+b.participants.length+" participant(s), suppléments inclus");
 p.set('line_items[0][quantity]','1');
 p.set('metadata[workshop_booking_id]',b.id);
 p.set('payment_intent_data[metadata][workshop_booking_id]',b.id);
 const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'atelier-'+b.id},body:p.toString()});
 const data=await response.json();
 if(!response.ok||!data.url)throw new Error(data?.error?.message||'Stripe indisponible.');
 return data;
}
async function notify(env,b){
 if(!env.RESEND_API_KEY)throw new Error('Configuration Resend absente.');
 const participants=JSON.parse(b.participants_json);
 const rows=participants.map((p,i)=>`<li><b>${escape(p.prenom)}</b> — ${escape(p.vetement)} / ${escape(p.grandeur)} / ${escape(p.couleur)}${p.supplementaires.map(e=>`<br>Supplément : ${escape(e.vetement)} / ${escape(e.grandeur)} / ${escape(e.couleur)}`).join('')}</li>`).join('');
 const common=`<p>Date : ${escape(b.date)} · 13 h à 15 h<br>Lieu : 5, rue Industrielle, Saint-Roch-de-l'Achigan<br>Total payé : ${(b.amount_cents/100).toFixed(2)} $ CAD, taxes incluses</p><ul>${rows}</ul>`;
 const sender=env.RESEND_FROM||'Évolution PME <formulaires@evolutionpme.ca>';
 const messages=[
 {to:[b.email],subject:'Inscription confirmée — atelier de Noël',html:`<h1>Votre inscription est confirmée!</h1><p>Merci de votre inscription chez Évolution PME.</p>${common}<p>Si une séance doit être annulée ou reportée, vous pourrez obtenir un remboursement intégral ou choisir une autre date disponible.</p>`},
 {to:[env.CONTACT_EMAIL||'info@evolutionpme.ca'],subject:'Nouvelle inscription payée — '+b.date,html:`<h1>Nouvelle inscription payée</h1><p>${escape(b.name)} — ${escape(b.email)} — ${escape(b.phone)}</p>${common}<p>Réservation : ${escape(b.id)}</p>`}
 ];
 for(const m of messages){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:sender,...m})});if(!r.ok)throw new Error('Échec de notification '+r.status);}
}
export async function onWorkshopStripeEvent(event,env){
 const bId=String(event?.data?.object?.metadata?.workshop_booking_id||'');
 if(!bId||!env.CMS_DB)return false;
 await ensure(env.CMS_DB);
 const session=event.data.object;
 const b=await env.CMS_DB.prepare('SELECT * FROM workshop_bookings WHERE id=?').bind(bId).first();
 if(!b)return true;
 if((event.type==='checkout.session.completed'&&session.payment_status==='paid')||event.type==='checkout.session.async_payment_succeeded'){
  if(!['pending','processing','paid'].includes(b.status)){
   // Un paiement peut arriver tardivement après la libération des places.
   // Ne pas prétendre qu'une place est confirmée : intervention humaine requise.
   await env.CMS_DB.prepare("UPDATE workshop_bookings SET status='paid_review',paid_at=COALESCE(paid_at,CURRENT_TIMESTAMP),checkout_session_id=?,payment_intent_id=? WHERE id=?").bind(session.id||null,session.payment_intent||null,bId).run();
   console.error('Atelier payé après expiration : vérification/remboursement manuel requis',bId);
   return true;
  }
  await env.CMS_DB.prepare("UPDATE workshop_bookings SET status='paid',paid_at=COALESCE(paid_at,CURRENT_TIMESTAMP),checkout_session_id=?,payment_intent_id=? WHERE id=? AND status IN ('pending','processing')").bind(session.id||null,session.payment_intent||null,bId).run();
  // Les événements Stripe peuvent être livrés plusieurs fois. Reconstruire les articles
  // manquants de façon idempotente, même si l'inscription était déjà marquée payée.
  const people=JSON.parse(b.participants_json);
  const queries=[];
  people.forEach((p,i)=>{const all=[p,...p.supplementaires];all.forEach((g,j)=>queries.push(env.CMS_DB.prepare("INSERT OR IGNORE INTO workshop_garment_orders(booking_id,participant_index,item_index,garment,size,color) VALUES (?,?,?,?,?,?)").bind(bId,i,j,g.vetement,g.grandeur,g.couleur)));});
  if(queries.length)await env.CMS_DB.batch(queries);
  if(!b.notified_at){
   try{await notify(env,b);await env.CMS_DB.prepare('UPDATE workshop_bookings SET notified_at=CURRENT_TIMESTAMP WHERE id=?').bind(bId).run()}catch(err){console.error('Workshop notification failed',err)}
  }
 }else if(event.type==='checkout.session.expired'||event.type==='checkout.session.async_payment_failed'){await release(env.CMS_DB,bId,'expired');}
 else if(event.type==='checkout.session.completed'){await env.CMS_DB.prepare("UPDATE workshop_bookings SET status='processing' WHERE id=? AND status='pending'").bind(bId).run();}
 return true;
}
export async function handleWorkshop(request,env){
 if(!env.CMS_DB)return json({error:'Service des ateliers indisponible.'},503);
 const url=new URL(request.url);await ensure(env.CMS_DB);await expireHolds(env.CMS_DB);
 if(url.pathname==='/api/workshops/availability'&&request.method==='GET'){
  const rows=await env.CMS_DB.prepare('SELECT date,capacity,reserved FROM workshop_sessions').all();
  const found=Object.fromEntries((rows.results||[]).map(r=>[r.date,Math.max(0,r.capacity-r.reserved)]));
  return json({ok:true,availability:Object.fromEntries([...DATES].map(d=>[d,found[d]??CAPACITY]))});
 }
 if(url.pathname==='/api/workshops/status'&&request.method==='GET'){
  const sessionId=String(url.searchParams.get('session_id')||'');
  if(!/^cs_[A-Za-z0-9_]+$/.test(sessionId))return json({error:'Session invalide.'},400);
  const row=await env.CMS_DB.prepare('SELECT status,date,quantity FROM workshop_bookings WHERE checkout_session_id=?').bind(sessionId).first();
  return row?json({ok:true,status:row.status,date:row.date,quantity:row.quantity}):json({error:'Inscription introuvable.'},404);
 }
 if(url.pathname==='/api/workshops/checkout'&&request.method==='POST'){
  let data;try{data=validate(await request.json())}catch(e){return json({error:e.message||'Inscription invalide.'},400)}
  const db=env.CMS_DB; if(!await reserve(db,data.date,data.participants.length))return json({error:'Il ne reste pas assez de places pour ce groupe. Choisissez une autre date.',code:'FULL'},409);
  const id=crypto.randomUUID();const expiry=new Date(Date.now()+30*60*1000).toISOString().replace('T',' ').slice(0,19);
  try{
   await db.prepare("INSERT INTO workshop_bookings(id,date,name,email,phone,participants_json,notes,quantity,amount_cents,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,data.date,data.name,data.email,data.phone,JSON.stringify(data.participants),data.notes,data.participants.length,data.total,expiry).run();
   const session=await checkout(env,{...data,id},url.origin);
   await db.prepare('UPDATE workshop_bookings SET checkout_session_id=? WHERE id=?').bind(session.id,id).run();
   return json({ok:true,url:session.url});
  }catch(e){
   const existing=await db.prepare('SELECT id FROM workshop_bookings WHERE id=?').bind(id).first();
   if(existing)await release(db,id,'failed');
   else await db.prepare('UPDATE workshop_sessions SET reserved=MAX(0,reserved-?) WHERE date=?').bind(data.participants.length,data.date).run();
   return json({error:e.message||'Impossible de créer le paiement.'},502);
  }
 }
 return json({error:'Route d’atelier inconnue.'},404);
}
export async function workshopAdmin(request,env){
 await ensure(env.CMS_DB);await expireHolds(env.CMS_DB);
 const url=new URL(request.url);
 if(request.method==='GET'){
  const date=url.searchParams.get('date');
  const q=date&&DATES.has(date)?env.CMS_DB.prepare("SELECT * FROM workshop_bookings WHERE date=? ORDER BY created_at DESC").bind(date):env.CMS_DB.prepare("SELECT * FROM workshop_bookings ORDER BY date,created_at DESC");
  const rows=(await q.all()).results||[];
  const garments=(await env.CMS_DB.prepare("SELECT g.*,b.date,b.status booking_status FROM workshop_garment_orders g JOIN workshop_bookings b ON b.id=g.booking_id WHERE b.status='paid' ORDER BY b.date,g.garment,g.size,g.color").all()).results||[];
  return json({ok:true,bookings:rows.map(({participants_json,...r})=>({...r,participants:JSON.parse(participants_json)})),garments,capacity:CAPACITY,minimum_target:MIN_TARGET});
 }
 if(request.method==='PATCH'){
  let b;try{b=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const allowed=['to_order','ordered','received','ready'];
  if(!allowed.includes(b?.status))return json({error:'Statut invalide.'},400);
  const r=await env.CMS_DB.prepare("UPDATE workshop_garment_orders SET procurement_status=? WHERE booking_id=? AND participant_index=? AND item_index=? AND EXISTS(SELECT 1 FROM workshop_bookings WHERE id=? AND status='paid')").bind(b.status,String(b.booking_id||''),Number(b.participant_index),Number(b.item_index),String(b.booking_id||'')).run();
  return json({ok:!!r.meta?.changes});
 }
 return json({error:'Méthode non permise.'},405);
}
