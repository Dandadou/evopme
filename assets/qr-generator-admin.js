(()=>{
const panel=document.querySelector('[data-qr-generator]');if(!panel)return;
const input=panel.querySelector('[data-qr-input]'),color=panel.querySelector('[data-qr-color]'),preview=panel.querySelector('[data-qr-preview]'),status=panel.querySelector('[data-qr-status]');
let currentValue='';
function message(t,ok=true){status.textContent=t;status.dataset.state=ok?'ok':'error'}
function valid(){const v=input.value.trim();try{const u=new URL(v);if(!['https:','http:'].includes(u.protocol))throw Error('URL');return u.href}catch{message('Entre une adresse Web valide commençant par https://',false);return null}}
function generate(){
 const url=valid();if(!url)return false;
 if(typeof QRCode!=='function'){message('Le module de génération QR ne s’est pas chargé. Actualise cette page.',false);return false}
 try{
  preview.replaceChildren();
  new QRCode(preview,{text:url,width:380,height:380,colorDark:color.value,colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
  currentValue=url;message('Code QR créé. Tu peux le télécharger en PNG ou l’utiliser sur la vitrine.');return true;
 }catch(e){message('Impossible de générer ce code QR. Essaie une adresse plus courte.',false);return false}
}
panel.querySelector('[data-qr-create]').addEventListener('click',generate);
color.addEventListener('change',()=>{if(currentValue)generate()});
panel.querySelector('[data-qr-use]').addEventListener('click',()=>{
 if(!generate())return;
 const scene=panel.querySelector('[data-qr-scene]')?.value||'4';
 const target=document.querySelector('[data-vitrine-key="vitrine.page'+scene+'.qr_url"]');
 const toggle=document.querySelector('[data-vitrine-key="vitrine.page'+scene+'.qr_enabled"]');
 if(!target||!toggle){message('Les réglages QR de cette scène sont introuvables.',false);return}
 target.value=currentValue;
 toggle.checked=true;
 toggle.dispatchEvent(new Event('change',{bubbles:true}));
 message('QR ajouté à la scène '+scene+'. Clique sur « Enregistrer la vitrine » pour le publier.');
});
panel.querySelector('[data-qr-download]').addEventListener('click',()=>{
 if(!currentValue&&!generate())return;
 const canvas=preview.querySelector('canvas'),img=preview.querySelector('img');
 try{
  const source=document.createElement('canvas');source.width=600;source.height=600;
  const ctx=source.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,600,600);
  if(canvas)ctx.drawImage(canvas,28,28,544,544);
  else if(img&&img.complete)ctx.drawImage(img,28,28,544,544);
  else throw Error('Code QR non prêt');
  source.toBlob(blob=>{
   if(!blob){message('Téléchargement impossible sur ce navigateur.',false);return}
   const href=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=href;a.download='evolution-pme-code-qr.png';document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(href),3000);
   message('Fichier PNG préparé pour le téléchargement.');
  },'image/png');
 }catch(e){message('Impossible de télécharger le QR. Regénère-le et réessaie.',false)}
});
generate();
})();