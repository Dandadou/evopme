import {renderCard} from './digital-card.js';
import {cleanCardLinks} from './digital-card-links.js';
const root=document.querySelector('[data-digital-cards]');
if(root) init(root);
function init(root) {
  root.innerHTML=`
  <p class="dc__muted" data-local-note hidden></p>
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
        <fieldset class="dc__wide dc__visibility"><legend>Texte autour de la carte</legend>
          <label><input name="hideHeading" type="checkbox"> Masquer l’en-tête au-dessus</label>
          <label><input name="hideActions" type="checkbox"> Masquer les boutons de contact en dessous</label>
        </fieldset>
        <div class="dc__wide dc__actions"><button class="dc__button dc__button--primary" type="submit">Enregistrer</button><button class="dc__button" type="button" data-publish hidden></button></div>
      </form>
      <p role="status" class="dc__status" data-status></p>
    </div>
    <div class="dc__box">
      <h2>Aperçu recto-verso</h2>
      <label class="dc__visibility dc__note"><input type="checkbox" data-clean-preview> Voir comme un visiteur (sans contours)</label>
      <div class="dc__public-heading" data-card-heading></div>
      <div data-card-preview></div>
      <div class="dc__zone-editor">
        <h3>Zones cliquables</h3>
        <p class="dc__muted">Les contours sont visibles seulement ici. Ajoute un lien sur une partie de l’image ou sur tout un côté.</p>
        <div class="dc__actions">
          <button type="button" class="dc__button" data-zone-add="front">Ajouter sur le recto</button>
          <button type="button" class="dc__button" data-zone-add="back">Ajouter sur le verso</button>
        </div>
        <label class="dc__visibility dc__note"><input type="checkbox" data-test-links> Tester les liens dans l’aperçu</label>
        <label class="dc__note">Zone à modifier<select data-zone-select><option value="">Aucune zone sélectionnée</option></select></label>
        <div class="dc__form" data-zone-editor hidden>
          <label class="dc__wide">Libellé du lien<input data-zone-label maxlength="80" placeholder="Ex. Visiter le site"></label>
          <label class="dc__wide">Lien de destination<input data-zone-url maxlength="250" placeholder="https://… ou tel:… ou mailto:…"></label>
          <label class="dc__wide dc__visibility"><span><input type="checkbox" data-zone-full> Rendre tout ce côté cliquable</span></label>
          <label>Largeur (%)<input type="number" data-zone-width min="8" max="100" step="1"></label>
          <label>Hauteur (%)<input type="number" data-zone-height min="12" max="100" step="1"></label>
          <div class="dc__wide dc__actions">
            <button type="button" class="dc__button" data-zone-place>Placer sur la carte</button>
            <button type="button" class="dc__button" data-zone-remove>Enlever la zone</button>
          </div>
          <p class="dc__wide dc__muted" data-zone-status role="status"></p>
        </div>
      </div>
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
  const heading=root.querySelector('[data-card-heading]');
  const zoneEditor=root.querySelector('[data-zone-editor]'), zoneList=root.querySelector('[data-zone-select]');
  const zoneLabel=root.querySelector('[data-zone-label]'), zoneURL=root.querySelector('[data-zone-url]');
  const zoneFull=root.querySelector('[data-zone-full]'), zoneWidth=root.querySelector('[data-zone-width]'), zoneHeight=root.querySelector('[data-zone-height]');
  const zonePlace=root.querySelector('[data-zone-place]'), zoneStatus=root.querySelector('[data-zone-status]');
  const testLinks=root.querySelector('[data-test-links]');
  const cleanPreview=root.querySelector('[data-clean-preview]');
  const localNote=root.querySelector('[data-local-note]');
  const branchPreview=location.hostname==='hubert-cartes-numeriques-evopme.dadou195.workers.dev';
  const previewHost=location.hostname.endsWith('.workers.dev')||['localhost','127.0.0.1'].includes(location.hostname);
  const draftKey='evopme.digital-card.test-draft.v1';
  let local=false;
  let zones=[], selected=-1, side='front', placing=false;
  const toggle=root.querySelector('[data-publish]'), save=form.querySelector('[type=submit]'), demo=root.querySelector('[data-demo]');
  const qr=root.querySelector('[data-qrcode]'), qrImage=root.querySelector('[data-qr-image]'), link=root.querySelector('[data-public-link]');
  let active='', published=false, busy=false, pending=0, revision=0, images={}, stableURL='', imageJobs={};
  const textKeys=['name','company','title','slug','phone','email','website','accent','background'];
  const blank={accent:'#fa7824',background:'#202328'};
  const api='/api/cms/digital-cards';
  const show=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
  const setButtons=()=>{
    save.disabled=busy||pending>0;toggle.disabled=save.disabled;list.disabled=busy;demo.disabled=busy;
    toggle.hidden=local||!active;toggle.textContent=published?'Retirer du public':'Publier la carte';
  };
  const read=()=>({...Object.fromEntries(textKeys.map(k=>[k,field(k).value.trim()])),
    hideHeading:field('hideHeading').checked,hideActions:field('hideActions').checked});
  const faceLabel=face=>face==='front'?'Recto':'Verso';
  const limit=(n,min,max)=>Math.min(max,Math.max(min,Math.round(n)));
  const currentZone=()=>zones[selected];
  function drawZoneEditor(){
    const z=currentZone();
    zoneList.replaceChildren(new Option('Aucune zone sélectionnée',''),...zones.map((zone,i)=>new Option(faceLabel(zone.face)+' · '+(zone.label||'Lien '+(i+1)),String(i))));
    zoneList.value=z?String(selected):'';
    zoneEditor.hidden=!z;
    zoneStatus.textContent=placing?'Clique à l’endroit voulu sur la carte pour placer la zone.':'';
    if(!z)return;
    zoneLabel.value=z.label;zoneURL.value=z.url;
    zoneWidth.value=z.w;zoneHeight.value=z.h;
    zoneFull.checked=z.x===0&&z.y===0&&z.w===100&&z.h===100;
    zoneWidth.disabled=zoneHeight.disabled=zonePlace.disabled=zoneFull.checked;
  }
  function editZone(){
    const z=currentZone();
    if(!z)return;
    z.label=zoneLabel.value;
    z.url=zoneURL.value.trim();
    if(!zoneFull.checked){
      const w=limit(Number(zoneWidth.value),8,100),h=limit(Number(zoneHeight.value),12,100);
      Object.assign(z,{w,h,x:Math.min(z.x,100-w),y:Math.min(z.y,100-h)});
    }
    if(zoneList.selectedOptions[0])zoneList.selectedOptions[0].textContent=faceLabel(z.face)+' · '+(z.label||'Lien '+(selected+1));
    draw();
  }
  const draw=()=>{
    const card={...read(),...images,zones};
    if(card.website&&!/^https?:\/\//i.test(card.website)) card.website='';
    heading.hidden=card.hideHeading;
    heading.textContent=[card.name,card.title,card.company].filter(Boolean).join(' · ');
    renderCard(preview,card,{preview:!cleanPreview.checked,testLinks:testLinks.checked&&!placing,contact:!card.hideActions,side,
      onSide:face=>{side=face;},
      onPlace:placing?(x,y)=>{
        const z=currentZone();
        if(!z||!Number.isFinite(x)||!Number.isFinite(y))return;
        z.x=limit(x-z.w/2,0,100-z.w);z.y=limit(y-z.h/2,0,100-z.h);
        placing=false;drawZoneEditor();draw();zonePlace.focus();
      }:undefined});
  };
  const makeQR=()=>{
    stableURL=active&&!local?new URL('/carte/'+active,location.origin).href:'';
    qr.hidden=!stableURL;
    qrImage.replaceChildren();
    if(!stableURL)return;
    link.href=stableURL;link.textContent=stableURL;
    root.querySelector('[data-qr-note]').textContent=location.hostname.endsWith('.workers.dev')?'Aperçu de test · ne pas imprimer ce QR.':published?'Lien public · aucun compte requis':'Brouillon · ce QR fonctionnera après publication.';
    try{new window.QRCode(qrImage,{text:stableURL,width:320,height:320,correctLevel:window.QRCode.CorrectLevel.M});}
    catch{qrImage.textContent='QR indisponible';}
  };
  const setCard=(card={},saved=false)=>{
    revision++;pending=0;imageJobs={};images={};
    active=saved?card.slug:'';published=saved&&!!card.published;
    zones=(card.zones||[]).map(zone=>({...zone}));
    selected=-1;side='front';placing=false;testLinks.checked=false;cleanPreview.checked=false;
    field('hideHeading').checked=card.hideHeading===true;
    field('hideActions').checked=card.hideActions===true;
    for(const key of textKeys) field(key).value=card[key]||blank[key]||'';
    field('slug').readOnly=!!active;
    for(const key of ['front','back','logo']){images[key]=card[key]||'';field(key).value='';}
    setButtons();drawZoneEditor();draw();makeQR();
  };
  const request=async(path,options)=>{
    const res=await fetch(api+path,{...options,credentials:'same-origin',cache:'no-store'});
    let data;try{data=await res.json();}catch{throw new Error('Reconnecte-toi à l’administration, puis réessaie.');}
    if(!res.ok){
      const error=new Error(data.error||'Impossible de charger les cartes.');
      error.status=res.status;throw error;
    }
    return data;
  };
  const localDraft=()=>{
    try{return JSON.parse(localStorage.getItem(draftKey)||'null');}catch{return null;}
  };
  const refresh=async()=>{
    const saved=local?localDraft():null;
    const {cards}=local?{cards:saved?[saved]:[]}:await request('');
    list.replaceChildren(new Option('Nouvelle carte',''),...cards.map(c=>new Option(c.name+(c.company?' · '+c.company:'')+(c.published?' · Publiée':' · Brouillon'),c.slug)));
    list.value=active;
  };
  async function select(slug){
    busy=true;setButtons();
    try{
      if(slug){const card=local?localDraft():(await request('?slug='+encodeURIComponent(slug))).card;if(!card)throw new Error('Brouillon introuvable.');setCard(card,true);}
      else setCard();
      show('');
    }catch(error){list.value=active;show(error.message,true);}
    finally{busy=false;setButtons();}
  }
  list.addEventListener('change',()=>select(list.value));
  demo.addEventListener('click',()=>{
    if(active&&!confirm('Remplacer l’aperçu actuel par une nouvelle démo vierge? Les modifications non enregistrées seront perdues.')) return;
    list.value='';setCard({name:'Alex Tremblay',company:'Atelier Démo',title:'Création et design',slug:'atelier-demo',phone:'450 555-0100',email:'bonjour@example.com',zones:[
      {face:'front',label:'Site web',url:'https://example.com/',x:59,y:8,w:33,h:20},
      {face:'back',label:'Écrire',url:'mailto:bonjour@example.com',x:54,y:57,w:36,h:22}
    ]});
    show('Exemple fictif. Change les couleurs et retourne la carte pour essayer.');
  });
  form.addEventListener('input',event=>{if(event.target.type!=='file')draw();});
  cleanPreview.addEventListener('change',()=>{placing=false;testLinks.checked=cleanPreview.checked;drawZoneEditor();draw();});
  testLinks.addEventListener('change',()=>{placing=false;drawZoneEditor();draw();});
  for(const button of root.querySelectorAll('[data-zone-add]'))button.addEventListener('click',()=>{
    if(zones.length>=12)return show('Tu peux créer jusqu’à 12 zones par carte.',true);
    const face=button.dataset.zoneAdd;
    zones.push({face,label:'',url:'',x:32,y:39,w:36,h:22});
    selected=zones.length-1;side=face;placing=false;
    drawZoneEditor();draw();zoneLabel.focus();
  });
  zoneList.addEventListener('change',()=>{
    selected=zoneList.value===''?-1:Number(zoneList.value);
    const z=currentZone();
    if(z)side=z.face;
    placing=false;drawZoneEditor();draw();
  });
  for(const input of [zoneLabel,zoneURL,zoneWidth,zoneHeight])input.addEventListener('input',editZone);
  for(const input of [zoneWidth,zoneHeight])input.addEventListener('change',drawZoneEditor);
  zonePlace.addEventListener('click',()=>{
    const z=currentZone();if(!z)return;
    placing=!placing;cleanPreview.checked=false;side=z.face;drawZoneEditor();draw();
  });
  zoneFull.addEventListener('change',()=>{
    const z=currentZone();if(!z)return;
    Object.assign(z,zoneFull.checked?{x:0,y:0,w:100,h:100}:{x:32,y:39,w:36,h:22});
    side=z.face;placing=false;drawZoneEditor();draw();
  });
  root.querySelector('[data-zone-remove]').addEventListener('click',()=>{
    if(!currentZone())return;
    zones.splice(selected,1); selected=-1;placing=false;drawZoneEditor();draw();zoneList.focus();
  });
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
    let validZones;
    try{validZones=cleanCardLinks(zones);}catch(error){show(error.message,true);zoneList.focus();return;}
    busy=true;setButtons();
    try{
      if(local){
        const existing=localDraft();
        if(!active&&existing&&!confirm('Remplacer le brouillon de test enregistré dans ce navigateur?'))return;
        const card={...read(),...images,zones:validZones,published:false};
        try{localStorage.setItem(draftKey,JSON.stringify(card));}
        catch{throw new Error('Ce navigateur ne permet pas d’enregistrer le brouillon ou son espace est plein.');}
        setCard(card,true);await refresh();show('Brouillon de test enregistré dans ce navigateur.');return;
      }
      const {card}=await request(active?'?slug='+encodeURIComponent(active):'',{
        method:active?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...read(),...images,zones:validZones,published:nextPublished})
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
  const load=()=>{
    if(loaded||!panel?.classList.contains('active'))return;
    loaded=true;
    async function enableLocal(){
      local=true;localNote.hidden=false;
      localNote.textContent='Mode test : un seul brouillon, gardé dans ce navigateur. Aucune donnée de la carte envoyée au serveur.';
      save.textContent='Enregistrer le brouillon de test';
      setButtons();makeQR();await refresh();
      const saved=localDraft();if(saved&&!active&&!field('name').value)setCard(saved,true);
    }
    if(branchPreview){enableLocal();return;}
    refresh().catch(e=>{
      if(previewHost&&[401,403,503].includes(e.status))enableLocal();
      else{loaded=false;show(e.message,true);}
    });
  };
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
