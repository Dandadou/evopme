(()=>{
 const root=document.querySelector('[data-workshops-admin]');if(!root)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=c=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format((Number(c)||0)/100);
 const labels={tshirt:'T-shirt',manches:'Manches longues',ouate:'Coton ouaté',cache:'Cache-couche',bavette:'Bavette',sac:'Sac réutilisable'};
 const statuses={pending:'En attente de paiement',processing:'Paiement en cours',paid:'Payé',expired:'Expiré',failed:'Échoué',paid_review:'Paiement à vérifier !',cancelled:'Annulée (place libérée)'};
 const stock={to_order:'À commander',ordered:'Commandé',received:'Reçu',ready:'Prêt pour l’atelier'};
 let snapshot=null;
 async function api(url,options={}){const r=await fetch(url,{...options,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur de chargement');return d}
 function render(){
  const all=snapshot.bookings||[],garments=snapshot.garments||[];
  const paid=all.filter(b=>b.status==='paid');
  const dates=[...new Set(['2026-11-21','2026-11-28','2026-12-04','2026-12-05','2026-12-11','2026-12-12','2026-12-18','2026-12-19'])];
  const total=paid.reduce((s,b)=>s+b.amount_cents,0);
  root.innerHTML=`<div class="pricing-grid">
    <article class="pricing-kpi"><span>Inscriptions payées</span><strong>${paid.length}</strong></article>
    <article class="pricing-kpi"><span>Participants confirmés</span><strong>${paid.reduce((s,b)=>s+b.quantity,0)}</strong></article>
    <article class="pricing-kpi"><span>Ventes TTC</span><strong>${money(total)}</strong></article>
   </div>
   <h3 style="margin-top:30px">Séances</h3>
   <div class="pricing-table"><table><thead><tr><th>Date</th><th>Confirmés</th><th>Places restantes*</th><th>Objectif interne</th></tr></thead><tbody>${dates.map(date=>{const n=paid.filter(b=>b.date===date).reduce((s,b)=>s+b.quantity,0);const held=all.filter(b=>b.date===date&&['pending','processing'].includes(b.status)).reduce((s,b)=>s+b.quantity,0);return `<tr><td>${date} · 13 h à 15 h</td><td>${n}</td><td>${Math.max(0,24-n-held)}</td><td>${n>=10?'Atteint':'À surveiller (10)'}</td></tr>`}).join('')}</tbody></table></div>
   <p class="pricing-note">*Inclut les places temporairement réservées en cours de paiement. Capacité maximale interne : 24 personnes.</p>
   <h3 style="margin-top:34px">Inscriptions</h3><div class="pricing-table"><table>
    <thead><tr><th>Date</th><th>Client</th><th>Participants et vêtements</th><th>Montant</th><th>Paiement</th><th>Action</th></tr></thead>
    <tbody>${all.length?all.map(b=>`<tr><td>${esc(b.date)}</td><td>${esc(b.name)}<br><small>${esc(b.email)}<br>${esc(b.phone)}</small></td><td>${b.participants.map(p=>`<div><strong>${esc(p.prenom)}</strong> — ${esc(labels[p.vetement]||p.vetement)} · ${esc(p.grandeur)} · ${esc(p.couleur)}${p.supplementaires.map(e=>`<br><small>+ ${esc(labels[e.vetement]||e.vetement)} · ${esc(e.grandeur)} · ${esc(e.couleur)}</small>`).join('')}</div>`).join('')}</td><td>${money(b.amount_cents)}</td><td>${esc(statuses[b.status]||b.status)}</td><td>${['paid','pending','processing','paid_review'].includes(b.status)?`<button type="button" class="pill" data-workshop-cancel="${esc(b.id)}">Annuler et libérer la place</button>`:''}</td></tr>`).join(''):'<tr><td colspan="6">Aucune inscription pour le moment.</td></tr>'}</tbody></table></div>
   <h3 style="margin-top:34px">Vêtements à commander</h3>
   <p class="pricing-note">Les articles payés sont regroupés par modèle, taille et couleur. Chaque ligne individuelle garde son statut pour éviter les commandes en double.</p>
   <div data-workshop-summary></div>
   <div class="pricing-table"><table><thead><tr><th>Atelier</th><th>Vêtement</th><th>Grandeur</th><th>Couleur</th><th>Statut</th></tr></thead><tbody>${garments.length?garments.map(g=>`<tr><td>${esc(g.date)}</td><td>${esc(labels[g.garment]||g.garment)}</td><td>${esc(g.size)}</td><td>${esc(g.color)}</td><td><select data-garment-booking="${esc(g.booking_id)}" data-person="${g.participant_index}" data-item="${g.item_index}">${Object.entries(stock).map(([value,label])=>`<option value="${value}" ${value===g.procurement_status?'selected':''}>${label}</option>`).join('')}</select></td></tr>`).join(''):'<tr><td colspan="5">Aucun vêtement payé à commander.</td></tr>'}</tbody></table></div>
   <p data-workshop-status class="cms-status" aria-live="polite">Données actualisées.</p><button type="button" class="pill" data-workshop-refresh>ACTUALISER</button>`;
  const grouped=new Map();
  for(const g of garments.filter(g=>g.procurement_status==='to_order')){
   const key=[g.garment,g.size,g.color].join('|');grouped.set(key,(grouped.get(key)||0)+1);
  }
  root.querySelector('[data-workshop-summary]').innerHTML=grouped.size?`<div class="pricing-table"><table><thead><tr><th>Modèle</th><th>Grandeur</th><th>Couleur</th><th>Quantité à acheter</th></tr></thead><tbody>${[...grouped].sort().map(([key,n])=>{const [kind,size,color]=key.split('|');return `<tr><td>${esc(labels[kind]||kind)}</td><td>${esc(size)}</td><td>${esc(color)}</td><td><strong>${n}</strong></td></tr>`}).join('')}</tbody></table></div>`:'<p>Aucun article en attente de commande.</p>';
  root.querySelector('[data-workshop-refresh]').addEventListener('click',load);
  root.querySelectorAll('[data-workshop-cancel]').forEach(button=>button.addEventListener('click',async()=>{
   const booking=all.find(b=>b.id===button.dataset.workshopCancel);
   if(!booking)return;
   if(!confirm('Annuler cette inscription et libérer '+booking.quantity+' place(s) ? Cela ne rembourse PAS automatiquement le paiement Stripe. L’historique sera conservé.'))return;
   button.disabled=true;
   try{await api('/api/cms/workshops?action=cancel',{method:'POST',body:JSON.stringify({booking_id:booking.id})});await load()}
   catch(e){button.disabled=false;alert('Annulation impossible : '+e.message)}
  }));
  root.querySelectorAll('[data-garment-booking]').forEach(select=>select.addEventListener('change',async()=>{
   const prior=garments.find(g=>g.booking_id===select.dataset.garmentBooking&&String(g.participant_index)===select.dataset.person&&String(g.item_index)===select.dataset.item)?.procurement_status;
   const status=root.querySelector('[data-workshop-status]');
   try{await api('/api/cms/workshops',{method:'PATCH',body:JSON.stringify({booking_id:select.dataset.garmentBooking,participant_index:Number(select.dataset.person),item_index:Number(select.dataset.item),status:select.value})});await load()}catch(e){select.value=prior;status.textContent=e.message;status.dataset.state='error'}
  }));
 }
 async function load(){try{snapshot=await api('/api/cms/workshops');render()}catch(e){root.textContent='Impossible de charger les ateliers : '+e.message}}
 load();
})();