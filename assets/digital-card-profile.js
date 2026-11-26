import {makeContactDownload} from './digital-card.js?v=20261126-vcard';
export const maxProfileLinks=6;
function cleanText(value,max){
  const text=value??'';
  if(typeof text!=='string'||text.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))throw new Error('Un champ de la fiche est trop long ou invalide.');
  return text.trim();
}
export function profileUrl(value){
  try{
    if(typeof value!=='string'||value.length>250)return '';
    const url=new URL(value);
    return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';
  }catch{return '';}
}
function cleanLink(label,url){
  label=cleanText(label,64);url=cleanText(url,250);
  if(!label&&!url)return null;
  if(!label||!profileUrl(url))throw new Error('Chaque lien de la fiche doit avoir un libellé et une adresse web complète.');
  return {label,url:profileUrl(url)};
}
export const maxProfileEvents=3;
const dayKey=new Intl.DateTimeFormat('fr-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'});
const readableDay=new Intl.DateTimeFormat('fr-CA',{timeZone:'UTC',dateStyle:'long'});
function cleanEventUrl(raw){
  try{
    const u=new URL(raw);
    return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1500?u.href:'';
  }catch{return '';}
}
function isEventDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.slice(0,4)<'1900')return false;
  const date=new Date(value+'T12:00:00Z');
  return !Number.isNaN(+date)&&date.toISOString().startsWith(value+'T');
}
export function cleanProfileEvents(raw=[]){
  if(!Array.isArray(raw)||raw.length>maxProfileEvents)throw new Error('La fiche peut avoir jusqu’à trois événements.');
  return raw.map(event=>{
    if(!event||typeof event!=='object'||Array.isArray(event))throw new Error('Événement invalide.');
    const title=cleanText(event.title,100),date=cleanText(event.date,10),place=cleanText(event.place,120),
      description=cleanText(event.description,240),url=cleanText(event.url,1500);
    if(!title&&!date&&!place&&!description&&!url)return null;
    const safeURL=cleanEventUrl(url);
    if(!title||!isEventDate(date)||!safeURL)throw new Error('Pour chaque événement, entre un titre, une date valide et un lien d’inscription HTTPS.');
    return {title,date,place,description,url:safeURL};
  }).filter(Boolean);
}
export function upcomingProfileEvents(raw,now=new Date()){
  const parts=Object.fromEntries(dayKey.formatToParts(now).map(({type,value})=>[type,value]));
  const today=parts.year+'-'+parts.month+'-'+parts.day;
  return (Array.isArray(raw)?raw:[]).filter(event=>event?.title&&isEventDate(event.date)&&event.date>=today&&cleanEventUrl(event.url))
    .sort((a,b)=>a.date.localeCompare(b.date));
}
export function cleanProfile(raw) {
  if(raw===undefined)return {about:'',address:'',primary:null,links:[]};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Fiche client invalide.');
  if(raw.links!==undefined&&(!Array.isArray(raw.links)||raw.links.length>maxProfileLinks))throw new Error('La fiche peut avoir jusqu’à six liens.');
  const events=cleanProfileEvents(raw.events);
  return {...(events.length?{events}:{}),about:cleanText(raw.about,420),address:cleanText(raw.address,220),
    primary:cleanLink(raw.primary?.label,raw.primary?.url),
    links:(raw.links||[]).map(link=>cleanLink(link?.label,link?.url)).filter(Boolean)};
}
function node(tag,className,value=''){
  const el=document.createElement(tag);el.className=className;el.textContent=value;return el;
}
function profileLink(label,href,kind=''){
  const a=node('a','dc__profile-link'+(kind?' dc__profile-link--'+kind:''),label);
  a.href=href;
  if(/^https?:/.test(href)){a.target='_blank';a.rel='noopener noreferrer';}
  return a;
}
export function renderProfile(root,card,{linksActive=true}={}){
  const data=card.profile||{};
  const panel=node('section','dc__profile');
  panel.setAttribute('aria-label','Fiche professionnelle');
  const hero=node('div','dc__profile-hero');
  if(card.logo){
    const logo=node('img','dc__profile-logo');logo.src=card.logo;logo.alt='';hero.append(logo);
  }
  const identity=node('div','dc__profile-identity');
  identity.append(node('p','dc__profile-label','Fiche professionnelle'),node('h2','dc__profile-name',card.company||card.name));
  const personal=card.company&&card.company!==card.name?card.name:'';
  const subtitle=[personal,card.title].filter(Boolean).join(' · ');
  if(subtitle)identity.append(node('p','dc__profile-subtitle',subtitle));
  hero.append(identity);
  panel.append(hero);
  if(data.about)panel.append(node('p','dc__profile-about',data.about));
  const main=profileUrl(data.primary?.url);
  if(main&&data.primary?.label)panel.append(profileLink(data.primary.label,main,'primary'));
  const phone=(card.phone||'').replace(/[^+\d]/g,'');
  const site=profileUrl(card.website);
  const contacts=card.hideActions?[]:[
    ['Téléphone',card.phone,phone?'tel:'+phone:''],
    ['Courriel',card.email,card.email?'mailto:'+encodeURIComponent(card.email):''],
    ['Site web',site?new URL(site).hostname.replace(/^www\./,''):'',site]
  ].filter(([,label,href])=>label&&href);
  if(contacts.length||data.address){
    const block=node('div','dc__profile-address');
    block.append(node('h3','dc__profile-label','Coordonnées'));
    const list=node('dl','dc__profile-contacts');
    for(const [label,value,href] of contacts){
      const row=node('div','dc__profile-contact-row'), detail=node('dd','');
      detail.append(profileLink(value,href,'contact'));
      row.append(node('dt','',label),detail);list.append(row);
    }
    if(data.address){
      const row=node('div','dc__profile-contact-row'), detail=node('dd','');
      detail.append(node('span','dc__profile-street',data.address),
        profileLink('Itinéraire','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(data.address),'directions'));
      row.append(node('dt','','Adresse'),detail);list.append(row);
    }
    block.append(list);panel.append(block);
  }
  const selected=(data.links||[]).filter(link=>link.label&&profileUrl(link.url));
  if(selected.length){
    const more=node('div','dc__profile-more');
    more.append(node('h3','dc__profile-label','Liens utiles'));
    const list=node('div','dc__profile-grid');
    for(const link of selected)list.append(profileLink(link.label,profileUrl(link.url)));
    more.append(list);panel.append(more);
  }
  const events=upcomingProfileEvents(data.events);
  if(events.length){
    const section=node('section','dc__profile-events');
    section.append(node('h3','dc__profile-label','Événements à venir'));
    for(const event of events){
      const article=node('article','dc__profile-event');
      const time=node('time','dc__profile-event-date',readableDay.format(new Date(event.date+'T12:00:00Z')));
      time.dateTime=event.date;
      article.append(time,node('h4','dc__profile-event-title',event.title));
      if(event.place)article.append(node('p','dc__profile-event-detail',event.place));
      if(event.description)article.append(node('p','dc__profile-event-detail',event.description));
      const cta=profileLink('M’inscrire',cleanEventUrl(event.url),'event');
      cta.setAttribute('aria-label','M’inscrire : '+event.title);
      article.append(cta);section.append(article);
    }
    panel.append(section);
  }
  if(!linksActive) for(const a of panel.querySelectorAll('a')){a.removeAttribute('href');a.setAttribute('aria-disabled','true');}
  if(card.name){
    const dataForContact=card.hideActions?{...card,phone:'',email:'',website:''}:card;
    const download=makeContactDownload(dataForContact,'dc__button dc__profile-save');
    download.disabled=!linksActive;
    panel.append(download);
  }
  root.append(panel);
}
