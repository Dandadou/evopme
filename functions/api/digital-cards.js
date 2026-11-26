import { cleanProfile } from '../../assets/digital-card-profile.js';
import { cardTemplates } from '../../assets/digital-card-templates.js';
import { cleanCardLinks } from '../../assets/digital-card-links.js';
const MAX_BODY = 1_100_000;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLORS = /^#[0-9a-f]{6}$/i;
const IMAGE = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/;
const fields = { name: 100, company: 100, title: 100, phone: 40, email: 160, website: 250 };
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{
  'content-type':'application/json; charset=utf-8', 'cache-control':'no-store',
  'x-content-type-options':'nosniff', 'x-robots-tag':'noindex, nofollow'
}});
export const validSlug = value => typeof value === 'string' && value.length <= 64 && SLUG.test(value);
export function cleanCard(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Carte invalide.');
  if (!validSlug(body.slug)) throw new Error('Utilise un identifiant de 64 caractères maximum : lettres minuscules, chiffres et tirets.');
  if (typeof body.published !== 'boolean') throw new Error('Choisis le statut de la carte.');
  const card = {slug:body.slug, published:body.published};
  for (const [key, max] of Object.entries(fields)) {
    const raw = body[key] ?? '';
    if (typeof raw !== 'string' || /[\x00-\x1f\x7f]/.test(raw) || raw.length>max) throw new Error('Une coordonnée est trop longue ou invalide.');
    card[key] = raw.trim();
  }
  if (!card.name) throw new Error('Entre le nom à afficher.');
  if (card.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(card.email)) throw new Error('Adresse courriel invalide.');
  if (card.phone && !/^\+?[\d(). -]{5,40}$/.test(card.phone)) throw new Error('Numéro de téléphone invalide.');
  if (card.website) {
    let url; try { url = new URL(card.website); } catch { throw new Error('Entre un lien web complet.'); }
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('Entre un lien web HTTP ou HTTPS.');
    card.website = url.href;
  }
  for (const key of ['accent','background']) {
    if (!COLORS.test(body[key])) throw new Error('Couleur invalide.');
    card[key] = body[key];
  }
  for (const key of ['front','back','logo']) {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.length > (key==='logo' ? 130_000 : 455_000)) throw new Error('Une image dépasse la taille permise.');
    if (value) {
      const match = IMAGE.exec(value);
      if (!match) throw new Error('Format d’image non accepté.');
      let bytes; try { bytes = atob(match[2]); } catch { throw new Error('Image invalide.'); }
      const valid = match[1]==='webp' ? bytes.startsWith('RIFF') && bytes.slice(8,12)==='WEBP'
        : match[1]==='png' ? bytes.startsWith('\x89PNG\r\n\x1a\n')
        : bytes.startsWith('\xff\xd8\xff');
      if (!valid) throw new Error('Image invalide.');
    }
    card[key] = value;
  }
  for(const key of ['hideHeading','hideActions','blankFront','blankBack']) {
    if(body[key]!==undefined&&typeof body[key]!=='boolean')throw new Error('Option d’affichage invalide.');
    card[key]=body[key]===true;
  }
  if(body.theme!==undefined&&body.theme!==''&&!Object.hasOwn(cardTemplates,body.theme))throw new Error('Modèle inconnu.');
  card.theme=body.theme||'';
  for(const [key,options] of [['format',['landscape','portrait','square','image']],['corners',['rounded','square']]]){
    const value=body[key]??options[0];
    if(!options.includes(value))throw new Error('Format ou coins de carte invalides.');
    card[key]=value;
  }
  card.zones = cleanCardLinks(body.zones);
  card.profile = cleanProfile(body.profile);
  return card;
}
async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Carte manquante.');
  const decoder = new TextDecoder();
  let size=0, data='';
  for (;;) {
    const {done,value}=await reader.read();
    if (done) break;
    size+=value.byteLength;
    if (size>MAX_BODY) { await reader.cancel(); throw new Error('Carte trop volumineuse.'); }
    data+=decoder.decode(value,{stream:true});
  }
  try { return JSON.parse(data+decoder.decode()); } catch { throw new Error('JSON invalide.'); }
}
const record = row => {
  const card={...JSON.parse(row.payload),slug:row.slug,published:!!row.published};
  // Seed only the owner's existing, verified public card. Saved values take
  // precedence; nothing is written on a read.
  if(!Object.hasOwn(card,'profile')&&card.slug==='evolution-pme'&&
      card.name==='Daniel Drapeau'&&card.company==='Évolution PME Créateur de marques'){
    card.profile=cleanProfile({
      about:'Vêtements corporatifs et produits promotionnels personnalisés pour les petites équipes.',
      address:'5, rue Industrielle\nSaint-Roch-de-l’Achigan (Québec) J0K 3H0',
      primary:{label:'Demander une soumission',url:'https://evolutionpme.ca/soumission'},
      links:[{label:'Voir les catalogues',url:'https://evolutionpme.ca/catalogues'}]});
  }
  return card;
};
const missingCardsTable = error => /no such table:\s*(?:main\.)?digital_business_cards\b/i.test(String(error?.message||error));
const storageError = () => json({error:'Les cartes sont temporairement indisponibles.'},503);
const listSQL='SELECT slug,name,company,published FROM digital_business_cards WHERE organization_id=? ORDER BY updated_at DESC, slug';
async function listCards(db,org){
  try {
    return await db.prepare(listSQL).bind(org).all();
  } catch(error){
    if(!missingCardsTable(error))throw error;
    // Only reached from the existing authenticated CMS route when its list is opened.
    await db.prepare(`CREATE TABLE IF NOT EXISTS digital_business_cards (
      slug TEXT PRIMARY KEY NOT NULL,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      payload TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).bind().run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_digital_business_cards_org ON digital_business_cards(organization_id,updated_at DESC)').bind().run();
    return await db.prepare(listSQL).bind(org).all();
  }
}

export async function handleDigitalCardsAdmin(request, env, org) {
  const db = env.CMS_DB;
  const slug = new URL(request.url).searchParams.get('slug');
  try {
    if (request.method === 'GET') {
      if (slug !== null) {
        if (!validSlug(slug)) return json({error:'Carte introuvable.'},404);
        const row=await db.prepare('SELECT slug,payload,published FROM digital_business_cards WHERE slug=? AND organization_id=?').bind(slug,org).first();
        return row ? json({card:record(row)}) : json({error:'Carte introuvable.'},404);
      }
      const {results=[]}=await listCards(db,org);
      return json({cards:results});
    }
    if (!['POST','PUT'].includes(request.method)) return json({error:'Méthode non permise.'},405);
    const origin=request.headers.get('origin');
    if (origin && origin!==new URL(request.url).origin) return json({error:'Origine non autorisée.'},403);
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||'')) return json({error:'Format non accepté.'},415);
    let card;
    try { card=cleanCard(await readBody(request)); } catch(error) { return json({error:error.message},400); }
    const {slug:key,published,...payload}=card;
    const data=JSON.stringify(payload);
    if (request.method==='POST') {
      if (published) return json({error:'Enregistre d’abord la carte comme brouillon.'},400);
      const result=await db.prepare('INSERT INTO digital_business_cards (slug,organization_id,name,company,payload,published) VALUES (?,?,?,?,?,?) ON CONFLICT(slug) DO NOTHING')
        .bind(key,org,card.name,card.company,data,+published).run();
      return result.meta?.changes ? json({card},201) : json({error:'Ce lien est déjà utilisé. Change l’identifiant.'},409);
    }
    if (slug!==key) return json({error:'Le lien d’une carte existante ne peut pas être changé.'},400);
    const result=await db.prepare('UPDATE digital_business_cards SET name=?,company=?,payload=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE slug=? AND organization_id=?')
      .bind(card.name,card.company,data,+published,key,org).run();
    return result.meta?.changes ? json({card}) : json({error:'Carte introuvable.'},404);
  } catch (error) { return storageError(error); }
}
export async function getDigitalCard(request, env, slug) {
  if (request.method!=='GET') return json({error:'Méthode non permise.'},405);
  if (!validSlug(slug)) return json({error:'Carte introuvable.'},404);
  if (!env.CMS_DB) return json({error:'Service indisponible.'},503);
  try {
    const row=await env.CMS_DB.prepare('SELECT slug,payload,published FROM digital_business_cards WHERE slug=? AND published=1').bind(slug).first();
    if(!row)return json({error:'Cette carte est introuvable ou non publiée.'},404);
    const card=record(row);
    return json({card});
  } catch(error) { return missingCardsTable(error) ? json({error:'Cette carte est introuvable ou non publiée.'},404) : json({error:'Service indisponible.'},503); }
}
