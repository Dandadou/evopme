export function cardLink(value){
  if(typeof value!=='string'||value.length>250||/[\x00-\x20\x7f]/.test(value))return '';
  if(/^tel:\+?[\d().-]{5,40}$/i.test(value))return 'tel:'+value.slice(4).replace(/[^+\d]/g,'');
  if(/^mailto:[a-z0-9._+%-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value))return 'mailto:'+value.slice(7);
  try{
    const url=new URL(value);
    return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';
  }catch{return '';}
}
export function cleanCardLinks(value=[]){
  if(!Array.isArray(value)||value.length>12)throw new Error('Maximum 12 zones cliquables par carte.');
  return value.map(zone=>{
    const {face,label,x,y,w,h}=zone||{};
    const url=cardLink(zone?.url);
    if(!['front','back'].includes(face)||typeof label!=='string'||!label.trim()||label.length>80||/[\x00-\x1f\x7f]/.test(label)||!url)
      throw new Error('Chaque zone doit avoir un côté, un libellé et un lien valide.');
    if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<8||h<12||x+w>100||y+h>100)
      throw new Error('Une zone cliquable dépasse les limites de la carte.');
    return {face,label:label.trim(),url,x,y,w,h};
  });
}
