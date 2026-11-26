import {applyPageAppearance,renderProfile} from './digital-card-profile.js?v=20261126-page-color';
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
  applyPageAppearance(document.body,card.pageBackground);
  name.textContent=card.name;
  company.textContent=[card.title,card.company].filter(Boolean).join(' · ');
  company.hidden=card.hideHeading||!company.textContent;
  name.classList.toggle('dc__sr-only',card.hideHeading===true);
  document.querySelector('.dc__kicker').hidden=card.hideHeading===true;
  document.title=card.name+' | Carte numérique';
  const root=document.querySelector('#public-card');
  renderCard(root,card,{contact:false});
  renderProfile(root,card);
}catch(error){
  name.textContent=error.message==='invalid'?'Cette carte n’est pas disponible.':'Impossible de charger la carte.';
}
