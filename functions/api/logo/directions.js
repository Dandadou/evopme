/**
 * POST /api/logo/directions — prototype Archétype V2.
 * Ne modifie pas /api/logo/analyser ni la page publique.
 * Exige le questionnaire et l'analyse déjà validée, puis demande 4 pistes créatives.
 */
import {
  validateQuestionnaire, validateAnalyse
} from "../logo.js";
import {
  prepareCreativeContext, buildCreativeDirectionMessages,
  parseCreativeDirectionResponse, buildIllustrationPrompt
} from "../../../assets/archetype-creative-v2.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const attempts = new Map();
function limited(ip) {
  const now = Date.now();
  const entries = (attempts.get(ip) || []).filter(t => now - t < 3600000);
  if (entries.length >= 5) return true;
  entries.push(now);
  attempts.set(ip, entries);
  return false;
}
export async function onRequestPost({ request, env }) {
  if (!env?.AI?.run) return json({ ok: false, error: "IA indisponible." }, 503);
  const ip = request.headers.get("cf-connecting-ip") || "inconnue";
  if (limited(ip)) return json({ ok: false, error: "Limite temporaire atteinte." }, 429);
  const size = Number(request.headers.get("content-length"));
  if (Number.isFinite(size) && size > 30000) return json({ ok: false, error: "Requête trop volumineuse." }, 413);
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 30000) return json({ ok: false, error: "Requête trop volumineuse." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "JSON invalide." }, 400);
  }
  const questionnaire = validateQuestionnaire(body?.questionnaire);
  if (!questionnaire.ok) return json({ ok: false, error: "Questionnaire invalide.", details: questionnaire.errors }, 400);
  const analyse = validateAnalyse(body?.analyse, questionnaire.data);
  if (!analyse.ok) return json({ ok: false, error: "Analyse invalide.", details: analyse.errors }, 400);
  const context = prepareCreativeContext(questionnaire.data, analyse.analyse);
  const messages = buildCreativeDirectionMessages(context);
  const models = [...new Set([
    env.LOGO_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    env.LOGO_AI_MODEL_FALLBACK || "@cf/meta/llama-3.1-8b-instruct-fast"
  ])];
  for (const model of models) {
    try {
      const response = await env.AI.run(model, { messages, temperature: 0.65, max_tokens: 2600 });
      const raw = typeof response === "string" ? response : response?.response;
      const parsed = parseCreativeDirectionResponse(raw);
      if (!parsed.ok) continue;
      const directions = parsed.directions.map(d => ({
        ...d,
        illustration_prompt: ["illustration", "mixte"].includes(d.famille)
          ? buildIllustrationPrompt(d, context) : null
      }));
      return json({ ok: true, version: 2, model, directions, note: "Pistes créatives à valider, pas des fichiers graphiques finaux." });
    } catch {
      // Essayer le modèle de repli sans exposer de détails internes.
    }
  }
  return json({ ok: false, error: "Directions indisponibles. Réessayer plus tard." }, 503);
}
