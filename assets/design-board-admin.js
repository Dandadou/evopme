(()=>{'use strict';
const root=document.getElementById('design-board-tool');if(!root)return;
const COLUMNS=['Soumission','projet','Non débuté','En impression','En conception','En livraison'];
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const o=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return o.year+'-'+o.month+'-'+o.day};
const fmtDate=d=>{if(!d)return '';try{return new Intl.DateTimeFormat('fr-CA',{dateStyle:'medium'}).format(new Date(d+'T00:00:00'))}catch{return d}};
const say=(m,ok=true)=>{const el=root.querySelector('[data-design-board-status]');if(el){el.textContent=m;el.dataset.state=ok?'ok':'error'}};
let cards=[];
async function request(url,options={}){const r=await fetch(url,{...options,headers:{Accept:'application/json',...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||'Erreur du tableau design');if(d.migration_required)e.migrationRequired=true;throw e}return d}
function cardHtml(c){
 const idx=COLUMNS.indexOf(c.status);
 const left=idx>0?`<button class="pill design-board-move" type="button" data-move-card="${c.id}" data-move-to="${COLUMNS[idx-1]}" aria-label="Déplacer vers ${esc(COLUMNS[idx-1])}">← ${esc(COLUMNS[idx-1])}</button>`:'';
 const right=idx>=0&&idx<COLUMNS.length-1?`<button class="pill design-board-move" type="button" data-move-card="${c.id}" data-move-to="${COLUMNS[idx+1]}" aria-label="Déplacer vers ${esc(COLUMNS[idx+1])}">${esc(COLUMNS[idx+1])} →</button>`:'';
 const contact=[c.email?`<span>✉ ${esc(c.email)}</span>`:'',c.phone?`<span>☎ ${esc(c.phone)}</span>`:''].filter(Boolean).join('');
 const date=c.order_date?`<span class="design-board-date">${esc(fmtDate(c.order_date))}</span>`:'';
 return `<article class="design-board-card"><div class="design-board-card-top"><strong>${esc(c.client)}</strong>${date}</div>${contact?`<div class="design-board-contact">${contact}</div>`:''}<p>${esc(c.description)}</p><div class="design-board-actions">${left}${right}<button class="pill design-board-delete" type="button" data-delete-card="${c.id}">Supprimer</button></div></article>`;
}
function render(){
 const board=root.querySelector('[data-design-board]');
 if(!board)return;
 board.replaceChildren();
 COLUMNS.forEach(status=>{
  const col=document.createElement('section');
  col.className='design-board-col';
  const list=cards.filter(c=>c.status===status);
  const head=document.createElement('div');
  head.className='design-board-col-head';
  head.innerHTML=`<h3>${esc(status)}</h3><span class="design-board-count" aria-label="${list.length} commande${list.length>1?'s':''}">${list.length}</span>`;
  col.append(head);
  if(!list.length){
   const empty=document.createElement('div');
   empty.className='design-board-empty';
   empty.textContent='Aucune commande';
   col.append(empty);
  }
  list.forEach(c=>col.insertAdjacentHTML('beforeend',cardHtml(c)));
  board.append(col);
 });
}
function bind(){
 root.querySelectorAll('[data-move-card]').forEach(b=>b.addEventListener('click',async()=>{
  const c=cards.find(x=>String(x.id)===b.dataset.moveCard);if(!c)return;
  say('Déplacement de la commande…');
  try{await request('/api/cms/design-board',{method:'POST',body:JSON.stringify({card:{...c,status:b.dataset.moveTo}})});await load();say('Commande déplacée vers « '+b.dataset.moveTo+' ».')}catch(e){say(e.message,false)}
 }));
 root.querySelectorAll('[data-delete-card]').forEach(b=>b.addEventListener('click',async()=>{
  const c=cards.find(x=>String(x.id)===b.dataset.deleteCard);if(!c)return;
  if(!confirm('Supprimer la commande de '+c.client+' ?'))return;
  say('Suppression de la commande…');
  try{await request('/api/cms/design-board',{method:'DELETE',body:JSON.stringify({id:Number(c.id)})});await load();say('Commande supprimée.')}catch(e){say(e.message,false)}
 }));
}
async function load(){
 try{
  const d=await request('/api/cms/design-board');
  cards=Array.isArray(d.cards)?d.cards:[];
  render();bind();
  say(cards.length?cards.length+' commande'+(cards.length>1?'s':'')+' au tableau.':'Aucune commande pour le moment. Ajoute ta première commande ci-dessus.');
 }catch(e){
  cards=[];render();
  if(e.migrationRequired){say('Le tableau est prêt, mais la table des commandes n’est pas encore créée dans D1. Applique cms/schema.sql (ou migrations/20261116-design-board-cards.sql puis migrations/20261117-design-board-soumission.sql) avec wrangler, puis recharge la page.',false)}
  else say(e.message,false);
 }
}
root.innerHTML=`<p class="cms-lead">Tes commandes clients, au même endroit que le reste de ta gestion. Fini le papier : chaque commande suit les étapes, de « Soumission » jusqu’à « En livraison ».</p>
<form class="cms-editor-card design-board-form" data-design-board-form><h3 class="design-board-form-title">Nouvelle commande</h3><div class="cms-row"><label>Nom du client<input name="client" type="text" maxlength="160" required autocomplete="off"></label><label>Courriel<input name="email" type="email" maxlength="320" required autocomplete="off"></label></div><div class="cms-row"><label>Téléphone<input name="phone" type="tel" maxlength="35" required autocomplete="off"></label><label>Date de la commande<input name="order_date" type="date"></label></div><label>Qu’est-ce qui a été commandé ?<textarea name="description" maxlength="2000" required placeholder="Ex. : 12 chandails noirs, logo Seth, grandeurs M à XL"></textarea></label><button class="cms-save" type="submit">+ AJOUTER LA COMMANDE</button><p class="cms-status" data-design-board-status role="status"></p></form>
<div class="design-board" data-design-board></div>`;
const form=root.querySelector('[data-design-board-form]');
form.querySelector('[name="order_date"]').value=today();
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const get=k=>form.querySelector('[name="'+k+'"]').value.trim();
 const card={client:get('client'),email:get('email').toLowerCase(),phone:get('phone'),description:get('description'),order_date:get('order_date')||today()};
 if(!card.client||!card.description)return say('Nom du client et description requis.',false);
 if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(card.email))return say('Adresse courriel invalide.',false);
 if(!card.phone)return say('Numéro de téléphone requis.',false);
 say('Ajout de la commande…');
 try{await request('/api/cms/design-board',{method:'POST',body:JSON.stringify({card})});form.reset();form.querySelector('[name="order_date"]').value=today();await load();say('Commande ajoutée dans « Soumission ».')}catch(err){say(err.message,false)}
});
load();
})();
