(()=>{
const form=document.querySelector('[data-vitrine-form]');if(!form)return;
const status=form.querySelector('[data-vitrine-status]');
const fields=[...form.querySelectorAll('[data-vitrine-key]')];
const defaults={
'vitrine.slide1.title':'VOS IDÉES. NOTRE CRÉATIVITÉ.','vitrine.slide1.subtitle':'Évolution PME · Créateur de marques','vitrine.slide1.image':'/assets/%C3%89tiquette%20EVOPME.png',
'vitrine.slide2.title':'DES VÊTEMENTS À VOTRE IMAGE.','vitrine.slide2.subtitle':'T-shirts, cotons ouatés et vêtements corporatifs personnalisés',
'vitrine.slide3.title':'DES MARQUES QUI SE DÉMARQUENT.','vitrine.slide3.subtitle':'Identité visuelle, graphisme et produits promotionnels',
'vitrine.slide4.title':'ATELIERS DE NOËL','vitrine.slide4.subtitle':'Venez créer votre chandail de Noël! Inscription en ligne.'
};
async function request(path,opts={}){const response=await fetch(path,{...opts,headers:{Accept:'application/json',...(opts.body?{'Content-Type':'application/json'}:{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Impossible de communiquer avec le CMS.');return data}
function say(value,ok){status.textContent=value;status.dataset.state=ok?'ok':'error'}
function preview(key){
 const input=fields.find(f=>f.dataset.vitrineKey===key);
 const img=form.querySelector('[data-vitrine-preview="'+key+'"]');
 if(!input||!img)return;
 const url=input.value.trim();
 if(!url){img.removeAttribute('src');img.style.display='none';return}
 try{
  const parsed=new URL(url,location.origin);
  if(parsed.origin!==location.origin){img.style.display='none';return}
  img.src=parsed.href;img.style.display='block';
 }catch{img.style.display='none'}
}
for(let i=1;i<=4;i++){
 const key='vitrine.slide'+i+'.image';
 const field=fields.find(f=>f.dataset.vitrineKey===key);
 const fileInput=form.querySelector('[data-vitrine-upload="'+key+'"]');
 const btn=form.querySelector('[data-vitrine-upload-button="'+key+'"]');
 const img=form.querySelector('[data-vitrine-preview="'+key+'"]');
 if(!field||!fileInput||!btn)continue;
 if(img)img.addEventListener('error',()=>{img.style.display='none'});
 field.addEventListener('input',()=>preview(key));
 btn.addEventListener('click',async()=>{
  const file=fileInput.files?.[0];
  if(!file){fileInput.click();return}
  if(file.size>8*1024*1024){say('Image trop lourde : maximum 8 Mo.',false);return}
  btn.disabled=true;
  say('Téléversement de l’image en cours…',true);
  try{
   const [siteData,me]=await Promise.all([request('/api/cms/sites'),request('/api/cms/me')]);
   const sites=siteData.sites||[];
   const myOrg=me.user?.organization_id;
   const site=sites.find(s=>s.organization_id===myOrg)||sites[0];
   if(!site)throw Error('Aucun site disponible pour téléverser une image.');
   const fd=new FormData();fd.append('site_id',String(site.id));fd.append('file',file);
   const data=await request('/api/cms/media',{method:'POST',body:fd});
   field.value=data.url;
   preview(key);
   fileInput.value='';
   say('Image téléversée! Clique sur « Enregistrer la vitrine » pour afficher le changement sur la TCL.',true);
  }catch(e){say(e.message,false)}
  finally{btn.disabled=false}
 });
 fileInput.addEventListener('change',()=>{if(fileInput.files?.[0])btn.click()});
}

async function load(){try{const data=await request('/api/cms/content');for(const f of fields){const key=f.dataset.vitrineKey;const val=data.content?.[key]?.value??defaults[key];if(val===undefined)continue;if(f.type==='checkbox')f.checked=String(val)!=='false';else f.value=val}for(let i=1;i<=4;i++)preview('vitrine.slide'+i+'.image');say('La vitrine est prête à être modifiée.',true)}catch(e){say(e.message,false)}}
form.addEventListener('submit',async e=>{e.preventDefault();const content={};for(const f of fields){const key=f.dataset.vitrineKey;content[key]={type:'text',value:f.type==='checkbox'?String(f.checked):f.value.trim()}}const btn=form.querySelector('[type="submit"]');btn.disabled=true;say('Enregistrement en cours…',true);try{await request('/api/cms/content',{method:'PUT',body:JSON.stringify({content})});say('Vitrine enregistrée. La télévision affichera les changements automatiquement.',true)}catch(e){say(e.message,false)}finally{btn.disabled=false}});
load();
})();