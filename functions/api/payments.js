const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

function hexToBytes(hex){
 if(typeof hex!=='string'||hex.length%2)return null;
 const out=new Uint8Array(hex.length/2);
 for(let i=0;i<out.length;i++){const n=parseInt(hex.slice(i*2,i*2+2),16);if(Number.isNaN(n))return null;out[i]=n}
 return out;
}

async function verifyStripeWebhook(rawBody,signatureHeader,secret){
 if(!signatureHeader||!secret)return false;
 const parts=signatureHeader.split(',').map(x=>x.trim());
 const t=parts.find(x=>x.startsWith('t='))?.slice(2);
 const signatures=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
 const timestamp=Number(t);
 if(!Number.isFinite(timestamp)||!signatures.length)return false;
 if(Math.abs(Math.floor(Date.now()/1000)-timestamp)>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const signed=new TextEncoder().encode(`${timestamp}.${rawBody}`);
 for(const sig of signatures){
  const bytes=hexToBytes(sig);
  if(bytes&&await crypto.subtle.verify('HMAC',key,bytes,signed))return true;
 }
 return false;
}

async function findSite(env,hostname){
 return env.CMS_DB.prepare("SELECT id,name,hostname FROM sites WHERE hostname=? AND status='active' ORDER BY id LIMIT 1").bind(hostname).first()
  || env.CMS_DB.prepare("SELECT id,name,hostname FROM sites WHERE slug='evolution-pme' AND status='active' ORDER BY id LIMIT 1").first();
}

async function createStripeCheckout(env,payment,origin){
 if(!env.STRIPE_SECRET_KEY)throw new Error('Stripe n’est pas encore configuré.');
 const params=new URLSearchParams();
 params.set('mode','payment');
 params.set('success_url',`${origin}/paiement.html?status=success&session_id={CHECKOUT_SESSION_ID}`);
 params.set('cancel_url',`${origin}/paiement.html?status=cancelled`);
 params.set('line_items[0][price_data][currency]','cad');
 params.set('line_items[0][price_data][unit_amount]',String(payment.amount_cents));
 params.set('line_items[0][price_data][product_data][name]',`Paiement facture ${payment.invoice_number}`);
 params.set('line_items[0][quantity]','1');
 params.set('customer_email',payment.client_email);
 params.set('metadata[invoice_payment_id]',String(payment.id));
 params.set('metadata[invoice_number]',payment.invoice_number);
 params.set('payment_intent_data[metadata][invoice_payment_id]',String(payment.id));
 params.set('payment_intent_data[metadata][invoice_number]',payment.invoice_number);
 params.set('billing_address_collection','auto');

 const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{
  method:'POST',
  headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'content-type':'application/x-www-form-urlencoded'},
  body:params.toString()
 });
 const data=await response.json();
 if(!response.ok||!data?.url)throw new Error(data?.error?.message||'Impossible de créer le paiement Stripe.');
 return data;
}

export async function handlePayments(request,env){
 if(!env.CMS_DB)return json({error:'Service de paiement indisponible.'},503);
 const url=new URL(request.url);

 if(request.method==='POST'&&url.pathname==='/api/payments/checkout'){
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const invoiceNumber=String(body?.invoice_number||'').trim().slice(0,100);
  const clientEmail=String(body?.client_email||'').trim().toLowerCase().slice(0,320);
  const amountCents=Number(body?.amount_cents||0);

  if(!invoiceNumber)return json({error:'Entre ton numéro de facture.'},400);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))return json({error:'Entre une adresse courriel valide.'},400);
  if(!Number.isInteger(amountCents)||amountCents<=0||amountCents>999999999)return json({error:'Entre un montant valide.'},400);

  let site;
  try{site=await findSite(env,url.hostname)}catch{return json({error:'Le module de paiement n’est pas encore initialisé.'},503)}
  if(!site)return json({error:'Site de paiement introuvable.'},404);

  const token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
  let result;
  try{
   result=await env.CMS_DB.prepare("INSERT INTO invoice_payment_requests (site_id,invoice_number,client_name,client_email,amount_cents,currency,description,due_date,token,status) VALUES (?,?, '', ?,?,'cad','',NULL,?,'pending')")
    .bind(site.id,invoiceNumber,clientEmail,amountCents,token).run();
  }catch{return json({error:'Le module de paiement doit d’abord être initialisé dans D1.'},503)}

  const id=Number(result.meta?.last_row_id||0);
  try{
   const session=await createStripeCheckout(env,{id,invoice_number:invoiceNumber,client_email:clientEmail,amount_cents:amountCents},url.origin);
   await env.CMS_DB.prepare("UPDATE invoice_payment_requests SET stripe_checkout_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(session.id,id).run();
   return json({ok:true,url:session.url});
  }catch(error){
   await env.CMS_DB.prepare("DELETE FROM invoice_payment_requests WHERE id=? AND stripe_checkout_session_id IS NULL").bind(id).run().catch(()=>{});
   return json({error:error?.message||'Stripe est temporairement indisponible.'},502);
  }
 }

 if(request.method==='GET'&&url.pathname==='/api/payments/status'){
  const sessionId=String(url.searchParams.get('session_id')||'').trim();
  if(!/^cs_[A-Za-z0-9_]+$/.test(sessionId))return json({error:'Session de paiement invalide.'},400);
  let payment;
  try{payment=await env.CMS_DB.prepare('SELECT invoice_number,amount_cents,currency,status,paid_at FROM invoice_payment_requests WHERE stripe_checkout_session_id=? LIMIT 1').bind(sessionId).first()}catch{return json({error:'Le module de paiement n’est pas encore initialisé.'},503)}
  if(!payment)return json({error:'Paiement introuvable.'},404);
  return json({ok:true,payment});
 }

 if(request.method==='POST'&&url.pathname==='/api/payments/webhook'){
  if(!env.STRIPE_WEBHOOK_SECRET)return json({error:'Webhook Stripe non configuré.'},503);
  const raw=await request.text();
  const valid=await verifyStripeWebhook(raw,request.headers.get('Stripe-Signature'),env.STRIPE_WEBHOOK_SECRET);
  if(!valid)return json({error:'Signature Stripe invalide.'},400);
  let event;try{event=JSON.parse(raw)}catch{return json({error:'Événement Stripe invalide.'},400)}
  const session=event?.data?.object||{};
  const id=Number(session?.metadata?.invoice_payment_id||0);
  if(id){
   if((event.type==='checkout.session.completed'&&session.payment_status==='paid')||event.type==='checkout.session.async_payment_succeeded'){
    await env.CMS_DB.prepare("UPDATE invoice_payment_requests SET status='paid',stripe_checkout_session_id=?,stripe_payment_intent_id=?,paid_at=COALESCE(paid_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(session.id||null,session.payment_intent||null,id).run();
   }else if(event.type==='checkout.session.completed'){
    await env.CMS_DB.prepare("UPDATE invoice_payment_requests SET status='processing',stripe_checkout_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'paid'").bind(session.id||null,id).run();
   }else if(event.type==='checkout.session.async_payment_failed'){
    await env.CMS_DB.prepare("UPDATE invoice_payment_requests SET status='pending',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'paid'").bind(id).run();
   }
  }
  return json({received:true});
 }

 return json({error:'Route de paiement inconnue.'},404);
}
