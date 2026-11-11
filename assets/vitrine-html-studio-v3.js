(()=>{
const root=document.querySelector('[data-html-studio-v3]');if(!root)return;
const list=root.querySelector('[data-html-list]'),status=root.querySelector('[data-html-status]'),add=root.querySelector('[data-html-add]');
const MAX=12,MAX_CHARS=1000000,MAX_BYTES=1024*1024;
const map=new Map();
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(s,ok=true){status.textContent=s;status.dataset.state=ok?'ok':'error'}
const key=(n,k)=>'vitrine.custom'+n+'.'+k;
function initial(n){return{slot:n,name:'Scène HTML '+n,html:'',enabled:false,seconds:11,order:n}}
function renderQRlessPreview(frame,markup){
 const csp="default-src 'none'; script-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; media-src https: data:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";
 frame.setAttribute('sandbox','');
 frame.srcdoc='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+csp+'"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#060708;color:white}</style></head><body>'+markup+'</body></html>';
}
async function api(url,options){
 const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json',...(options?.body?{'Content-Type':'application/json'}:{})},...options});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.error||'Erreur HTTP '+response.status);
 return result;
}
function sceneCard(item){
 const n=item.slot;
 const card=document.createElement('article');card.dataset.scene=String(n);
 card.style.cssText='border:1px solid #68503a;border-radius:16px;padding:18px;margin:15px 0;background:#1b1b1f';
 card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><strong style="color:#ffb654">SCÈNE '+n+'</strong><div style="display:flex;gap:8px"><button type="button" class="pill" data-move="-1" aria-label="Remonter la scène">↑ MONTER</button><button type="button" class="pill" data-move="1" aria-label="Descendre la scène">↓ DESCENDRE</button><button type="button" class="pill" data-delete>RETIRER</button></div></div>'
 +'<label>Nom<input data-name maxlength="90" value="'+escapeHTML(item.name)+'"></label>'
 +'<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin:12px 0"><label class="cms-check"><input type="checkbox" data-enabled '+(item.enabled?'checked':'')+'> Afficher sur la TCL</label><label>Durée (secondes)<input type="number" data-seconds min="5" max="120" value="'+item.seconds+'" style="max-width:110px"></label></div>'
 +'<div style="border:2px dashed #d59a48;border-radius:13px;padding:13px;background:#27221d" data-drop><button type="button" class="pill" data-choose>CHOISIR UN FICHIER .HTML</button><input type="file" accept=".html,.htm,text/html" data-file style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"><span style="display:inline-block;margin:8px 0 0 12px;color:#ddd;font-size:.9rem">ou glisse le fichier ici</span><div data-file-note style="color:#ccc;font-size:.85rem;margin-top:8px">'+(item.html?'Un contenu HTML est déjà enregistré.':'Aucun fichier ajouté.')+'</div></div>'
 +'<details style="margin-top:14px"><summary style="cursor:pointer;color:#ffb654">Afficher ou modifier le code HTML</summary><textarea data-html rows="10" maxlength="1000000" spellcheck="false" style="font-family:monospace;font-size:12px;line-height:1.45;max-width:100%">'+escapeHTML(item.html)+'</textarea></details>'
 +'<div style="display:flex;gap:9px;flex-wrap:wrap;margin:14px 0"><button class="pill" type="button" data-preview>PRÉVISUALISER</button><button type="button" class="cms-save" data-save>ENREGISTRER CETTE SCÈNE</button></div>'
 +'<div style="aspect-ratio:16/9;border:1px solid #555;border-radius:10px;overflow:hidden;background:#060708"><iframe title="Aperçu scène '+n+'" data-frame sandbox="" style="display:block;width:100%;height:100%;border:0"></iframe></div>'
 +'<p class="cms-status" data-result aria-live="polite" style="margin-top:12px">Prête à modifier.</p>';
 const el=sel=>card.querySelector(sel);
 const say=(text,ok=true)=>{const area=el('[data-result]');area.textContent=text;area.dataset.state=ok?'ok':'error';message(text,ok)};
 const collect=()=>({
  slot:n,name:el('[data-name]').value.trim().slice(0,90)||'Scène HTML '+n,
  html:el('[data-html]').value,enabled:el('[data-enabled]').checked,
  seconds:Math.min(120,Math.max(5,Number(el('[data-seconds]').value)||11)),order:map.get(n)?.order||n
 });
 async function saveScene(){
  const x=collect();
  if(x.enabled&&!x.html.trim()){say('Ajoute ton fichier HTML avant d’activer la scène.',false);return false}
  if(x.html.length>MAX_CHARS){say('Le HTML dépasse un million de caractères.',false);return false}
  const values={};
  for(const k of ['name','html','enabled','seconds','order'])values[key(n,k)]={type:'text',value:String(x[k])};
  const button=el('[data-save]');button.disabled=true;say('Enregistrement en cours…');
  try{
   const result=await api('/api/cms/content',{method:'PUT',body:JSON.stringify({content:values})});
   if(!result.ok||result.saved<Object.keys(values).length)throw Error('Réponse de sauvegarde incomplète.');
   const publicResult=await api('/api/vitrine?check='+Date.now());
   for(const [k,v] of Object.entries(values))if(String(publicResult.content?.[k]??'')!==v.value)throw Error('Le site public ne confirme pas encore '+k);
   map.set(n,x);say('✓ Scène enregistrée'+(x.enabled?' et publiée':' (désactivée)')+'. La TCL se mettra à jour sous 30 secondes.');
   reloadLive();return true;
  }catch(e){say('Échec de la sauvegarde : '+e.message,false);return false}
  finally{button.disabled=false}
 }
 async function processFile(file){
  if(!file)return;
  say('Lecture du fichier « '+file.name+' »…');
  try{
   if(!/\.html?$/i.test(file.name))throw Error('Choisis un fichier .html ou .htm.');
   if(file.size>MAX_BYTES)throw Error('La taille maximale est de 1 Mo. Les gros visuels doivent être hébergés sur le site.');
   const raw=typeof file.text==='function'?await file.text():await new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>resolve(rd.result);rd.onerror=()=>reject(Error('Lecture impossible'));rd.readAsText(file,'UTF-8')});
   const doc=new DOMParser().parseFromString(raw,'text/html');
   doc.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv="refresh"]').forEach(e=>e.remove());
   const styles=[...doc.head.querySelectorAll('style')].map(e=>e.outerHTML).join('\n');
   const source=[styles,doc.body.innerHTML].filter(Boolean).join('\n').trim();
   if(!source)throw Error('Fichier HTML vide ou sans contenu visible.');
   if(source.length>MAX_CHARS)throw Error('Le contenu HTML dépasse la limite de 1 million de caractères.');
   if(el('[data-html]').value.trim()&&!confirm('Remplacer le HTML de cette scène par « '+file.name+' » ?'))return;
   el('[data-html]').value=source;
   if(!el('[data-name]').value.trim()||/^Scène HTML \d+$/.test(el('[data-name]').value.trim()))el('[data-name]').value=file.name.replace(/\.html?$/i,'').replace(/[-_]+/g,' ').slice(0,90);
   el('[data-enabled]').checked=true;
   el('[data-file-note]').textContent='Fichier sélectionné : '+file.name+' ('+Math.ceil(file.size/1024)+' Ko)';
   renderQRlessPreview(el('[data-frame]'),source);
   await saveScene();
  }catch(e){say('Importation impossible : '+e.message,false)}
 }
 el('[data-choose]').addEventListener('click',()=>el('[data-file]').click());
 el('[data-file]').addEventListener('change',async()=>{const f=el('[data-file]').files?.[0];if(f)await processFile(f);el('[data-file]').value=''});
 const drop=el('[data-drop]');
 drop.addEventListener('dragover',e=>{e.preventDefault();drop.style.borderColor='#82dba3'});
 drop.addEventListener('dragleave',()=>{drop.style.borderColor='#d59a48'});
 drop.addEventListener('drop',e=>{e.preventDefault();drop.style.borderColor='#d59a48';processFile(e.dataTransfer?.files?.[0])});
 el('[data-preview]').addEventListener('click',()=>{renderQRlessPreview(el('[data-frame]'),el('[data-html]').value);say('Aperçu HTML chargé. Aucun élément ne sera ajouté par-dessus sur la TCL.')});
 el('[data-save]').addEventListener('click',saveScene);
 el('[data-delete]').addEventListener('click',async()=>{
  if(!confirm('Retirer « '+collect().name+' » de la vitrine et effacer son HTML ?'))return;
  el('[data-enabled]').checked=false;el('[data-html]').value='';
  if(await saveScene()){map.delete(n);card.remove();message('Scène retirée de la vitrine.')}
 });
 el('[data-move]').forEach?.(()=>{});
 for(const b of card.querySelectorAll('[data-move]'))b.addEventListener('click',()=>move(n,Number(b.dataset.move)));
 if(item.html)renderQRlessPreview(el('[data-frame]'),item.html);
 return card;
}
function reloadLive(){const frame=document.querySelector('[data-vitrine-preview-live]');if(frame)frame.src='/vitrine.html?cms-preview='+Date.now()}
function display(){
 list.replaceChildren();
 const items=[...map.values()].filter(x=>x.html.trim()||x.enabled).sort((a,b)=>a.order-b.order||a.slot-b.slot);
 if(!items.length){const p=document.createElement('p');p.style.cssText='color:#bbb;padding:26px 10px;text-align:center';p.textContent='Aucune scène HTML pour le moment. Clique sur « + Ajouter une scène HTML ».';list.append(p)}
 else for(const x of items)list.append(sceneCard(x));
 add.disabled=items.length>=MAX;
}
async function move(n,direction){
 const sorted=[...map.values()].filter(x=>x.html.trim()||x.enabled).sort((a,b)=>a.order-b.order||a.slot-b.slot);
 const at=sorted.findIndex(x=>x.slot===n),other=sorted[at+direction];
 if(at<0||!other)return;
 // Preserve unsaved edits: require explicit save before reordering.
 const card=list.querySelector('[data-scene="'+n+'"]');
 if(card&&card.querySelector('[data-html]').value!==map.get(n).html){message('Enregistre d’abord les modifications avant de changer l’ordre.',false);return}
 const a=sorted[at],b=other,oldA=a.order,oldB=b.order;
 a.order=at+direction+1;b.order=at+1;
 // Renumber the whole visible sequence so there are no ambiguous values.
 const swapped=[...sorted];[swapped[at],swapped[at+direction]]=[swapped[at+direction],swapped[at]];
 const content={};swapped.forEach((x,i)=>{x.order=i+1;content[key(x.slot,'order')]={type:'text',value:String(x.order)}});
 try{const result=await api('/api/cms/content',{method:'PUT',body:JSON.stringify({content})});if(!result.ok)throw Error('Sauvegarde impossible');display();reloadLive();message('Ordre des scènes mis à jour.')}catch(e){a.order=oldA;b.order=oldB;message('Impossible de modifier l’ordre : '+e.message,false)}
}
add.addEventListener('click',()=>{
 const n=Array.from({length:MAX},(_,i)=>i+1).find(i=>!map.get(i)||!map.get(i).html.trim());
 if(!n){message('Les 12 emplacements sont utilisés.',false);return}
 const obj=initial(n);obj.order=Math.max(0,...[...map.values()].map(x=>x.order||0))+1;
 map.set(n,obj);display();const card=list.querySelector('[data-scene="'+n+'"]');card?.scrollIntoView({behavior:'smooth',block:'start'});message('Nouvelle scène prête : importe ton fichier HTML.');
});
async function load(){
 try{
  const result=await api('/api/cms/content');
  for(let i=1;i<=MAX;i++){
   const value=k=>result.content?.[key(i,k)]?.value;
   const html=value('html')||'',enabled=value('enabled')==='true';
   if(!html.trim()&&!enabled)continue;
   map.set(i,{slot:i,name:value('name')||'Scène HTML '+i,html,enabled,seconds:Number(value('seconds'))||11,order:Number(value('order'))||i});
  }
  display();message('Studio prêt · '+[...map.values()].filter(x=>x.enabled&&x.html.trim()).length+' scène(s) active(s).');
 }catch(e){message('Impossible de charger le CMS : '+e.message,false)}
}
load();
})();