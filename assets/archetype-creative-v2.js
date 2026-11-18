/**
 * ARCHÉTYPE V2 — contrat de direction artistique (prototype isolé).
 * Aucun appel réseau et aucune modification du moteur de production.
 * Une analyse de marque est une hypothèse de conception, pas un diagnostic.
 */
export const LOGO_FAMILIES = Object.freeze([
  "illustration", "typographie", "monogramme", "mixte"
]);

export const CREATIVE_BRIEF_VERSION = 2;

const string = (value, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const allowedHex = (value) => /^#[0-9a-f]{6}$/i.test(value || "");

export function prepareCreativeContext(questionnaire, analyse) {
  if (!questionnaire || !analyse || typeof questionnaire !== "object" || typeof analyse !== "object") {
    throw new TypeError("Questionnaire et analyse requis.");
  }
  const reponses = Object.entries(questionnaire.reponses || {})
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([question, reponse]) => ({ question, reponse: string(reponse, 2000) }));
  const palette = (analyse.palette || []).map(c => c.hex)
    .filter(allowedHex).slice(0, 3);
  return {
    version: CREATIVE_BRIEF_VERSION,
    marque: {
      nom: string(questionnaire.entreprise, 120),
      secteur: string(questionnaire.secteur, 80),
      clientele: string(questionnaire.clientele, 80),
    },
    declarations: reponses,
    hypotheses: {
      archetypePrincipal: string(analyse.archetype_principal, 50),
      archetypeSecondaire: string(analyse.archetype_secondaire, 50),
      strategie: string(analyse.strategie_recommandee, 50),
      confiance: string(analyse.confiance, 20),
      histoire: string(analyse.histoire_une_page, 2000),
    },
    palette,
    famillesPossibles: [...LOGO_FAMILIES],
    // Aucune contrainte de forme préfabriquée.
    directives: [
      "Imaginer des concepts graphiques spécifiques à la marque, sans catalogue d'icônes.",
      "Envisager une illustration originale, un lettrage, un monogramme et une composition mixte.",
      "Ne pas déduire un trait psychologique sensible ou clinique.",
      "Distinguer les faits déclarés, les interprétations et les hypothèses à tester.",
      "Ne jamais affirmer qu'une proposition est juridiquement unique ou déposables sans vérification.",
      "Privilégier lisibilité, contraste, déclinabilité, originalité et production textile.",
      "Ne pas confondre image générée et fichier vectoriel professionnel."
    ]
  };
}

export function validateCreativeDirections(directions) {
  if (!Array.isArray(directions) || directions.length < 2 || directions.length > 4) {
    return { ok: false, errors: ["Deux à quatre directions sont requises."] };
  }
  const errors = [];
  const normalized = directions.map((d, i) => {
    if (!d || !LOGO_FAMILIES.includes(d.famille)) errors.push(`Direction ${i + 1}: famille invalide.`);
    for (const key of ["idee", "intention", "elements", "justification", "risque"]) {
      if (!string(d?.[key])) errors.push(`Direction ${i + 1}: ${key} manquant.`);
    }
    return {
      famille: d?.famille,
      idee: string(d?.idee),
      intention: string(d?.intention),
      elements: string(d?.elements),
      justification: string(d?.justification),
      risque: string(d?.risque),
    };
  });
  return { ok: errors.length === 0, errors, directions: errors.length ? null : normalized };
}
