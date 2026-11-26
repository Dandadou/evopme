import {renderCard} from './digital-card.js';
const name=document.querySelector('#card-name');
const company=document.querySelector('#card-company');
try{
  const match=/^\/carte\/([a-z0-9-]{1,64})\/?$/.exec(location.pathname);
  if(!match) throw new Error('invalid');
  const res=await fetch('/api/cartes/'+match[1],{cache:'no-store'});
  if(res.status===404) throw new Error('invalid');
  if(!res.ok) throw new Error('offline');
  const {card}=await res.json();
  if(!card?.published) throw new Error('invalid');
  name.textContent=card.name;
  company.textContent=[card.title,card.company].filter(Boolean).join(' · ');
  company.hidden=card.hideHeading||!company.textContent;
  name.classList.toggle('dc__sr-only',card.hideHeading===true);
  document.querySelector('.dc__kicker').hidden=card.hideHeading===true;
  document.title=card.name+' | Carte numérique';
  const root=document.querySelector('#public-card');
  renderCard(root,card,{contact:!card.hideActions});
  setupLandscape(root);
}catch(error){
  name.textContent=error.message==='invalid'?'Cette carte n’est pas disponible.':'Impossible de charger la carte.';
}

function setupLandscape(root){
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='dc__button dc__mobile-view-toggle';
  toggle.setAttribute('aria-controls','public-card');
  const setLandscape=enabled=>{
    document.body.dataset.mobileView=enabled?'landscape':'normal';
    toggle.textContent=enabled?'Vue normale':'Vue paysage';
  };
  toggle.addEventListener('click',()=>setLandscape(document.body.dataset.mobileView!=='landscape'));
  root.before(toggle);
  setLandscape(true);
}
