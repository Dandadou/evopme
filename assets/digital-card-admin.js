import {renderCard} from './digital-card.js';
const root=document.querySelector('[data-digital-cards]');
if(root) init(root);
function init(root) {
  root.innerHTML=`
  <div class="dc__list"><select aria-label="Choisir une carte existante"><option value="">Nouvelle carte</option></select><button type="button" class="dc__button" data-demo>Essayer la démo</button></div>
  <div class="dc__admin">
    <div class="dc__box">
      <h2>Personnalisation</h2>
      <p class="dc__muted">Les images intégrales conservent leur design. Sans image, la carte utilise le logo et les couleurs ci-dessous.</p>
      <form class="dc__form">
        <label>Nom à afficher<input name="name" maxlength="100" required></label>
        <label>Entreprise<input name="company" maxlength="100"></label>
        <label>Fonction<input name="title" maxlength="100"></label>
        <label>Identifiant du lien<input name="slug" maxlength="64" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="nom-de-la-cliente" required></label>
        <label>Téléphone<input name="phone" type="tel" maxlength="40"></label>
        <label>Courriel<input name="email" type="email" maxlength="160"></label>
        <label class="dc__wide">Site web<input name="website" type="url" maxlength="250" placeholder="https://"></label>
        <label>Couleur d’accent<input name="accent" type="color" value="#fa7824"></label>
        <label>Couleur de fond<input name="background" type="color" value="#202328"></label>
        <div><label>Image du recto<input name="front" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="dc__button" data-clear="front">Retirer le recto</button></div>
        <div><label>Image du verso<input name="back" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="dc__button" data-clear="back">Retirer le verso</button></div>
        <div class="dc__wide"><label>Logo facultatif<input name="logo" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="dc__button" data-clear="logo">Retirer le logo</button></div>
        <div class="dc__wide dc__actions"><button class="dc__button dc__button--primary" type="submit">Enregistrer</button><button class="dc__button" type="button" data-publish hidden></button></div>
      </form>
      <p role="status" class="dc__status" data-status></p>
    </div>
    <div class="dc__box">
      <h2>Aperçu recto-verso</h2>
      <div data-card-preview></div>
      <div class="dc__qr" data-qrcode hidden>
        <p class="dc__muted" data-qr-note></p>
        <div data-qr-image aria-label="Code QR du lien de la carte"></div>
        <a data-public-link class="dc__url" target="_blank" rel="noopener"></a>
        <div class="dc__actions"><button class="dc__button" type="button" data-copy>Copier le lien</button><button class="dc__button" type="button" data-qr-download>Télécharger le QR</button></div>
      </div>
    </div>
  </div>`;
  const form=root.querySelector('form'), field=key=>form.elements.namedItem(key), list=root.querySelector('select');
  const preview=root.querySelector('[data-card-preview]'), status=root.querySelector('[data-status]');
  const toggle=root.querySelector('[data-publish]'), save=form.querySelector('[type=submit]'), demo=root.querySelector('[data-demo]');
  const qr=root.querySelector('[data-qrcode]'), qrImage=root.querySelector('[data-qr-image]'), link=root.querySelector('[data-public-link]');
  let active='', published=false, busy=false, pending=0, revision=0, images={}, stableURL='', imageJobs={};
  const textKeys=['name','company','title','slug','phone','email','website','accent','background'];
  const blank={accent:'#fa7824',background:'#202328'};
  const api='/api/cms/digital-cards';
  const show=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
  const setButtons=()=>{
    save.disabled=busy||pending>0;toggle.disabled=save.disabled;list.disabled=busy;demo.disabled=busy;
    toggle.hidden=!active;toggle.textContent=published?'Retirer du public':'Publier la carte';
  };
  const read=()=>Object.fromEntries(textKeys.map(k=>[k,field(k).value.trim()]));
  const draw=()=>{
    const card={...read(),...images};
    if(card.website&&!/^https?:\/\//i.test(card.website)) card.website='';
    renderCard(preview,card);
  };
  const makeQR=()=>{
    stableURL=active?new URL('/carte/'+active,location.origin).href:'';
    qr.hidden=!stableURL;
    qrImage.replaceChildren();
    if(!stableURL)return;
    link.href=stableURL;link.textContent=stableURL;
    root.querySelector('[data-qr-note]').textContent=published?'Lien public · aucun compte requis':'Brouillon · ce QR fonctionnera après publication.';
    try{new window.QRCode(qrImage,{text:stableURL,width:320,height:320,correctLevel:window.QRCode.CorrectLevel.M});}
    catch{qrImage.textContent='QR indisponible';}
  };
  const setCard=(card={},saved=false)=>{
    revision++;pending=0;imageJobs={};images={};
    active=saved?card.slug:'';published=saved&&!!card.published;
    for(const key of textKeys) field(key).value=card[key]||blank[key]||'';
    field('slug').readOnly=!!active;
    for(const key of ['front','back','logo']){images[key]=card[key]||'';field(key).value='';}
    setButtons();draw();makeQR();
  };
  const request=async(path,options)=>{
    const res=await fetch(api+path,{...options,credentials:'same-origin',cache:'no-store'});
    let data;try{data=await res.json();}catch{throw new Error('Reconnecte-toi à l’administration, puis réessaie.');}
    if(!res.ok)throw new Error(data.error||'Impossible de charger les cartes.');
    return data;
  };
  const refresh=async()=>{
    const {cards}=await request('');
    list.replaceChildren(new Option('Nouvelle carte',''),...cards.map(c=>new Option(c.name+(c.company?' · '+c.company:'')+(c.published?' · Publiée':' · Brouillon'),c.slug)));
    list.value=active;
  };
  async function select(slug){
    busy=true;setButtons();
    try{
      if(slug){const {card}=await request('?slug='+encodeURIComponent(slug));setCard(card,true);}
      else setCard();
      show('');
    }catch(error){list.value=active;show(error.message,true);}
    finally{busy=false;setButtons();}
  }
  list.addEventListener('change',()=>select(list.value));
  demo.addEventListener('click',()=>{
    if(active&&!confirm('Remplacer l’aperçu actuel par une nouvelle démo vierge? Les modifications non enregistrées seront perdues.')) return;
    list.value='';setCard({name:'Alex Tremblay',company:'Atelier Démo',title:'Création et design',slug:'atelier-demo',phone:'450 555-0100',email:'bonjour@example.com'});
    show('Exemple fictif. Change les couleurs et retourne la carte pour essayer.');
  });
  form.addEventListener('input',event=>{if(event.target.type!=='file')draw();});
  for(const key of ['front','back','logo']){
    field(key).addEventListener('change',async()=>{
      const file=field(key).files[0];if(!file)return;
      const rev=revision, job=Symbol();imageJobs[key]=job;pending++;setButtons();
      try{
        const result=await prepareImage(file,key==='logo');
        if(rev===revision&&imageJobs[key]===job){images[key]=result;draw();show('Image prête. Enregistre la carte pour la conserver.');}
      }catch(error){if(rev===revision&&imageJobs[key]===job)show(error.message,true);}
      finally{if(rev===revision){pending--;if(imageJobs[key]===job)field(key).value='';setButtons();}}
    });
    root.querySelector('[data-clear="'+key+'"]').addEventListener('click',()=>{
      imageJobs[key]=null;field(key).value='';images[key]='';draw();
    });
  }
  async function persist(nextPublished){
    if(busy||pending||!form.reportValidity())return;
    busy=true;setButtons();
    try{
      const {card}=await request(active?'?slug='+encodeURIComponent(active):'',{
        method:active?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...read(),...images,published:nextPublished})
      });
      setCard(card,true);
      try{await refresh();show(published?'Carte publiée. Le lien et le QR sont prêts.':'Brouillon enregistré.');}
      catch{show('Carte enregistrée; la liste n’a pas pu être actualisée.',true);}
    }catch(error){show(error.message,true);}
    finally{busy=false;setButtons();}
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(published&&!confirm('Enregistrer ces changements sur la carte publique?'))return;
    persist(published);
  });
  toggle.addEventListener('click',()=>{
    if(!confirm(published?'Rendre cette carte inaccessible au public?':'Publier le recto, le verso et ces coordonnées sur un lien accessible à toute personne qui le possède?'))return;
    persist(!published);
  });
  root.querySelector('[data-copy]').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(stableURL);show('Lien copié.');}
    catch{show('Copie le lien affiché sous le QR.',true);}
  });
  root.querySelector('[data-qr-download]').addEventListener('click',()=>{
    const canvas=qrImage.querySelector('canvas');
    if(!canvas)return show('Le QR ne peut pas être téléchargé dans ce navigateur.',true);
    const output=document.createElement('canvas');output.width=output.height=canvas.width+96;
    const ctx=output.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(canvas,48,48);
    const a=document.createElement('a');a.download=active+'-qr.png';a.href=output.toDataURL('image/png');a.click();
  });
  setCard();
  const panel=root.closest('.cms-panel');
  let loaded=false;
  const load=()=>{if(!loaded&&panel?.classList.contains('active')){loaded=true;refresh().catch(e=>{loaded=false;show(e.message,true);});}};
  new MutationObserver(load).observe(panel,{attributes:true,attributeFilter:['class']});
  load();
}
async function prepareImage(file,logo){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024) throw new Error('Choisis une image PNG, JPG ou WebP de 15 Mo maximum.');
  let img;
  try{img=await createImageBitmap(file);}catch{throw new Error('Impossible de lire cette image.');}
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const limit=logo?125_000:445_000;
  try{
    for(let size=logo?450:1600;size>=400;size=Math.floor(size*.75)){
      const ratio=Math.min(1,size/Math.max(img.width,img.height));
      canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      for(const quality of [.88,.72,.56]){
        const result=canvas.toDataURL('image/webp',quality);
        if(result.length<=limit)return result;
      }
    }
    throw new Error('Cette image est trop lourde après compression.');
  }finally{img.close();}
}
