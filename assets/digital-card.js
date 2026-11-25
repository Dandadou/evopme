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
export function renderCard(root, card = {}, { contact = true } = {}) {
  root.classList.add('dc');
  root.style.setProperty('--dc-accent',card.accent||'#fa7824');
  root.style.setProperty('--dc-accent-text',lightOrDark(card.accent||'#fa7824'));
  root.style.setProperty('--dc-ink',card.background||'#202328');
  root.style.setProperty('--dc-text',lightOrDark(card.background||'#202328'));
  const button=el('button','dc__turn');
  button.type='button';button.setAttribute('aria-label','Retourner la carte : afficher le verso');
  const flip=el('span','dc__flip');flip.dataset.back='false';
  const front=el('span','dc__face');
  const back=el('span','dc__face dc__face--back');back.setAttribute('aria-hidden','true');
  const fallbackFront=el('span','dc__fallback');
  fallbackFront.append(card.logo?image(card.logo,'','dc__logo'):el('span','dc__brand',card.company||'Carte professionnelle'));
  const title=el('span');title.append(el('strong','dc__name',card.name||'Nom de la cliente'),el('span','dc__small',card.title||''));
  fallbackFront.append(title);
  front.append(card.front?image(card.front,'Recto de la carte','dc__art'):fallbackFront);
  const fallbackBack=el('span','dc__fallback');
  fallbackBack.append(el('span','dc__brand',card.company||card.name||'Coordonnées'));
  const details=el('span');
  for(const value of [card.phone,card.email,card.website&&card.website.replace(/^https?:\/\//,'')]) if(value){
    const line=el('span','dc__small',value);line.style.display='block';details.append(line);
  }
  if(!details.childElementCount) details.append(el('span','dc__small','Téléphone, courriel ou site web'));
  fallbackBack.append(details);
  back.append(card.back?image(card.back,'Verso de la carte','dc__art'):fallbackBack);
  flip.append(front,back);
  const hint=el('span','dc__hint','Recto · Clique ou touche la carte pour la retourner');
  button.append(flip,hint);
  button.addEventListener('click',()=>{
    const isBack=flip.dataset.back!=='true';
    flip.dataset.back=String(isBack);
    front.setAttribute('aria-hidden',String(isBack));back.setAttribute('aria-hidden',String(!isBack));
    button.setAttribute('aria-label','Retourner la carte : afficher le '+(isBack?'recto':'verso'));
    hint.textContent=(isBack?'Verso':'Recto')+' · Clique ou touche la carte pour la retourner';
  });
  root.replaceChildren(button);
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
