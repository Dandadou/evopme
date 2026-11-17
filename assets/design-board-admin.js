(()=>{'use strict';
const root=document.getElementById('design-board-tool');if(!root)return;
const COLUMNS=['Soumission','projet','Non débuté','En impression','En conception','En livraison'];
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const o=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return o.year+'-'+o.month+'-'+o.day};
const fmtDate=d=>{if(!d)return '';try{return new Intl.DateTimeFormat('fr-CA',{dateStyle:'medium'}).format(new Date(d+'T00:00:00'))}catch{return d}};
const fmtNoteDate=d=>{if(!d)return '';try{return new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',dateStyle:'medium',timeStyle:'short'}).format(new Date(d.replace(' ','T')+'Z'))}catch{return d}};
const safeImageUrl=u=>{const v=String(u||'').trim();return (v.startsWith('/')||/^https?:\/\//i.test(v))?v:''};
const say=(m,ok=true)=>{const el=root.querySelector('[data-design-board-status]');if(el){el.textContent=m;el.dataset.state=ok?'ok':'error'}};
let cards=[];
async function request(url,options={}){const isForm=typeof FormData!=='undefined'&&options.body instanceof FormData;const r=await fetch(url,{...options,headers:{Accept:'application/json',...(!isForm&&options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||'Erreur du tableau design');if(d.migration_required)e.migrationRequired=true;throw e}return d}
function imageHtml(c){
 const img=safeImageUrl(c.image_url);
 const thumb=img?`<a href="${esc(img)}" target="_blank" rel="noopener"><img class="design-board-thumb" src="${esc(img)}" alt="Image de la commande de ${esc(c.client)}"></a>`:'';
 return `<div class="design-board-image">${thumb}<div class="design-board-image-row"><label class="pill design-board-upload-label">TÉLÉVERSER<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" data-image-upload="${c.id}" hidden></label><input type="text" placeholder="ou coller un lien d’image…" maxlength="1000" data-image-url="${c.id}" autocomplete="off"><button class="pill" type="button" data-image-link="${c.id}">LIER</button>${img?`<button class="pill design-board-delete" type="button" data-image-remove="${c.id}">RETIRER</button>`:''}</div></div>`;
}
function notesHtml(c){
 const notes=Array.isArray(c.notes)?c.notes:[];
 const items=notes.map(n=>`<li class="design-board-note"><span>${esc(n.note)}</span><span class="design-board-note-meta"><span>${esc(fmtNoteDate(n.created_at))}</span><button type="button" data-delete-note="${n.id}" aria-label="Supprimer cette note">✕</button></span></li>`).join('');
 return `<div class="design-board-notes"><h4>Notes (${notes.length})</h4><ul class="design-board-note-list">${items||'<li class="design-board-note-empty">Aucune note pour le moment.</li>'}</ul><form class="design-board-note-form" data-note-form="${c.id}"><input type="text" maxlength="1000" placeholder="Ajouter une note… (ex. : client a appelé, tissu arrivé)" autocomplete="off" required><button type="submit">＋</button></form></div>`;
}
function cardHtml(c){
 const idx=COLUMNS.indexOf(c.status);
 const left=idx>0?`<button class="pill design-board-move" type="button" data-move-card="${c.id}" data-move-to="${COLUMNS[idx-1]}" aria-label="Déplacer vers ${esc(COLUMNS[idx-1])}">← ${esc(COLUMNS[idx-1])}</button>`:'';
 const right=idx>=0&&idx<COLUMNS.length-1?`<button class="pill design-board-move" type="button" data-move-card="${c.id}" data-move-to="${COLUMNS[idx+1]}" aria-label="Déplacer vers ${esc(COLUMNS[idx+1])}">${esc(COLUMNS[idx+1])} →</button>`:'';
 const contact=[c.email?`<span>✉ ${esc(c.email)}</span>`:'',c.phone?`<span>☎ ${esc(c.phone)}</span>`:''].filter(Boolean).join('');
 const date=c.order_date?`<span class="design-board-date">${esc(fmtDate(c.order_date))}</span>`:'';
 return `<article class="design-board-card"><div class="design-board-card-top"><strong>${esc(c.client)}</strong>${date}</div>${contact?`<div class="design-board-contact">${contact}</div>`:''}<p>${esc(c.description)}</p>${imageHtml(c)}${notesHtml(c)}<div class="design-board-actions">${left}${right}<button class="pill design-board-delete" type="button" data-delete-card="${c.id}">Supprimer</button></div></article>`;
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
 root.querySelectorAll('[data-note-form]').forEach(f=>f.addEventListener('submit',async e=>{
  e.preventDefault();
  const cardId=Number(f.dataset.noteForm);
  const input=f.querySelector('input');
  const note=(input?.value||'').trim();
  if(!note)return;
  say('Ajout de la note…');
  try{await request('/api/cms/design-board-notes',{method:'POST',body:JSON.stringify({card_id:cardId,note})});await load();say('Note ajoutée.')}catch(err){say(err.message,false)}
 }));
 root.querySelectorAll('[data-delete-note]').forEach(b=>b.addEventListener('click',async()=>{
  if(!confirm('Supprimer cette note ?'))return;
  say('Suppression de la note…');
  try{await request('/api/cms/design-board-notes',{method:'DELETE',body:JSON.stringify({id:Number(b.dataset.deleteNote)})});await load();say('Note supprimée.')}catch(e){say(e.message,false)}
 }));
 root.querySelectorAll('[data-image-upload]').forEach(input=>input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  const cardId=Number(input.dataset.imageUpload);
  say('Téléversement de l’image…');
  const fd=new FormData();fd.append('card_id',String(cardId));fd.append('file',file);
  try{await request('/api/cms/design-board-image',{method:'POST',body:fd});await load();say('Image ajoutée à la commande.')}catch(e){say(e.message,false)}
 }));
 root.querySelectorAll('[data-image-link]').forEach(b=>b.addEventListener('click',async()=>{
  const cardId=Number(b.dataset.imageLink);
  const c=cards.find(x=>String(x.id)===b.dataset.imageLink);if(!c)return;
  const input=root.querySelector('[data-image-url="'+cardId+'"]');
  const url=(input?.value||'').trim();
  if(!url)return say('Colle d’abord un lien d’image.',false);
  say('Ajout de l’image…');
  try{await request('/api/cms/design-board',{method:'POST',body:JSON.stringify({card:{...c,image_url:url}})});await load();say('Image ajoutée à la commande.')}catch(e){say(e.message,false)}
 }));
 root.querySelectorAll('[data-image-remove]').forEach(b=>b.addEventListener('click',async()=>{
  const c=cards.find(x=>String(x.id)===b.dataset.imageRemove);if(!c)return;
  if(!confirm('Retirer l’image de cette commande ?'))return;
  say('Retrait de l’image…');
  try{await request('/api/cms/design-board',{method:'POST',body:JSON.stringify({card:{...c,image_url:''}})});await load();say('Image retirée.')}catch(e){say(e.message,false)}
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
  if(e.migrationRequired){say('Le tableau est prêt, mais la table des commandes n’est pas encore créée dans D1. Applique cms/schema.sql (ou migrations/20261116-design-board-cards.sql puis migrations/20261117-design-board-soumission.sql puis migrations/20261116-design-board-notes-images.sql) avec wrangler, puis recharge la page.',false)}
  else say(e.message,false);
 }
}
root.innerHTML=`<p class="cms-lead">Tes commandes clients, au même endroit que le reste de ta gestion. Fini le papier : chaque commande suit les étapes, de « Soumission » jusqu’à « En livraison ».</p>
<form class="cms-editor-card design-board-form" data-design-board-form><h3 class="design-board-form-title">Nouvelle commande</h3><div class="cms-row"><label>Nom du client<input name="client" type="text" maxlength="160" required autocomplete="off"></label><label>Courriel (optionnel)<input name="email" type="email" maxlength="320" autocomplete="off"></label></div><div class="cms-row"><label>Téléphone (optionnel)<input name="phone" type="tel" maxlength="35" autocomplete="off"></label><label>Date de la commande<input name="order_date" type="date"></label></div><label>Qu’est-ce qui a été commandé ?<textarea name="description" maxlength="2000" required placeholder="Ex. : 12 chandails noirs, logo Seth, grandeurs M à XL"></textarea></label><label>Image (lien URL, optionnel)<input name="image_url" type="text" maxlength="1000" autocomplete="off" placeholder="/media/… ou https://… (ou ajoute une photo sur la carte après)"></label><button class="cms-save" type="submit">+ AJOUTER LA COMMANDE</button><p class="cms-status" data-design-board-status role="status"></p></form>
<div class="design-board" data-design-board></div>`;
const form=root.querySelector('[data-design-board-form]');
form.querySelector('[name="order_date"]').value=today();
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const get=k=>form.querySelector('[name="'+k+'"]').value.trim();
 const card={client:get('client'),email:get('email').toLowerCase(),phone:get('phone'),description:get('description'),order_date:get('order_date')||today(),image_url:get('image_url')};
 if(!card.client||!card.description)return say('Nom du client et description requis.',false);
 if(card.email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(card.email))return say('Adresse courriel invalide.',false);
 if(card.image_url&&!(card.image_url.startsWith('/media/')||/^https?:\/\/[^\s]+$/.test(card.image_url)))return say('Lien d’image invalide.',false);
 say('Ajout de la commande…');
 try{await request('/api/cms/design-board',{method:'POST',body:JSON.stringify({card})});form.reset();form.querySelector('[name="order_date"]').value=today();await load();say('Commande ajoutée dans « Soumission ».')}catch(err){say(err.message,false)}
});
load();
})();
