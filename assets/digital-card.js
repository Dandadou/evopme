import { cardTemplates } from './digital-card-templates.js';
import { cardLink, cardIcons } from './digital-card-links.js';
const el = (tag,className='',text='') => {
  const node=document.createElement(tag);
  node.className=className;
  node.textContent=text;
  return node;
};
const esc = value => String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,'\\$&');
const encoder=new TextEncoder();
function foldVcard(line) {
  let result='', size=0;
  for(const char of line){
    const bytes=encoder.encode(char).length;
    if(size+bytes>75){result+='\r\n ';size=1;}
    result+=char;size+=bytes;
  }
  return result;
}
export function toVcard(card){
  const names=card.name.trim().split(/\s+/);
  const given=names.shift()||'';
  return ['BEGIN:VCARD','VERSION:3.0','FN:'+esc(card.name),'N:'+esc(names.join(' '))+';'+esc(given)+';;;',
    card.company&&'ORG:'+esc(card.company),card.title&&'TITLE:'+esc(card.title),
    card.phone&&'TEL;TYPE=WORK,VOICE:'+esc(card.phone),card.email&&'EMAIL;TYPE=INTERNET,WORK:'+esc(card.email),
    card.website&&'URL:'+esc(card.website),'END:VCARD'].filter(Boolean).map(foldVcard).join('\r\n')+'\r\n';
}
function lightOrDark(hex){
  const rgb=(hex.match(/[0-9a-f]{2}/gi)||[]).map(n=>parseInt(n,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return (rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)>.179?'#000':'#fff';
}
function image(url,alt,className){
  const img=el('img',className);img.src=url;img.alt=alt;return img;
}
export function renderCard(root, card = {}, { contact = true, preview = false, testLinks = false, side = 'front', onSide, onPlace, editZones = false } = {}) {
  root.classList.add('dc');
  root.style.setProperty('--dc-accent',card.accent||'#fa7824');
  root.style.setProperty('--dc-accent-text',lightOrDark(card.accent||'#fa7824'));
  root.style.setProperty('--dc-ink',card.background||'#202328');
  root.style.setProperty('--dc-text',lightOrDark(card.background||'#202328'));
  const frame=el('div','dc__turn');
  frame.dataset.format=['portrait','square'].includes(card.format)?card.format:'landscape';
  frame.dataset.corners=card.corners==='square'?'square':'rounded';
  const button=el('button','dc__flip-button dc__button');
  button.type='button';
  const flip=el('div','dc__flip');
  const front=el('span','dc__face');
  const back=el('span','dc__face dc__face--back');back.setAttribute('aria-hidden','true');
  const fallbackFront=el('span','dc__fallback');
  fallbackFront.append(card.logo?image(card.logo,'','dc__logo'):el('span','dc__brand',card.company||'Carte professionnelle'));
  const title=el('span');title.append(el('strong','dc__name',card.name||'Nom de la cliente'),el('span','dc__small',card.title||''));
  fallbackFront.append(title);
  if(card.front||!card.blankFront)front.append(card.front?image(card.front,'Recto de la carte','dc__art'):fallbackFront);
  const fallbackBack=el('span','dc__fallback');
  fallbackBack.append(el('span','dc__brand',card.company||card.name||'Coordonnées'));
  const details=el('span');
  for(const value of [card.phone,card.email,card.website&&card.website.replace(/^https?:\/\//,'')]) if(value){
    const line=el('span','dc__small',value);line.style.display='block';details.append(line);
  }
  if(!details.childElementCount) details.append(el('span','dc__small','Téléphone, courriel ou site web'));
  fallbackBack.append(details);
  if(card.back||!card.blankBack)back.append(card.back?image(card.back,'Verso de la carte','dc__art'):fallbackBack);
  if(Object.hasOwn(cardTemplates,card.theme)){
    if(card.blankFront&&!card.front)front.dataset.template=card.theme;
    if(card.blankBack&&!card.back)back.dataset.template=card.theme;
  }
  const linkedFaces=new Set();
  for(const [face,faceNode] of [['front',front],['back',back]]){
    for(const [index,zone] of (card.zones||[]).entries()){
      if(zone.face!==face)continue;
      const url=cardLink(zone.url), kind=zone.kind||'hotspot', visible=kind!=='hotspot';
      const label=(['name','company','title'].includes(zone.source)&&card[zone.source])||zone.label;
      if(!preview&&!visible&&!url)continue;
      const editing=preview&&!testLinks, draggable=editing&&editZones&&!onPlace;
      const link=Boolean(url&&(!preview||testLinks)&&!onPlace);
      if(link)linkedFaces.add(face);
      const classes='dc__hotspot'+(visible?' dc__layer dc__layer--'+kind:'')+
        (editing&&!visible?' dc__hotspot--demo':'')+(link?' dc__hotspot--live':'');
      const zoneNode=el(draggable?'button':link?'a':'span',classes);
      zoneNode.style.left=zone.x+'%';zoneNode.style.top=zone.y+'%';
      zoneNode.style.width=zone.w+'%';zoneNode.style.height=zone.h+'%';
      if(visible){
        zoneNode.textContent=kind==='icon'?(Object.hasOwn(cardIcons,zone.icon)?cardIcons[zone.icon]:cardIcons.web):label;
        zoneNode.style.setProperty('--dc-layer-color',zone.color||'#ffffff');
        zoneNode.style.setProperty('--dc-layer-size',String((zone.size||16)/4)+'cqw');
        zoneNode.style.setProperty('--dc-layer-align',zone.align||'center');
        if(kind==='icon')zoneNode.setAttribute('aria-label',label);
      }else if(editing){
        zoneNode.textContent=label||String(index+1);
      }
      if(draggable){
        zoneNode.type='button';zoneNode.dataset.dragZone=String(index);
        zoneNode.setAttribute('aria-label','Déplacer : '+(label||'zone '+(index+1)));
        if(!visible&&(zone.w!==100||zone.h!==100)){
          const caption=el('span','dc__hotspot-caption',zoneNode.textContent);
          zoneNode.textContent='';
          const grip=el('span','dc__resize-grip');
          grip.dataset.resizeZone='';
          grip.setAttribute('aria-hidden','true');
          grip.title='Tirer pour redimensionner';
          zoneNode.append(caption,grip);
        }
      }else if(link){
        zoneNode.href=url;zoneNode.title=label;zoneNode.setAttribute('aria-label',label);
        if(preview&&/^https?:/.test(url)){zoneNode.target='_blank';zoneNode.rel='noopener noreferrer';}
      }else if(!visible)zoneNode.setAttribute('aria-hidden','true');
      faceNode.append(zoneNode);
    }
  }
  flip.append(front,back);
  for(const className of ['dc__edge dc__edge--left','dc__edge dc__edge--right']){
    const edge=el('span',className);edge.setAttribute('aria-hidden','true');flip.append(edge);
  }
  const hint=el('span','dc__hint');
  const linkHint=el('p','dc__link-hint','Touchez les liens directement sur la carte.');
  const setSide=isBack=>{
    flip.dataset.back=String(isBack);
    front.setAttribute('aria-hidden',String(isBack));front.inert=isBack;
    back.setAttribute('aria-hidden',String(!isBack));back.inert=!isBack;
    button.textContent=isBack?'Voir le recto':'Voir le verso';
    button.setAttribute('aria-label','Retourner la carte : voir le '+(isBack?'recto':'verso'));
    hint.textContent=isBack?'Verso':'Recto';
    linkHint.hidden=!linkedFaces.has(isBack?'back':'front');
  };
  const turn=()=>{
    const isBack=flip.dataset.back!=='true';
    setSide(isBack);
    onSide?.(isBack?'back':'front');
  };
  setSide(side==='back');
  button.addEventListener('click',turn);
  frame.addEventListener('click',event=>{
    if(event.target.closest('a,[data-drag-zone]'))return;
    if(onPlace){
      const bounds=frame.getBoundingClientRect();
      onPlace((event.clientX-bounds.left)*100/bounds.width,(event.clientY-bounds.top)*100/bounds.height);
    }else turn();
  });
  frame.append(flip);
  const controls=el('div','dc__flip-controls');
  controls.append(hint,button);
  root.replaceChildren(frame,controls,linkHint);
  if(!contact||!card.name) return;
  const actions=el('div','dc__actions');
  const download=el('button','dc__button dc__button--primary','Ajouter à mes contacts');
  download.type='button';download.addEventListener('click',()=>{
    const href=URL.createObjectURL(new Blob([toVcard(card)],{type:'text/vcard;charset=utf-8'}));
    const a=el('a');a.href=href;a.download=(card.slug||'contact')+'.vcf';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),30000);
  });
  actions.append(download);
  for(const [label, url] of [['Appeler',card.phone&&'tel:'+card.phone.replace(/[^+\d]/g,'')],['Écrire',card.email&&'mailto:'+encodeURIComponent(card.email)],['Voir le site',card.website]]){
    if(!url)continue;
    const a=el('a','dc__button',label);a.href=url;actions.append(a);
  }
  root.append(actions);
}
