// Contenu public et non sensible pour l'écran de vitrine.
const defaults={
 "vitrine.slide1.title":"VOS IDÉES. NOTRE CRÉATIVITÉ.",
 "vitrine.slide1.subtitle":"Évolution PME · Créateur de marques",
 "vitrine.slide1.image":"/assets/%C3%89tiquette%20EVOPME.png",
 "vitrine.slide1.enabled":"true",
 "vitrine.slide2.title":"DES VÊTEMENTS À VOTRE IMAGE.",
 "vitrine.slide2.subtitle":"T-shirts, cotons ouatés et vêtements corporatifs personnalisés",
 "vitrine.slide2.image":"",
 "vitrine.slide2.enabled":"true",
 "vitrine.slide3.title":"DES MARQUES QUI SE DÉMARQUENT.",
 "vitrine.slide3.subtitle":"Identité visuelle, graphisme et produits promotionnels",
 "vitrine.slide3.image":"",
 "vitrine.slide3.enabled":"true",
 "vitrine.slide4.title":"ATELIERS DE NOËL",
 "vitrine.slide4.subtitle":"Venez créer votre chandail de Noël! Inscription en ligne.",
 "vitrine.slide4.image":"",
 "vitrine.slide4.enabled":"true",
 "vitrine.settings.seconds":"9",
 "vitrine.settings.qr_url":"https://evolutionpme.ca/ateliers-noel.html",
 "vitrine.settings.qr_label":"Inscrivez-vous en ligne"
};
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
