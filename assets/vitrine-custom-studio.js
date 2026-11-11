(()=>{
const root=document.querySelector('[data-custom-scenes]');if(!root)return;
const status=root.querySelector('[data-custom-status]'),fields=[...root.querySelectorAll('[data-custom-key]')],save=root.querySelector('[data-custom-save]');
function say(s,ok=true){status.textContent=s;status.dataset.state=ok?'ok':'error'}
function field(key){return root.querySelector('[data-custom-key="'+key+'"]')}
function updateQr(){
 for(let i=1;i<=4;i++){
 const checkbox=field('vitrine.custom'+i+'.qr_enabled'),target=root.querySelector('[data-custom-qr-settings="'+i+'"]');
 if(target){target.hidden=!checkbox.checked;target.style.display=checkbox.checked?'block':'none'}
 }
}
function preview(i){
 const source=field('vitrine.custom'+i+'.html').value;
 const frame=root.querySelector('[data-custom-frame="'+i+'"]');
 frame.setAttribute('sandbox','');
 frame.srcdoc='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39; https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; media-src https:; form-action &#39;none&#39;; base-uri &#39;none&#39;; connect-src &#39;none&#39;;"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b0b0e;color:white;font-family:Arial,sans-serif}</style></head><body>'+source+'</body></html>';
}
const example='<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:radial-gradient(circle at 80% 35%,#452518,#09090d 66%);color:white;font-family:Arial,sans-serif}.hero{position:absolute;inset:0;padding:7% 8%;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.eyebrow{color:#ffb14f;letter-spacing:.22em;font-size:1.5vw;font-weight:800}h1{font-size:6.2vw;line-height:1.05;max-width:70%;margin:3% 0 2%;animation:rise 1.4s ease both}em{color:#f7941d;font-style:normal}p{font-size:2.2vw;max-width:50%;line-height:1.35}.orb{position:absolute;right:5%;top:12%;width:36vw;height:36vw;border-radius:50%;background:radial-gradient(circle,#f7941d,#7d311c 60%,transparent 70%);filter:blur(2px);animation:float 8s ease-in-out infinite}.star{position:absolute;color:#ffd58c;font-size:4vw;animation:float 6s ease-in-out infinite}.star.a{right:10%;top:15%}.star.b{right:30%;bottom:14%;animation-delay:-2s}@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}@keyframes float{50%{transform:translateY(-22px) scale(1.05)}}</style><div class="hero"><div class="orb"></div><span class="star a">✦</span><span class="star b">✦</span><div class="eyebrow">ÉVOLUTION PME · CRÉATEUR DE MARQUES</div><h1>VOS IDÉES.<br><em>NOTRE CRÉATIVITÉ.</em></h1><p>Des solutions qui prennent vie. Des marques qui se démarquent.</p></div>';
async function api(path,options){
 const response=await fetch(path,{cache:'no-store',headers:{Accept:'application/json',...(options?.body?{'Content-Type':'application/json'}:{})},...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'HTTP '+response.status);
 return data;
}
async function load(){
 try{
 const {content={}}=await api('/api/cms/content');
 for(const f of fields){
  const key=f.dataset.customKey;
  const n=Number(key.match(/custom(\d)/)?.[1]||1);
  const def=key.endsWith('.name')?'Scène personnalisée '+n:key.endsWith('.qr_label')?'Scannez pour découvrir':'';
  const value=content[key]?.value??def;
  if(f.type==='checkbox')f.checked=String(value)==='true';
  else f.value=value;
 }
 updateQr();say('Studio HTML prêt. Ajoute une scène ou colle le code que je t’ai préparé.');
 }catch(e){say('Impossible de charger les scènes : '+e.message,false)}
}
root.addEventListener('change',e=>{if(e.target?.matches('[data-custom-key$=".qr_enabled"]'))updateQr()});
function loadFileAsText(file){
 if(typeof file.text==='function')return file.text();
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||''));
  reader.onerror=()=>reject(Error('La lecture du fichier a échoué.'));
  reader.readAsText(file,'UTF-8');
 });
}
async function importFile(i,file){
 const statusEl=root.querySelector('[data-custom-import-status="'+i+'"]');
 const inform=(msg,ok=true)=>{if(statusEl){statusEl.textContent=msg;statusEl.dataset.state=ok?'ok':'error'}say(msg,ok)};
 inform('Lecture de « '+file.name+' »…');
 try{
  if(!/\.html?$/i.test(file.name))throw Error('Sélectionne un fichier .html ou .htm.');
  if(file.size>250*1024)throw Error('Le fichier dépasse 250 Ko.');
  const raw=await loadFileAsText(file);
  if(!raw.trim())throw Error('Le fichier est vide.');
  const doc=new DOMParser().parseFromString(raw,'text/html');
  doc.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv="refresh"]').forEach(el=>el.remove());
  const styles=Array.from(doc.head.querySelectorAll('style')).map(el=>el.outerHTML).join('\n');
  const markup=[styles,doc.body.innerHTML].filter(Boolean).join('\n').trim();
  if(!markup)throw Error('Aucun HTML affichable dans le fichier.');
  const editor=field('vitrine.custom'+i+'.html');
  if(markup.length>(editor.maxLength||20000))throw Error('HTML trop long : '+markup.length+' caractères (maximum 20 000).');
  if(editor.value.trim()&&!confirm('Remplacer la scène HTML '+i+' par le fichier « '+file.name+' » ?')){inform('Importation annulée.');return}
  editor.value=markup;
  field('vitrine.custom'+i+'.enabled').checked=true;
  const nameField=field('vitrine.custom'+i+'.name');
  if(!nameField.value.trim()||/^Scène personnalisée \d+$/.test(nameField.value.trim()))
   nameField.value=file.name.replace(/\.html?$/i,'').replace(/[-_]+/g,' ').slice(0,90);
  preview(i);
  inform('Fichier lu! Enregistrement automatique de la scène '+i+'…');
  const prefix='vitrine.custom'+i+'.';
  const content={};
  for(const f of fields){
   if(!f.dataset.customKey.startsWith(prefix))continue;
   content[f.dataset.customKey]={type:'text',value:f.type==='checkbox'?String(f.checked):f.value.trim()};
  }
  const result=await api('/api/cms/content',{method:'PUT',body:JSON.stringify({content})});
  if(!result.ok||result.saved<Object.keys(content).length)throw Error('Le CMS n’a pas confirmé l’enregistrement.');
  const response=await api('/api/vitrine?import-check='+Date.now());
  for(const [key,val] of Object.entries(content))if(String(response.content?.[key]??'')!==val.value)throw Error('Le fichier est enregistré, mais le site public ne confirme pas encore la scène.');
  const live=document.querySelector('[data-vitrine-preview-live]');if(live)live.src='/vitrine.html?cms-preview='+Date.now();
  inform('✓ « '+file.name+' » importé, enregistré et activé dans la vitrine. La TCL récupérera la scène automatiquement.');
 }catch(e){inform('Importation : '+e.message,false)}
}
for(let i=1;i<=4;i++){
 const upload=root.querySelector('[data-custom-import="'+i+'"]');
 const open=root.querySelector('[data-custom-open="'+i+'"]');
 const drop=root.querySelector('[data-custom-drop="'+i+'"]');
 if(!upload||!open||!drop)continue;
 open.addEventListener('click',()=>upload.click());
 upload.addEventListener('change',async()=>{
  const file=upload.files&&upload.files[0];
  if(file)await importFile(i,file);
  upload.value='';
 });
 drop.addEventListener('dragover',event=>{event.preventDefault();drop.style.borderColor='#79df95'});
 drop.addEventListener('dragleave',()=>{drop.style.borderColor='#ef9c37'});
 drop.addEventListener('drop',async event=>{
  event.preventDefault();drop.style.borderColor='#ef9c37';
  const file=event.dataTransfer?.files?.[0];
  if(file)await importFile(i,file);
 });
}
for(let i=1;i<=4;i++){
 root.querySelector('[data-custom-preview="'+i+'"]').addEventListener('click',()=>preview(i));
 root.querySelector('[data-custom-example="'+i+'"]').addEventListener('click',()=>{
  const html=field('vitrine.custom'+i+'.html');
  if(html.value.trim()&&!confirm('Remplacer le code actuel par le modèle animé?'))return;
  html.value=example;
  field('vitrine.custom'+i+'.name').value='Nouvelle création Évolution PME';
  preview(i);say('Modèle ajouté dans la scène '+i+'. Active la scène puis enregistre pour la publier.');
 });
}
save.addEventListener('click',async()=>{
 const content={};
 for(const f of fields)content[f.dataset.customKey]={type:'text',value:f.type==='checkbox'?String(f.checked):f.value.trim()};
 for(let i=1;i<=4;i++){
  const p='vitrine.custom'+i+'.';
  if(content[p+'enabled'].value==='true'&&!content[p+'html'].value){say('Ajoute du HTML à la scène '+i+' avant de l’activer.',false);return}
 }
 save.disabled=true;say('Enregistrement des scènes HTML…');
 try{
  const result=await api('/api/cms/content',{method:'PUT',body:JSON.stringify({content})});
  if(!result.ok||result.saved<Object.keys(content).length)throw Error('Enregistrement incomplet.');
  const publicResult=await api('/api/vitrine?verify='+Date.now());
  for(const [key,val] of Object.entries(content))if(String(publicResult.content?.[key]??'')!==val.value)throw Error('Le site public n’a pas encore reçu '+key);
  say('Scènes HTML enregistrées et confirmées. La TCL se mettra à jour automatiquement.');
  const previewLive=document.querySelector('[data-vitrine-preview-live]');if(previewLive)previewLive.src='/vitrine.html?cms-preview='+Date.now();
 }catch(e){say('Erreur : '+e.message,false)}
 finally{save.disabled=false}
});
load();
})();