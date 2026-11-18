/** Archétype — image concept generation through bound Cloudflare Workers AI.
 * No storage, no logs of questionnaire or generated image.
 */
import { validateQuestionnaire } from "../logo.js";
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const familyPrompts={
 illustration:"Single bespoke abstract symbolic illustration; NO mascot unless the business explicitly requests one. Distinctive silhouette and purposeful negative space.",
 typographie:"Single typographic-inspired abstract glyph; no readable lettering because exact brand name will be typeset separately.",
 monogramme:"Single custom abstract monogram inspired by the brand initials; minimal, legible silhouette; no random letters or generic S.",
 mixte:"One cohesive symbol combining a meaningful illustration and an abstract letterform; not two disconnected stock icons."
};
const meaningfulKeys=["fierte","refus","ressenti","defi","dix-ans","soiree"];
const compact=(s,n=160)=>String(s||"").replace(/\\s+/g," ").trim().slice(0,n);
const creativeBrief=(q,family,concept,revision)=>{
 const statements=meaningfulKeys.map(k=>compact(q.reponses?.[k],170)).filter(Boolean);
 const sector=compact(q.secteurAutre||q.secteur,80);
 const name=compact(q.entreprise,80);
 const initials=name.split(/\\s+/).filter(x=>x.length>2).slice(0,3).map(x=>x[0]?.toUpperCase()).join("");
 const audience=compact(q.clientele,50);
 const chosen=statements.slice(0,4).join(" | ");
 return [
 "TASK: DESIGN ONE PROFESSIONAL LOGO SYMBOL, NOT AN ILLUSTRATION OR POSTER.",
 "BUSINESS NAME (context only; never render text): "+name,
 "INDUSTRY: "+sector+". TARGET AUDIENCE: "+audience+".",
 "DECLARED BRAND IDENTITY: "+(chosen||"No specific values supplied; use a restrained, neutral visual direction."),
 "ART DIRECTION: "+familyPrompts[family],
 family==="monogramme"?"Only initials to inspire the emblem: "+initials+". Never invent other initials.":"",
 "STYLE PREFERENCES: "+compact(q.style,60)+". "+compact(q.directionStyle,40),
 "CONCEPT GUIDANCE: "+compact(concept,220),
 revision?"CLIENT-REQUESTED VARIATION: "+compact(revision,300):"",
 "STRICT RELEVANCE: Every depicted element must be meaningful for this specific business. No unrelated animals, cats, flowers, medical crosses, hearts, leaves or wellness clichés unless directly supported by the declared brand identity. The questionnaire's favourite animal is NOT a mascot request.",
 "VISUAL EXECUTION: one flat vector-style mark, 2-3 solid colours, sharp contours, simple geometry, high contrast, centred on clean plain background, legible at favicon and embroidery size.",
 "NO TEXT OR WORDS, no fake brand names, no stock imagery, no photo, no 3D, no gradients, no bevels, no watermarks, no product mockup."
 ].filter(Boolean).join("\\n").slice(0,2048);
};
const limiter=new Map();
export async function onRequestPost({request,env}){
 if(!env?.AI?.run)return json({ok:false,error:"Workers AI n'est pas configuré sur ce déploiement."},503);
 const ip=request.headers.get("cf-connecting-ip")||"unknown",now=Date.now();
 const history=(limiter.get(ip)||[]).filter(x=>now-x.time<3600000);
 const successes=history.filter(x=>x.success).length;
 const failures=history.filter(x=>!x.success).length;
 if(successes>=8)return json({ok:false,error:"Huit images générées cette heure. Réessaie plus tard."},429);
 if(failures>=24)return json({ok:false,error:"Trop de tentatives échouées cette heure. Réessaie plus tard."},429);
 let data;
 try{const raw=await request.text();if(raw.length>24000)return json({ok:false,error:"Requête trop volumineuse."},413);data=JSON.parse(raw)}
 catch{return json({ok:false,error:"Requête invalide."},400)}
 const v=validateQuestionnaire(data?.questionnaire);
 if(!v.ok)return json({ok:false,error:"Questionnaire invalide.",details:v.errors},400);
 const family=data?.famille;
 if(!Object.hasOwn(familyPrompts,family))return json({ok:false,error:"Famille de création invalide."},400);
 // Les échecs techniques ne consomment pas le quota des huit images réussies.
 const q=v.data;
 const concept=typeof data?.concept==="string"?data.concept.slice(0,400):"";
 const revision=typeof data?.revision==="string"?data.revision.trim().slice(0,500):"";
 const prompt=creativeBrief(q,family,concept,revision);
 const model=env.ARCHETYPE_IMAGE_MODEL||"@cf/black-forest-labs/flux-1-schnell";
 try{
  const output=await env.AI.run(model,{prompt:prompt.slice(0,2048),steps:4});
  const encoded=typeof output?.image==="string"?output.image:typeof output?.result?.image==="string"?output.result.image:null;
  if(encoded){history.push({time:now,success:true});limiter.set(ip,history);return json({ok:true,image:"data:image/jpeg;base64,"+encoded,model});}
  if(output instanceof ArrayBuffer){
   const bytes=new Uint8Array(output);let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   history.push({time:now,success:true});limiter.set(ip,history);
   return json({ok:true,image:"data:image/jpeg;base64,"+btoa(binary),model});
  }
  return json({ok:false,error:"Le modèle image n'a pas retourné de fichier compatible."},502);
 }catch(err){
  history.push({time:now,success:false});limiter.set(ip,history);
  const raw=String(err?.message||"").slice(0,260);
  const code=String(err?.code||err?.cause?.code||"").slice(0,50);
  const safe=raw.replace(/https?:\/\/\S+/g,"[url]").replace(/(?:sk-|Bearer\\s+)\S+/gi,"[secret]").replace(/[<>]/g,"");
  return json({ok:false,error:"Workers AI a refusé la génération.",detail:safe||"Erreur non précisée",code,model},503);
 }
}
