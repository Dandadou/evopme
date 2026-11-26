export function cardLink(value){
  if(typeof value!=='string'||value.length>250||/[\x00-\x20\x7f]/.test(value))return '';
  if(/^tel:\+?[\d().-]{5,40}$/i.test(value))return 'tel:'+value.slice(4).replace(/[^+\d]/g,'');
  if(/^mailto:[a-z0-9._+%-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value))return 'mailto:'+value.slice(7);
  try{
    const url=new URL(value);
    return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';
  }catch{return '';}
}
export const destinationPrefixes=Object.freeze({email:'mailto:',phone:'tel:',web:'https://'});
export function splitDestination(value=''){
  const raw=String(value).trim();
  const lead=/^(mailto:|tel:|https?:\/\/)/i.exec(raw)?.[0];
  const prefix=lead?.toLowerCase()||'';
  return {type:prefix==='mailto:'?'email':prefix==='tel:'?'phone':'web',prefix:prefix||'https://',value:lead?raw.slice(lead.length):raw,explicit:Boolean(lead)};
}
export function buildDestination(type,value,prefix){
  if(!Object.hasOwn(destinationPrefixes,type)||typeof value!=='string'||!value.trim())return '';
  const raw=value.trim();
  const parsed=splitDestination(raw);
  if(parsed.explicit&&parsed.type!==type)return '';
  if(type==='phone'){
    const phone=parsed.value;
    if(!/^\+?[0-9(). -]+$/.test(phone))return '';
    const digits=phone.replace(/[^+0-9]/g,'');
    return /^\+?\d{5,15}$/.test(digits)?'tel:'+digits:'';
  }
  if(type==='email')return cardLink('mailto:'+parsed.value);
  if(!parsed.explicit&&/^[a-z][a-z\d+.-]*:/i.test(raw)&&!/^[^\s/:]+\.[^\s/:]+:\d+(?:[/?#]|$)/.test(raw))return '';
  return cardLink((parsed.explicit?parsed.prefix:prefix==='http://'?'http://':'https://')+parsed.value);
}
export const cardIcons=Object.freeze({phone:'☎',email:'✉',web:'↗',location:'⌖',calendar:'▦',star:'★',facebook:'f',linkedin:'in',instagram:'◎'});
export const hotspotMinSize=3;
export function cleanCardLinks(value=[]){
  if(!Array.isArray(value)||value.length>24)throw new Error('Maximum 24 éléments par carte.');
  return value.map(zone=>{
    const {face,label,x,y,w,h,kind='hotspot',icon='web',color='#ffffff',size=16,align='center',source}=zone||{};
    const url=cardLink(zone?.url);
    if(!['hotspot','text','icon','button'].includes(kind)||!['front','back'].includes(face)||
       typeof label!=='string'||!label.trim()||label.length>80||/[\x00-\x1f\x7f]/.test(label)||
       (['hotspot','button'].includes(kind)&&!url)||(zone?.url&&!url))
      throw new Error('Chaque élément doit avoir un libellé; les boutons et liens invisibles exigent un lien valide.');
    if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<(kind==='hotspot'?hotspotMinSize:8)||h<(kind==='hotspot'?hotspotMinSize:12)||x+w>100||y+h>100)
      throw new Error('Un élément dépasse les limites de la carte.');
    const result={face,label:label.trim(),url,x,y,w,h};
    if(kind==='hotspot')return result;
    if(!/^#[a-f0-9]{6}$/i.test(color)||!Number.isInteger(size)||size<8||size>38||
       !['left','center','right'].includes(align)||(kind==='icon'&&!Object.hasOwn(cardIcons,icon))||
       (source!==undefined&&(kind!=='text'||!['name','company','title'].includes(source))))
      throw new Error('Style d’élément invalide.');
    return {...result,kind,color,size,align,...(kind==='icon'?{icon}:{}),...(source?{source}:{})};
  });
}
