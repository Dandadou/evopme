const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

const tokenOk=token=>typeof token==='string'&&/^[a-f0-9]{64}$/i.test(token);

async function getInvoiceByToken(env,token){
 if(!tokenOk(token))return null;
 return env.CMS_DB.prepare(`
  SELECT ip.id,ip.site_id,ip.invoice_number,ip.client_name,ip.client_email,ip.amount_cents,ip.currency,ip.description,ip.due_date,ip.status,ip.paid_at,s.name site_name,s.hostname
  FROM invoice_payment_requests ip
  JOIN sites s ON s.id=ip.site_id
  WHERE ip.token=?
  LIMIT 1`).bind(token).first();
}

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

async function createStripeCheckout(env,requestRecord,origin){
 if(!env.STRIPE_SECRET_KEY)throw new Error('Stripe n’est pas encore configuré.');
 const params=new URLSearchParams();
 params.set('mode','payment');
 params.set('success_url',`${origin}/paiement.html?token=${encodeURIComponent(requestRecord.token)}&status=success&session_id={CHECKOUT_SESSION_ID}`);
 params.set('cancel_url',`${origin}/paiement.html?token=${encodeURIComponent(requestRecord.token)}&status=cancelled`);
 params.set('client_reference_id',requestRecord.token);
 params.set('line_items[0][price_data][currency]',String(requestRecord.currency||'cad').toLowerCase());
 params.set('line_items[0][price_data][unit_amount]',String(requestRecord.amount_cents));
 params.set('line_items[0][price_data][product_data][name]',`Facture ${requestRecord.invoice_number}`);
 if(requestRecord.description)params.set('line_items[0][price_data][product_data][description]',String(requestRecord.description).slice(0,500));
 params.set('line_items[0][quantity]','1');
 params.set('metadata[invoice_payment_id]',String(requestRecord.id));
 params.set('metadata[invoice_number]',String(requestRecord.invoice_number).slice(0,500));
 params.set('payment_intent_data[metadata][invoice_payment_id]',String(requestRecord.id));
 params.set('payment_intent_data[metadata][invoice_number]',String(requestRecord.invoice_number).slice(0,500));
 if(requestRecord.client_email)params.set('customer_email',requestRecord.client_email);
 params.set('billing_address_collection','auto');

 const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{
  method:'POST',
  headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'content-type':'application/x-www-form-urlencoded'},
  body:params.toString()
 });
 const data=await response.json();
 if(!response.ok||!data?.url)throw new Error(data?.error?.message||'Impossible de créer la session de paiement Stripe.');
 return data;
}

export async function handlePayments(request,env){
 if(!env.CMS_DB)return json({error:'Service de paiement indisponible.'},503);
 const url=new URL(request.url);

 if(request.method==='GET'&&url.pathname==='/api/payments/invoice'){
  const token=url.searchParams.get('token')||'';
  let invoice;try{invoice=await getInvoiceByToken(env,token)}catch{return json({error:'Le module de paiement n’est pas encore initialisé.'},503)}
  if(!invoice)return json({error:'Lien de paiement invalide ou expiré.'},404);
  return json({ok:true,invoice:{
   invoice_number:invoice.invoice_number,
   client_name:invoice.client_name,
   amount_cents:invoice.amount_cents,
   currency:invoice.currency,
   description:invoice.description,
   due_date:invoice.due_date,
   status:invoice.status,
   paid_at:invoice.paid_at,
   site_name:invoice.site_name
  }});
 }

 if(request.method==='POST'&&url.pathname==='/api/payments/checkout'){
  let body;try{body=await request.json()}catch{return json({error:'Données invalides.'},400)}
  const token=String(body?.token||'');
  let invoice;try{invoice=await getInvoiceByToken(env,token)}catch{return json({error:'Le module de paiement n’est pas encore initialisé.'},503)}
  if(!invoice)return json({error:'Lien de paiement invalide ou expiré.'},404);
  if(invoice.status==='paid')return json({error:'Cette facture est déjà payée.'},409);
  if(invoice.status==='cancelled')return json({error:'Ce lien de paiement a été désactivé.'},410);
  if(!Number.isInteger(invoice.amount_cents)||invoice.amount_cents<=0)return json({error:'Montant de facture invalide.'},400);

  try{
   const session=await createStripeCheckout(env,{...invoice,token},url.origin);
   await env.CMS_DB.prepare("UPDATE invoice_payment_requests SET stripe_checkout_session_id=?,status='pending',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(session.id,invoice.id).run();
   return json({ok:true,url:session.url});
  }catch(error){
   return json({error:error?.message||'Stripe est temporairement indisponible.'},502);
  }
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
