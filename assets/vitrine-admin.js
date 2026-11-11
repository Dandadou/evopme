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
async function load(){try{const data=await request('/api/cms/content');for(const f of fields){const key=f.dataset.vitrineKey;const val=data.content?.[key]?.value??defaults[key];if(val===undefined)continue;if(f.type==='checkbox')f.checked=String(val)!=='false';else f.value=val}say('La vitrine est prête à être modifiée.',true)}catch(e){say(e.message,false)}}
form.addEventListener('submit',async e=>{e.preventDefault();const content={};for(const f of fields){const key=f.dataset.vitrineKey;content[key]={type:'text',value:f.type==='checkbox'?String(f.checked):f.value.trim()}}const btn=form.querySelector('[type="submit"]');btn.disabled=true;say('Enregistrement en cours…',true);try{await request('/api/cms/content',{method:'PUT',body:JSON.stringify({content})});say('Vitrine enregistrée. La télévision affichera les changements automatiquement.',true)}catch(e){say(e.message,false)}finally{btn.disabled=false}});
load();
})();