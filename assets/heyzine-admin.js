(()=>{'use strict';
const root=document.getElementById('heyzine-tool');if(!root)return;
root.innerHTML='<p class="cms-lead">Choisis les catalogues à publier sur Évolution PME et classe-les. Les autres catalogues Heyzine restent privés sur ton site.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><button class="cms-save" id="hz-load" type="button">ACTUALISER</button><button class="cms-save" id="hz-save" type="button" disabled>ENREGISTRER MA SÉLECTION</button></div><p class="cms-status" id="hz-status" role="status"></p><div id="hz-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-top:20px"></div>';
const btn=root.querySelector('#hz-load'),save=root.querySelector('#hz-save'),status=root.querySelector('#hz-status'),list=root.querySelector('#hz-list');
const elt=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
let books=[];
async function request(url,opts){const r=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json',...(opts?.body?{'Content-Type':'application/json'}:{})},...opts});const data=await r.json();if(!r.ok)throw Error(data.error||'Erreur serveur.');return data}
function render(selections){list.replaceChildren();const byId=new Map(selections.map(s=>[s.flipbook_id,s]));
for(const b of books){const s=byId.get(b.id),card=elt('article');card.className='cms-site-card';card.style.cssText='min-width:0;display:flex;flex-direction:column;gap:10px';
if(b.thumbnail&&b.thumbnail.startsWith('https://')){const img=elt('img');img.src=b.thumbnail;img.alt='Couverture de '+b.title;img.loading='lazy';img.style.cssText='width:100%;aspect-ratio:4/3;object-fit:contain;background:#18181b;border-radius:10px';card.append(img)}
card.append(elt('strong',b.title));if(b.pages)card.append(elt('small',b.pages+' pages'));
const selectLabel=elt('label');selectLabel.style.cssText='display:flex;gap:8px;align-items:center';
const check=elt('input');check.type='checkbox';check.checked=Boolean(s?.published);check.dataset.id=b.id;check.className='hz-check';selectLabel.append(check,elt('span','Publier sur mon site'));card.append(selectLabel);
const label=elt('label','Catégorie');const sel=elt('select');sel.className='hz-category';sel.dataset.id=b.id;sel.style.cssText='display:block;width:100%;padding:11px;background:#111;color:#fff;border:1px solid #555;border-radius:8px;margin-top:6px';
for(const cat of ['Vêtements','Produits promotionnels']){const opt=elt('option',cat);opt.value=cat;sel.append(opt)}
sel.value=s?.category||'Vêtements';sel.disabled=!check.checked;check.addEventListener('change',()=>{sel.disabled=!check.checked;status.textContent='Changements non enregistrés.'});sel.addEventListener('change',()=>status.textContent='Changements non enregistrés.');label.append(sel);card.append(label);
const link=elt('a','CONSULTER ↗');link.href=b.url;link.target='_blank';link.rel='noopener noreferrer';link.className='pill';link.style.cssText='margin-top:auto;text-align:center';card.append(link);list.append(card)}
save.disabled=false}
async function load(){btn.disabled=true;save.disabled=true;status.textContent='Chargement des catalogues…';try{const [remote,stored]=await Promise.all([request('/api/cms/heyzine-flipbooks'),request('/api/cms/heyzine-selection')]);books=remote.flipbooks||[];render(stored.selections||[]);status.textContent=books.length+' catalogues disponibles. Sélectionne, catégorise puis enregistre.'}catch(e){status.textContent=e.message;status.dataset.state='error'}finally{btn.disabled=false}}
save.addEventListener('click',async()=>{save.disabled=true;status.textContent='Enregistrement…';try{const catalogues=books.filter(b=>list.querySelector('.hz-check[data-id="'+CSS.escape(b.id)+'"]')?.checked).map(b=>({id:b.id,title:b.title,url:b.url,thumbnail:b.thumbnail,category:list.querySelector('.hz-category[data-id="'+CSS.escape(b.id)+'"]').value}));const d=await request('/api/cms/heyzine-selection',{method:'POST',body:JSON.stringify({catalogues})});status.textContent=d.saved+' catalogue(s) sélectionné(s) et enregistrés dans D1.';status.dataset.state='ok'}catch(e){status.textContent=e.message;status.dataset.state='error'}finally{save.disabled=false}});
btn.addEventListener('click',load);load();
})();
