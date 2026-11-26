import { cardLink } from './digital-card-links.js';

export const cardTemplates=Object.freeze({
  minimal:{label:'Minimal clair',accent:'#17404b',background:'#f3f3ed',ink:'#152d35',muted:'#36535d',button:'#ffffff',align:'left'},
  graphite:{label:'Graphite',accent:'#66e3ed',background:'#111d29',ink:'#f4fbff',muted:'#c3d6e4',button:'#122832',align:'left'},
  signature:{label:'Signature',accent:'#dcb480',background:'#221926',ink:'#fff4eb',muted:'#f0ceaf',button:'#251828',align:'center'},
});
export function makeCardTemplate(key,card={}){
  if(!Object.hasOwn(cardTemplates,key))return null;
  const t=cardTemplates[key];
  const text=(face,label,x,y,w,h,color=t.ink,size=16,source)=>({face,kind:'text',label:label.slice(0,80),url:'',x,y,w,h,color,size,align:t.align,...(source?{source}:{})});
  const action=(label,url,y)=>({face:'back',kind:'button',label,url,x:t.align==='center'?22:10,y,w:56,h:17,color:t.button,size:13,align:'center'});
  const front=[
    text('front',card.company||'Ton entreprise',10,20,76,13,t.muted,13,'company'),
    text('front',card.name||'Ton nom',10,36,80,25,t.ink,23,'name'),
    text('front',card.title||'Ta fonction',10,63,80,14,t.muted,13,'title'),
  ];
  const phone=card.phone&&cardLink('tel:'+card.phone.replace(/[^+0-9]/g,''));
  const email=card.email&&cardLink('mailto:'+card.email);
  const website=cardLink(card.website);
  const contacts=[['Appeler',phone],['Écrire',email],['Visiter le site',website]].filter(([,url])=>url);
  const back=[text('back','Coordonnées',10,16,80,20,t.ink,18)];
  for(const [i,[label,url]] of contacts.entries())back.push(action(label,url,37+i*19));
  if(!contacts.length){
    back.push(text('back','Ajoute tes coordonnées ou un bouton',10,42,80,28,t.muted,13));
  }
  return {theme:key,accent:t.accent,background:t.background,zones:[...front,...back]};
}
