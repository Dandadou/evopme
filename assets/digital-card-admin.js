import { cardTemplates, makeCardTemplate } from './digital-card-templates.js';
import {renderCard} from './digital-card.js';
import {buildDestination,cleanCardLinks,destinationPrefixes,hotspotMinSize,splitDestination} from './digital-card-links.js';
const root=document.querySelector('[data-digital-cards]');
if(root) init(root);
function init(root) {
  root.innerHTML=`
  <div class="dc__studio-banner"><div><span>ÉVOLUTION PME / STUDIO NUMÉRIQUE</span><strong>Studio de cartes</strong><p>Crée une carte à partir de tes images ou d’un fond vierge, puis dispose tes éléments.</p></div><span class="dc__studio-chip">RECTO / VERSO</span></div>
  <p class="dc__muted dc__studio-local" data-local-note hidden></p>
  <div class="dc__list"><select aria-label="Choisir une carte existante"><option value="">Nouvelle carte</option></select><button type="button" class="dc__button" data-demo>Essayer la démo</button></div>
  <div class="dc__admin">
    <div class="dc__box dc__box--canvas">
      <span class="dc__section-id">01 / PLAN DE TRAVAIL</span>
      <h2>Aperçu recto-verso</h2>
      <details class="dc__templates"><summary>Partir d’un modèle (sans image)</summary>
        <p class="dc__muted">Remplis tes coordonnées dans Personnalisation, puis choisis un modèle. Les faces avec une image importée ne sont pas remplacées.</p>
        <div class="dc__template-list">${Object.entries(cardTemplates).map(([key,{label}])=>`<button class="dc__button dc__template" type="button" data-template-key="${key}"><span class="dc__swatch" aria-hidden="true"></span>${label}</button>`).join('')}</div>
        <p class="dc__muted" role="status" data-template-status></p>
      </details>
      <label class="dc__visibility dc__note"><input type="checkbox" data-clean-preview> Voir comme un visiteur (sans contours)</label>
      <div class="dc__stage" data-card-stage>
        <div class="dc__archetype-brand" data-card-brand hidden><img src="/assets/archetype-card-mark.svg" alt="" width="40" height="40"><div><strong>Arch<span>é</span>type</strong><small>Par Évolution PME</small></div></div>
        <div class="dc__public-heading" data-card-heading></div>
        <div data-card-preview></div>
      </div>
      <div class="dc__zone-editor">
        <h3>Éléments de la carte</h3>
        <p class="dc__muted">Ajoute un bloc sur la face affichée, puis glisse-le où tu veux. Pour un lien invisible, tire le coin du cadre pour l’ajuster au texte imprimé. Les visiteurs ne verront pas le cadre.</p>
        <div class="dc__actions dc__element-tools" aria-label="Ajouter un élément">
          <button type="button" class="dc__button" data-add-layer="text">+ Texte</button>
          <button type="button" class="dc__button" data-add-layer="icon">+ Icône</button>
          <button type="button" class="dc__button" data-add-layer="button">+ Bouton</button>
        </div>
        <div class="dc__actions">
          <button type="button" class="dc__button" data-zone-add="front">+ Lien invisible au recto</button>
          <button type="button" class="dc__button" data-zone-add="back">+ Lien invisible au verso</button>
        </div>
        <details class="dc__templates">
          <summary>Liens rapides : réseaux sociaux et autres</summary>
          <div class="dc__form">
            <label>Type de lien<select data-quick-type><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="instagram">Instagram</option><option value="calendar">Prendre rendez-vous</option><option value="location">Itinéraire</option><option value="web">Site web ou autre lien</option></select></label>
            <label>Affichage<select data-quick-display><option value="icon">Icône</option><option value="button">Bouton</option><option value="hotspot">Lien invisible</option></select></label>
            <label class="dc__wide">Adresse du lien<input data-quick-url type="text" maxlength="250" inputmode="url" placeholder="https://…"></label>
            <button type="button" class="dc__button" data-quick-add>+ Ajouter ce lien</button>
          </div>
          <p class="dc__muted" role="status" data-quick-status></p>
        </details>
        <label class="dc__visibility dc__note"><input type="checkbox" data-test-links> Tester les liens dans l’aperçu</label>
        <label class="dc__note">Élément à modifier<select data-zone-select><option value="">Aucun élément sélectionné</option></select></label>
        <div class="dc__form" data-zone-editor hidden>
          <label class="dc__wide"><span data-label-title>Libellé du lien</span><input data-zone-label maxlength="80" placeholder="Ex. Visiter le site"></label>
          <label>Type de destination<select data-destination-type><option value="web">Site web</option><option value="email">Courriel</option><option value="phone">Téléphone</option></select></label>
          <label><span data-link-title>Lien de destination</span><span class="dc__destination"><code aria-hidden="true" data-destination-prefix>https://</code><input data-zone-url maxlength="250" placeholder="exemple.ca"></span></label>
          <label class="dc__wide" data-icon-field hidden>Icône<select data-zone-icon><option value="web">↗ Site web</option><option value="phone">☎ Téléphone</option><option value="email">✉ Courriel</option><option value="location">⌖ Adresse</option><option value="calendar">▦ Rendez-vous</option><option value="star">★ Étoile</option><option value="facebook">f Facebook</option><option value="linkedin">in LinkedIn</option><option value="instagram">◎ Instagram</option></select></label>
          <label data-style-field hidden>Couleur du texte ou de l’icône<input type="color" data-zone-color value="#ffffff"></label>
          <label data-style-field hidden>Taille du texte ou de l’icône<input type="number" data-zone-size min="8" max="38" step="1"></label>
          <label data-style-field hidden>Alignement<select data-zone-align><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select></label>
          <label class="dc__wide dc__visibility" data-full-field><span><input type="checkbox" data-zone-full> Rendre tout ce côté cliquable</span></label>
          <label>Largeur (%)<input type="number" data-zone-width min="8" max="100" step="1"></label>
          <label>Hauteur (%)<input type="number" data-zone-height min="12" max="100" step="1"></label>
          <div class="dc__wide dc__actions">
            <button type="button" class="dc__button" data-zone-place>Placer sur la carte</button>
            <button type="button" class="dc__button" data-zone-remove>Enlever l’élément</button>
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
    <div class="dc__box dc__box--settings">
      <span class="dc__section-id">02 / RÉGLAGES</span>
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
        <div class="dc__color-pair"><label>Couleur d’accent<input name="accent" type="color" value="#fa7824"></label><label>Code HEX de l’accent<input data-hex-for="accent" type="text" value="#fa7824" pattern="#[0-9a-fA-F]{6}" required spellcheck="false" autocomplete="off" title="Exemple : #fa7824"></label></div>
        <div class="dc__color-pair"><label>Couleur de fond<input name="background" type="color" value="#202328"></label><label>Code HEX du fond<input data-hex-for="background" type="text" value="#202328" pattern="#[0-9a-fA-F]{6}" required spellcheck="false" autocomplete="off" title="Exemple : #000000"></label></div>
        <label>Format de la carte<select name="format"><option value="landscape">Horizontale (7:4)</option><option value="portrait">Verticale (4:7)</option><option value="square">Carrée (1:1)</option><option value="image">Ajuster au visuel importé</option></select></label>
        <label>Coins de la carte<select name="corners"><option value="rounded">Arrondis</option><option value="square">Droits</option></select></label>
        <p class="dc__wide dc__muted">« Ajuster au visuel importé » reprend les proportions du recto (ou du verso si seul). Pour remplir les deux faces sans découpe, utilise des images aux mêmes proportions.</p>
        <div><label>Image du recto<input name="front" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="dc__button" data-clear="front">Retirer le recto</button></div>
        <div><label>Image du verso<input name="back" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="dc__button" data-clear="back">Retirer le verso</button></div>
        <div class="dc__wide"><label>Logo facultatif<input name="logo" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="dc__button" data-clear="logo">Retirer le logo</button></div>
        <fieldset class="dc__wide dc__visibility"><legend>Fond sans image</legend>
          <label><input name="blankFront" type="checkbox"> Recto vierge, sans texte automatique</label>
          <label><input name="blankBack" type="checkbox"> Verso vierge, sans texte automatique</label>
        </fieldset>
        <fieldset class="dc__wide dc__visibility"><legend>Texte autour de la carte</legend>
          <label><input name="hideHeading" type="checkbox"> Masquer l’en-tête au-dessus</label>
          <label><input name="hideActions" type="checkbox"> Masquer les boutons de contact en dessous</label>
        </fieldset>
        <div class="dc__wide dc__actions"><button class="dc__button dc__button--primary" type="submit">Enregistrer</button><button class="dc__button" type="button" data-publish hidden></button></div>
      </form>
      <p role="status" class="dc__status" data-status></p>
    </div>
  </div>`;
  const form=root.querySelector('form'), field=key=>form.elements.namedItem(key), list=root.querySelector('select');
  const preview=root.querySelector('[data-card-preview]'), status=root.querySelector('[data-status]');
  const heading=root.querySelector('[data-card-heading]'), stage=root.querySelector('[data-card-stage]'), brand=root.querySelector('[data-card-brand]');
  const zoneEditor=root.querySelector('[data-zone-editor]'), zoneList=root.querySelector('[data-zone-select]');
  const zoneLabel=root.querySelector('[data-zone-label]'), zoneURL=root.querySelector('[data-zone-url]');
  const destinationType=root.querySelector('[data-destination-type]'),destinationPrefix=root.querySelector('[data-destination-prefix]');
  let webPrefix='https://';
  const zoneFull=root.querySelector('[data-zone-full]'), zoneWidth=root.querySelector('[data-zone-width]'), zoneHeight=root.querySelector('[data-zone-height]');
  const zonePlace=root.querySelector('[data-zone-place]'), zoneStatus=root.querySelector('[data-zone-status]');
  const zoneIcon=root.querySelector('[data-zone-icon]'),zoneColor=root.querySelector('[data-zone-color]');
  const zoneSize=root.querySelector('[data-zone-size]'),zoneAlign=root.querySelector('[data-zone-align]');
  const testLinks=root.querySelector('[data-test-links]');
  const cleanPreview=root.querySelector('[data-clean-preview]');
  const localNote=root.querySelector('[data-local-note]');
  const branchPreview=['hubert-cartes-numeriques-evopme.dadou195.workers.dev','hubert-archetype-couleurs-evopme.dadou195.workers.dev'].includes(location.hostname);
  const previewHost=location.hostname.endsWith('.workers.dev')||['localhost','127.0.0.1'].includes(location.hostname);
  const draftKey='evopme.digital-card.test-draft.v1';
  let local=false;
  let theme='',zones=[], selected=-1, side='front', placing=false;
  const toggle=root.querySelector('[data-publish]'), save=form.querySelector('[type=submit]'), demo=root.querySelector('[data-demo]');
  const qr=root.querySelector('[data-qrcode]'), qrImage=root.querySelector('[data-qr-image]'), link=root.querySelector('[data-public-link]');
  let active='', published=false, busy=false, pending=0, revision=0, images={}, stableURL='', imageJobs={};
  const textKeys=['name','company','title','slug','phone','email','website','accent','background'];
  const blank={accent:'#fa7824',background:'#202328'};
  const hexFields=['accent','background'].map(key=>[field(key),form.querySelector('[data-hex-for="'+key+'"]')]);
  const syncHex=()=>hexFields.forEach(([picker,entry])=>{entry.value=picker.value;});
  for(const [picker,entry] of hexFields){
    picker.addEventListener('input',()=>{entry.value=picker.value;});
    entry.addEventListener('input',()=>{
      const value=entry.value.trim();
      if(/^#?[0-9a-f]{6}$/i.test(value)){
        picker.value='#'+value.replace(/^#/,'').toLowerCase();
        if(!value.startsWith('#')||value!==entry.value)entry.value=picker.value;
      }
    });
    entry.addEventListener('change',()=>{if(entry.validity.valid)entry.value=picker.value;});
  }
  const api='/api/cms/digital-cards';
  const show=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
  const setButtons=()=>{
    save.disabled=busy||pending>0;toggle.disabled=save.disabled;list.disabled=busy;demo.disabled=busy;
    toggle.hidden=local||!active;toggle.textContent=published?'Retirer du public':'Publier la carte';
  };
  const read=()=>({...Object.fromEntries(textKeys.map(k=>[k,field(k).value.trim()])),
    theme,format:field('format').value,corners:field('corners').value,hideHeading:field('hideHeading').checked,hideActions:field('hideActions').checked,blankFront:field('blankFront').checked,blankBack:field('blankBack').checked});
  const faceLabel=face=>face==='front'?'Recto':'Verso';
  const limit=(n,min,max)=>Math.min(max,Math.max(min,Math.round(n)));
  const currentZone=()=>zones[selected];
  const layerLabel=z=>(z.source&&field(z.source)?.value.trim())||z.label;
  const layerName=z=>({hotspot:'Lien invisible',text:'Texte',icon:'Icône',button:'Bouton'}[z.kind||'hotspot']);
  const zoneCaption=(z,i)=>faceLabel(z.face)+' · '+layerName(z)+' : '+(layerLabel(z)||'Élément '+(i+1));
  function drawZoneEditor(){
    const z=currentZone();
    zoneList.replaceChildren(new Option('Aucun élément sélectionné',''),...zones.map((zone,i)=>new Option(zoneCaption(zone,i),String(i))));
    zoneList.value=z?String(selected):'';
    zoneEditor.hidden=!z;
    zoneStatus.textContent=placing?'Clique à l’endroit voulu sur la carte pour placer la zone.':'';
    if(!z)return;
    const kind=z.kind||'hotspot',visible=kind!=='hotspot';
    zoneLabel.value=layerLabel(z);
    const destination=splitDestination(z.url);
    destinationType.value=destination.type;
    webPrefix=destination.type==='web'?destination.prefix:'https://';
    zoneURL.value=destination.value.trimStart();
    drawDestination();
    root.querySelector('[data-label-title]').textContent=kind==='text'?'Texte à afficher':kind==='button'?'Texte du bouton':'Libellé accessible';
    root.querySelector('[data-link-title]').textContent=['text','icon'].includes(kind)?'Lien de destination (facultatif)':'Lien de destination';
    root.querySelector('[data-icon-field]').hidden=kind!=='icon';
    root.querySelector('[data-full-field]').hidden=visible;
    for(const label of root.querySelectorAll('[data-style-field]'))label.hidden=!visible;
    zoneIcon.value=z.icon||'web';zoneColor.value=z.color||'#ffffff';
    zoneSize.value=z.size||16;zoneAlign.value=z.align||'center';
    zoneWidth.min=visible?8:hotspotMinSize;
    zoneHeight.min=visible?12:hotspotMinSize;
    zoneWidth.value=z.w;zoneHeight.value=z.h;
    zoneFull.checked=z.x===0&&z.y===0&&z.w===100&&z.h===100;
    zoneWidth.disabled=zoneHeight.disabled=zonePlace.disabled=zoneFull.checked;
  }
  function drawDestination(){
    const kind=destinationType.value;
    destinationPrefix.textContent=kind==='web'?webPrefix:destinationPrefixes[kind];
    zoneURL.placeholder={web:'exemple.ca',email:'nom@exemple.ca',phone:'450 555-0100'}[kind];
    zoneURL.inputMode={web:'url',email:'email',phone:'tel'}[kind];
  }
  function editZone(event){
    const z=currentZone();
    if(!z)return;
    if(event.target===zoneLabel){z.label=zoneLabel.value;delete z.source;}
    if(event.target===zoneURL||event.target===destinationType){
      const parsed=splitDestination(zoneURL.value);
      if(event.target===zoneURL&&parsed.explicit){
        destinationType.value=parsed.type;
        webPrefix=parsed.type==='web'?parsed.prefix:'https://';
        zoneURL.value=parsed.value;
      }
      const kind=destinationType.value, prefix=kind==='web'?webPrefix:destinationPrefixes[kind];
      const raw=zoneURL.value.trim();
      z.url=raw?(buildDestination(kind,raw,prefix)||prefix+' '+raw):'';
      drawDestination();
    }
    if(z.kind&&z.kind!=='hotspot'){
      z.icon=zoneIcon.value;z.color=zoneColor.value;z.size=limit(Number(zoneSize.value),8,38);z.align=zoneAlign.value;
    }
    if(!zoneFull.checked){
      const w=limit(Number(zoneWidth.value),Number(zoneWidth.min),100),h=limit(Number(zoneHeight.value),Number(zoneHeight.min),100);
      Object.assign(z,{w,h,x:Math.min(z.x,100-w),y:Math.min(z.y,100-h)});
    }
    if(zoneList.selectedOptions[0])zoneList.selectedOptions[0].textContent=zoneCaption(z,selected);
    draw();
  }
  const draw=()=>{
    const card={...read(),...images,zones};
    if(card.website&&!/^https?:\/\//i.test(card.website)) card.website='';
    stage.classList.toggle('dc__archetype',cleanPreview.checked);
    brand.hidden=!cleanPreview.checked;
    heading.hidden=card.hideHeading;
    heading.textContent=[card.name,card.title,card.company].filter(Boolean).join(' · ');
    renderCard(preview,card,{preview:!cleanPreview.checked,testLinks:testLinks.checked&&!placing,contact:!card.hideActions,side,editZones:true,
      onSide:face=>{side=face;},
      onPlace:placing?(x,y)=>{
        const z=currentZone();
        if(!z||!Number.isFinite(x)||!Number.isFinite(y))return;
        z.x=limit(x-z.w/2,0,100-z.w);z.y=limit(y-z.h/2,0,100-z.h);
        placing=false;drawZoneEditor();draw();zonePlace.focus();
      }:undefined});
  };
  let drag=null;
  preview.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('[data-drag-zone]');
    if(!handle||event.button!==0||!event.isPrimary)return;
    const i=Number(handle.dataset.dragZone), z=zones[i];
    const frame=handle.closest('.dc__turn')?.getBoundingClientRect();
    if(!z||!frame?.width||!frame.height)return;
    selected=i;drawZoneEditor();
    const resize=Boolean(event.target.closest('[data-resize-zone]'));
    drag={id:event.pointerId,handle,z,frame,resize,startX:event.clientX,startY:event.clientY,x:z.x,y:z.y,w:z.w,h:z.h};
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('dc__dragging');handle.focus({preventScroll:true});
  });
  preview.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const {handle,z,frame,resize,x,y,w,h,startX,startY}=drag;
    const dx=(event.clientX-startX)*100/frame.width,dy=(event.clientY-startY)*100/frame.height;
    if(resize){
      z.w=limit(w+dx,hotspotMinSize,100-z.x);
      z.h=limit(h+dy,hotspotMinSize,100-z.y);
      zoneWidth.value=z.w;zoneHeight.value=z.h;
      handle.style.width=z.w+'%';handle.style.height=z.h+'%';
    }else{
      z.x=limit(x+dx,0,100-z.w);
      z.y=limit(y+dy,0,100-z.h);
      handle.style.left=z.x+'%';handle.style.top=z.y+'%';
    }
  });
  function finishDrag(event){
    if(!drag||drag.id!==event.pointerId)return;
    const {handle,z,resize,x,y,w,h}=drag;
    drag=null;
    if(event.type==='pointercancel'){
      Object.assign(z,{x,y,w,h});
      Object.assign(handle.style,{left:x+'%',top:y+'%',width:w+'%',height:h+'%'});
      zoneWidth.value=w;zoneHeight.value=h;
    }
    handle.classList.remove('dc__dragging');
    if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
    zoneStatus.textContent=resize?'Dimensions : '+z.w+' % de large, '+z.h+' % de haut.':'Position : '+z.x+' % de la gauche, '+z.y+' % du haut.';
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])preview.addEventListener(type,finishDrag);
  preview.addEventListener('keydown',event=>{
    const handle=event.target.closest('[data-drag-zone]');
    if(!handle)return;
    const i=Number(handle.dataset.dragZone), z=zones[i];
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(!z||(!delta&&!['Enter',' '].includes(event.key)))return;
    event.preventDefault();selected=i;drawZoneEditor();
    if(!delta)return;
    const step=event.shiftKey?5:1;
    z.x=limit(z.x+delta[0]*step,0,100-z.w);
    z.y=limit(z.y+delta[1]*step,0,100-z.h);
    handle.style.left=z.x+'%';handle.style.top=z.y+'%';
    zoneStatus.textContent='Position : '+z.x+' % de la gauche, '+z.y+' % du haut.';
  });
  const makeQR=()=>{
    const publicOrigin=['evolutionpme.ca','www.evolutionpme.ca'].includes(location.hostname)?'https://evolutionpme.ca':location.origin;
    stableURL=active&&!local?new URL('/carte/'+active,publicOrigin).href:'';
    qr.hidden=!stableURL;
    qrImage.replaceChildren();
    if(!stableURL)return;
    link.href=stableURL;link.textContent=stableURL;
    root.querySelector('[data-qr-note]').textContent=location.hostname.endsWith('.workers.dev')?'Aperçu de test · ne pas imprimer ce QR.':published?'Lien public · aucun compte requis':'Brouillon · ce QR fonctionnera après publication.';
    try{new window.QRCode(qrImage,{text:stableURL,width:320,height:320,correctLevel:window.QRCode.CorrectLevel.M});}
    catch{qrImage.textContent='QR indisponible';}
  };
  const setCard=(card={},saved=false)=>{
    revision++;pending=0;imageJobs={};images={};drag=null;
    theme=Object.hasOwn(cardTemplates,card.theme)?card.theme:'';
    root.querySelector('[data-template-status]').textContent='';
    active=saved?card.slug:'';published=saved&&!!card.published;
    zones=(card.zones||[]).map(zone=>({...zone}));
    selected=-1;side='front';placing=false;testLinks.checked=false;cleanPreview.checked=false;
    field('hideHeading').checked=card.hideHeading===true;
    field('format').value=['landscape','portrait','square','image'].includes(card.format)?card.format:(saved?'landscape':'image');
    field('corners').value=card.corners==='square'?'square':'rounded';
    field('hideActions').checked=card.hideActions===true;
    for(const k of ['blankFront','blankBack'])field(k).checked=card[k]===true;
    for(const key of textKeys) field(key).value=card[key]||blank[key]||'';
    syncHex();
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
  form.addEventListener('input',event=>{
    if(event.target.type==='file')return;
    if(zones.some(z=>z.source===event.target.name))drawZoneEditor();
    draw();
  });
  const templateStatus=root.querySelector('[data-template-status]');
  for(const button of root.querySelectorAll('[data-template-key]'))button.addEventListener('click',()=>{
    const empty=['front','back'].filter(face=>!images[face]);
    if(!empty.length){templateStatus.textContent='Les deux faces ont déjà une image. Retire l’image de la face que tu veux refaire.';return;}
    if(zones.some(z=>empty.includes(z.face))&&!confirm('Remplacer les éléments des faces sans image par le modèle?'))return;
    const t=makeCardTemplate(button.dataset.templateKey,read());
    const next=[...zones.filter(z=>!empty.includes(z.face)),...t.zones.filter(z=>empty.includes(z.face))];
    if(next.length>24){templateStatus.textContent='Ce modèle dépasserait la limite de 24 éléments. Retire un élément ou choisis une autre carte.';return;}
    theme=t.theme;zones=next;
    field('accent').value=t.accent;field('background').value=t.background;syncHex();
    if(empty.length===2){field('hideHeading').checked=true;field('hideActions').checked=true;}
    for(const face of empty)field(face==='front'?'blankFront':'blankBack').checked=true;
    side=empty[0];selected=-1;placing=false;cleanPreview.checked=false;testLinks.checked=false;
    templateStatus.textContent=cardTemplates[theme].label+' appliqué. Glisse les éléments ou choisis-les pour les modifier.';
    drawZoneEditor();draw();
  });
  cleanPreview.addEventListener('change',()=>{placing=false;testLinks.checked=cleanPreview.checked;drawZoneEditor();draw();});
  testLinks.addEventListener('change',()=>{placing=false;drawZoneEditor();draw();});
  function addLayer(kind,face,options={}){
    if(zones.length>=24){show('Tu peux ajouter jusqu’à 24 éléments par carte.',true);return false;}
    const index=zones.filter(z=>z.face===face).length;
    const layout={hotspot:[36,22,''],text:[55,19,'Ton texte'],icon:[16,24,'Site web'],button:[44,22,'En savoir plus']};
    const [w,h,label]=layout[kind];
    const x=Math.round((100-w)/2),y=Math.min(100-h,20+(index%5)*12);
    zones.push({kind,face,label,url:'',x,y,w,h,icon:'web',color:kind==='button'?'#16110e':'#ffffff',size:16,align:'center',...options});
    selected=zones.length-1;side=face;placing=false;cleanPreview.checked=false;testLinks.checked=false;
    drawZoneEditor();draw();zoneLabel.focus();zoneLabel.select();return true;
  }
  for(const button of root.querySelectorAll('[data-zone-add]'))button.addEventListener('click',()=>addLayer('hotspot',button.dataset.zoneAdd));
  for(const button of root.querySelectorAll('[data-add-layer]'))button.addEventListener('click',()=>addLayer(button.dataset.addLayer,side));
  const quickType=root.querySelector('[data-quick-type]'),quickDisplay=root.querySelector('[data-quick-display]');
  const quickURL=root.querySelector('[data-quick-url]'),quickStatus=root.querySelector('[data-quick-status]');
  function addQuickLink(){
    const raw=quickURL.value.trim();
    const url=buildDestination('web',raw);
    if(!url||!/^https?:/.test(url)){quickStatus.textContent='Entre une adresse web complète commençant par https://.';quickURL.focus();return;}
    const icon=quickType.value;
    const label=quickType.selectedOptions[0].textContent;
    if(addLayer(quickDisplay.value,side,{label,url,icon})){
      quickStatus.textContent=label+' ajouté sur le '+faceLabel(side).toLowerCase()+'.';
      quickURL.value='';
    }
  }
  root.querySelector('[data-quick-add]').addEventListener('click',addQuickLink);
  quickURL.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addQuickLink();}});
  zoneList.addEventListener('change',()=>{
    selected=zoneList.value===''?-1:Number(zoneList.value);
    const z=currentZone();
    if(z)side=z.face;
    placing=false;drawZoneEditor();draw();
  });
  destinationType.addEventListener('change',editZone);
  for(const input of [zoneLabel,zoneURL,zoneWidth,zoneHeight,zoneIcon,zoneColor,zoneSize,zoneAlign])input.addEventListener('input',editZone);
  for(const input of [zoneWidth,zoneHeight,zoneSize])input.addEventListener('change',drawZoneEditor);
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
