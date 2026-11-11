// Contenu public et non sensible pour l'écran de vitrine.
const defaults={
 "vitrine.slide1.title":"VOS IDÉES. NOS SOLUTIONS. VOTRE ÉVOLUTION.",
 "vitrine.slide1.subtitle":"Nous transformons vos idées en marques fortes et en solutions concrètes.",
 "vitrine.slide1.image":"/assets/%C3%89tiquette%20EVOPME.png",
 "vitrine.slide1.enabled":"true",
 "vitrine.slide1.fullscreen":"false",
 "vitrine.slide1.qr_enabled":"false",
 "vitrine.slide1.qr_url":"",
 "vitrine.slide1.qr_label":"",
 "vitrine.slide2.title":"DES VÊTEMENTS À VOTRE IMAGE.",
 "vitrine.slide2.subtitle":"T-shirts, cotons ouatés et vêtements corporatifs personnalisés",
 "vitrine.slide2.image":"",
 "vitrine.slide2.enabled":"true",
 "vitrine.slide2.fullscreen":"true",
 "vitrine.slide2.qr_enabled":"false",
 "vitrine.slide2.qr_url":"",
 "vitrine.slide2.qr_label":"",
 "vitrine.slide3.title":"DES MARQUES QUI SE DÉMARQUENT.",
 "vitrine.slide3.subtitle":"Identité visuelle, graphisme et produits promotionnels",
 "vitrine.slide3.image":"",
 "vitrine.slide3.enabled":"true",
 "vitrine.slide3.fullscreen":"true",
 "vitrine.slide3.qr_enabled":"false",
 "vitrine.slide3.qr_url":"",
 "vitrine.slide3.qr_label":"",
 "vitrine.slide4.title":"ATELIERS DE NOËL",
 "vitrine.slide4.subtitle":"Venez créer votre chandail de Noël! Inscription en ligne.",
 "vitrine.slide4.image":"",
 "vitrine.slide4.enabled":"true",
 "vitrine.slide4.fullscreen":"true",
 "vitrine.slide4.qr_enabled":"true",
 "vitrine.slide4.qr_url":"https://evolutionpme.ca/ateliers-noel.html",
 "vitrine.slide4.qr_label":"Inscrivez-vous en ligne",
 "vitrine.settings.seconds":"9",
 "vitrine.settings.qr_url":"https://evolutionpme.ca/ateliers-noel.html",
 "vitrine.settings.qr_label":"Inscrivez-vous en ligne"
};
// Nouvelle vitrine : six scènes indépendantes gérées depuis le CMS.
for(let i=1;i<=6;i++){
 const p='vitrine.page'+i+'.';
 Object.assign(defaults,{[p+'eyebrow']:'',[p+'title']:'',[p+'accent']:'',[p+'description']:'',[p+'tags']:'',[p+'enabled']:'true',[p+'qr_enabled']:i===6?'true':'false',[p+'qr_url']:i===6?'https://evolutionpme.ca/ateliers-noel.html':'',[p+'qr_label']:i===6?'Inscription aux ateliers':'Scannez pour en savoir plus'});
}
defaults['vitrine.settings.seconds_v2']='11';
export async function onRequestGet({env}){
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=25","access-control-allow-origin":"*"};
 if(!env.CMS_DB)return new Response(JSON.stringify({content:defaults}),{headers});
 try{
  const rows=await env.CMS_DB.prepare("SELECT key,value FROM cms_content WHERE key LIKE 'vitrine.%'").all();
  const data={...defaults};
  for(const row of rows.results||[])if(Object.hasOwn(defaults,row.key))data[row.key]=row.value;
  return new Response(JSON.stringify({content:data}),{headers});
 }catch(e){return new Response(JSON.stringify({content:defaults}),{headers});}
}
