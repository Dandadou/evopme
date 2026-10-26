(()=>{'use strict';
const root=document.getElementById('heyzine-tool');if(!root)return;
root.innerHTML='<p class="cms-lead">Consulte les catalogues du compte Heyzine et choisis ceux à présenter. Rien n’est publié automatiquement.</p><button class="cms-save" id="hz-load" type="button">ACTUALISER LES CATALOGUES</button><p class="cms-status" id="hz-status" role="status"></p><div id="hz-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:20px"></div>';
const btn=root.querySelector('#hz-load'),status=root.querySelector('#hz-status'),list=root.querySelector('#hz-list');
const elt=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
async function load(){btn.disabled=true;status.textContent='Chargement depuis Heyzine…';list.replaceChildren();try{
const response=await fetch('/api/cms/heyzine-flipbooks',{credentials:'same-origin',headers:{Accept:'application/json'}});
const data=await response.json();if(!response.ok)throw Error(data.error||'Erreur de connexion.');
const books=data.flipbooks||[];status.textContent=books.length+' catalogue(s) trouvé(s). Tu peux les consulter sans les publier.';
for(const b of books){const card=elt('article');card.className='cms-site-card';card.style.cssText='min-width:0;display:flex;flex-direction:column;gap:10px';
if(b.thumbnail&&/^https:\/\//.test(b.thumbnail)){const img=elt('img');img.src=b.thumbnail;img.alt='Couverture de '+b.title;img.loading='lazy';img.style.cssText='width:100%;aspect-ratio:4/3;object-fit:contain;background:#18181b;border-radius:10px';card.append(img)}
const heading=elt('strong',b.title);card.append(heading);
const meta=elt('small',b.pages?b.pages+' pages':'Catalogue Heyzine');card.append(meta);
if(b.description){const desc=elt('p',b.description);desc.style.cssText='font-size:.85rem;color:#aaa;margin:0';card.append(desc)}
const link=elt('a','VOIR LE CATALOGUE ↗');link.href=b.url;link.target='_blank';link.rel='noopener noreferrer';link.className='pill';link.style.cssText='margin-top:auto;text-align:center';card.append(link);list.append(card)}
}catch(err){status.textContent=err.message;status.dataset.state='error'}finally{btn.disabled=false}}
btn.addEventListener('click',load);load();
})();
