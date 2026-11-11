(()=>{
const form=document.querySelector('[data-vitrine-v2-form]');if(!form)return;
const status=form.querySelector('[data-vitrine-v2-status]');
const fields=[...form.querySelectorAll('[data-vitrine-key]')];
const defaults=[
 ['Créateur de marques et de solutions pour les PME','Vos idées. Vos défis.','Nos solutions.','Nous transformons vos idées en marques fortes et en solutions concrètes, pensées pour votre réalité, vos équipes et votre croissance.','Image de marque | Solutions numériques | Formations'],
 ['Des idées qui prennent vie','Vos équipes.','Votre image.','Vêtements corporatifs, impression et outils de marque conçus pour que votre entreprise soit reconnue partout où elle travaille.','T-shirts | Polos | Cotons ouatés | Personnalisation'],
 ['Identité visuelle · marques · impression','Une entreprise qu’on','reconnaît.','Une image cohérente, du premier regard aux outils utilisés sur le terrain. Pas seulement du beau : du clair, du crédible et du mémorable.','Création de logos | Identité visuelle | Objets promotionnels'],
 ['Solutions numériques pour les PME','Des outils qui','travaillent.','Logiciels, automatisations et solutions numériques sur mesure. Nous partons d’un besoin concret pour construire un outil vraiment utile.','Sites Web | Automatisation | Logiciels sur mesure'],
 ['Formations humaines et concrètes','Faire évoluer','les gens.','Le service à la clientèle, c’est aussi le service employé. Des formations adaptées à vos équipes, à votre milieu et à vos situations réelles.','Communication | Écoute active | Situations difficiles | Formation continue'],
 ['Événement créatif · Noël 2026','Viens faire ton','chandail de Noël!','Un moment festif pour personnaliser ton vêtement et créer un souvenir à ton image. Vêtement, matériel et chocolat chaud inclus.','Pour petits et grands | Atelier de 2 heures | Groupes et entreprises']
];
const fallback={'vitrine.settings.seconds_v2':'11'};
for(let i=0;i<6;i++){
 const p='vitrine.page'+(i+1)+'.';
 for(const [j,k] of ['eyebrow','title','accent','description','tags'].entries())fallback[p+k]=defaults[i][j];
 fallback[p+'enabled']='true';
 fallback[p+'qr_enabled']=i===5?'true':'false';
 fallback[p+'qr_url']=i===5?'https://evolutionpme.ca/ateliers-noel.html':'';
 fallback[p+'qr_label']=i===5?'Inscription aux ateliers':'Scannez pour découvrir';
}
function say(message,ok=true){status.textContent=message;status.dataset.state=ok?'ok':'error'}
async function request(url,options){
 const response=await fetch(url,{cache:'no-store',headers:{'Accept':'application/json',...(options?.body?{'Content-Type':'application/json'}:{})},...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Erreur HTTP '+response.status);
 return data;
}
function qrFields(){
 for(let i=1;i<=6;i++){
  const on=form.querySelector('[data-vitrine-key="vitrine.page'+i+'.qr_enabled"]');
  const panel=form.querySelector('[data-vitrine-qr-settings="'+i+'"]');
  if(panel&&on){panel.hidden=!on.checked;panel.style.display=on.checked?'block':'none'}
 }
}
for(const checkbox of form.querySelectorAll('[data-vitrine-key$=".qr_enabled"]'))checkbox.addEventListener('change',qrFields);
async function load(){
 try{
 const data=await request('/api/cms/content');
 for(const field of fields){
  const key=field.dataset.vitrineKey;
  const value=data.content?.[key]?.value??fallback[key]??'';
  if(field.type==='checkbox')field.checked=String(value)!=='false';
  else field.value=value;
 }
 qrFields();
 say('Six scènes prêtes à modifier. Enregistre pour publier sur la TCL.');
 }catch(e){say('Impossible de charger les scènes : '+e.message,false)}
}
form.addEventListener('submit',async event=>{
 event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;
 say('Enregistrement en cours…');
 const content={};
 for(const field of fields)content[field.dataset.vitrineKey]={type:'text',value:field.type==='checkbox'?String(field.checked):field.value.trim()};
 try{
  const saved=await request('/api/cms/content',{method:'PUT',body:JSON.stringify({content})});
  if(!saved.ok||saved.saved<Object.keys(content).length)throw Error('Le CMS n’a pas enregistré tous les champs.');
  const response=await request('/api/vitrine?verify='+Date.now());
  for(const [key,item] of Object.entries(content)){
   if(String(response.content?.[key]??'')!==item.value)throw Error('Le site public ne reçoit pas encore la nouvelle valeur de '+key+'.');
  }
  say('Les six scènes sont enregistrées et vérifiées. La TCL se mettra à jour automatiquement.');
  const preview=document.querySelector('[data-vitrine-preview-live]');if(preview)preview.src='/vitrine.html?cms-preview='+Date.now();
 }catch(e){say('Échec : '+e.message,false)}
 finally{submit.disabled=false}
});
load();
})();