/* ============================================================================
 * Créateur de logo psychologique — Évolution PME
 * Logique locale par défaut. AUCUNE donnée ne quitte le navigateur :
 * pas d'envoi serveur, pas de base de données, pas de liste de leads.
 * La seule transmission, c'est le mailto vers info@evolutionpme.ca quand
 * le client clique lui-même « Fais-le peaufiner par un pro ».
 * Règle Loi 25 : courriel seulement, on ne garde pas les infos.
 * SEULE EXCEPTION, avec consentement explicite : si le client coche la
 * case « garder mes infos », le minimum utile (entreprise, courriel,
 * archétype principal, date) est envoyé à POST /api/cms/logo-lead et
 * gardé dans le CMS (table cms_submissions, D1). Pas de liste de
 * diffusion : Évolution PME n'en a pas. Si la case n'est pas cochée,
 * cette route n'est JAMAIS appelée et rien n'est gardé.
 * ========================================================================== */
(function () {
  "use strict";
  var CFG = window.EVOPME_LOGO_CONFIG;
  if (!CFG) return;

  /* ---------- utilitaires ---------- */
  function $(id) { return document.getElementById(id); }
  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function hexToHsl(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min, s = 0, hue = 0;
    if (d) { s = l > 0.5 ? d / (2 - max - min) : d / (max + min); }
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = Math.round(hue * 60); if (hue < 0) hue += 360;
    return { h: hue, s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function shade(hex, amt) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16), r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    function cl(v) { return Math.max(0, Math.min(255, v)); }
    return "#" + ((1 << 24) + (cl(r) << 16) + (cl(g) << 8) + cl(b)).toString(16).slice(1);
  }
  function isLight(hex) { var hsl = hexToHsl(hex); return hsl.l > 60; }

  var FONT_STACKS = {
    "Ronde et aérée": "'Trebuchet MS', Verdana, sans-serif",
    "Sans-serif légère": "Arial, Helvetica, sans-serif",
    "Manuscrite douce": "'Comic Sans MS', 'Segoe Print', cursive",
    "Serif classique": "Georgia, 'Times New Roman', serif",
    "Serif structurée": "Georgia, 'Times New Roman', serif",
    "Sans-serif nette": "Arial, Helvetica, sans-serif",
    "Sans-serif dynamique": "'Trebuchet MS', Verdana, sans-serif",
    "Sans-serif espacée": "Arial, Helvetica, sans-serif",
    "Manuscrite libre": "'Comic Sans MS', 'Segoe Print', cursive",
    "Condensée audacieuse": "'Arial Black', Arial, sans-serif",
    "Sans-serif massive": "'Arial Black', Arial, sans-serif",
    "Majuscules fortes": "'Arial Black', Arial, sans-serif",
    "Élégante fine": "Georgia, 'Times New Roman', serif",
    "Serif avec empattements fins": "Georgia, 'Times New Roman', serif",
    "Script léger": "'Comic Sans MS', 'Segoe Print', cursive",
    "Bold majuscules": "'Arial Black', Arial, sans-serif",
    "Sans-serif impact": "'Arial Black', Arial, sans-serif",
    "Condensée forte": "'Arial Black', Arial, sans-serif",
    "Serif élégante": "Georgia, 'Times New Roman', serif",
    "Script raffiné": "'Comic Sans MS', 'Segoe Print', cursive",
    "Sans-serif douce": "'Trebuchet MS', Verdana, sans-serif",
    "Ronde décalée": "'Trebuchet MS', Verdana, sans-serif",
    "Sans-serif joyeuse": "'Trebuchet MS', Verdana, sans-serif",
    "Manuscrite rigolote": "'Comic Sans MS', 'Segoe Print', cursive",
    "Simple lisible": "Arial, Helvetica, sans-serif",
    "Sans-serif franche": "Arial, Helvetica, sans-serif",
    "Serif terre-à-terre": "Georgia, 'Times New Roman', serif",
    "Ronde rassurante": "'Trebuchet MS', Verdana, sans-serif",
    "Sans-serif chaleureuse": "'Trebuchet MS', Verdana, sans-serif",
    "Serif douce": "Georgia, 'Times New Roman', serif",
    "Serif majestueuse": "Georgia, 'Times New Roman', serif",
    "Capitales élégantes": "Georgia, 'Times New Roman', serif",
    "Sans-serif prestige": "Arial, Helvetica, sans-serif",
    "Originale moderne": "'Trebuchet MS', Verdana, sans-serif",
    "Sans-serif créative": "'Trebuchet MS', Verdana, sans-serif",
    "Manuscrite d'atelier": "'Courier New', Courier, monospace"
  };


  /* ---------- pictogrammes : un vrai symbole, jamais une initiale seule --
     Règle de Daniel : « Il ne représente rien » = refusé. Le générateur
     ne sort plus une lettre dans une forme : il dessine un pictogramme
     plein, lisible en petit, qui représente le secteur ou la personnalité.
     Chaque symbole est dessiné dans une boîte 100 x 100, avec 3 couleurs :
     m = couleur principale du symbole, a = accent (palette[1]),
     c = couleur de découpe (le fond du contenant, pour les trous). */
  var SYMBOLES = {
    "maison-lueur": { label: "Maison et lueur", desc: "Une maison qui accueille, avec un petit soleil : chaleur, sécurité, lumière.", svg: function (m, a, c) { return '<polygon points="50,34 90,60 82,60 82,88 18,88 18,60 10,60" fill="' + m + '"/><rect x="44" y="68" width="12" height="20" fill="' + c + '"/><circle cx="76" cy="22" r="8" fill="' + a + '"/><line x1="76" y1="6" x2="76" y2="12" stroke="' + a + '" stroke-width="3"/><line x1="88" y1="14" x2="92" y2="10" stroke="' + a + '" stroke-width="3"/><line x1="64" y1="14" x2="60" y2="10" stroke="' + a + '" stroke-width="3"/>'; } },
    "coeur": { label: "Coeur", desc: "Un coeur simple : passion, lien, attention.", svg: function (m, a, c) { return '<path d="M50 88 C16 64 12 36 32 26 C44 20 50 30 50 36 C50 30 56 20 68 26 C88 36 84 64 50 88 Z" fill="' + m + '"/>'; } },
    "coeur-soin": { label: "Coeur et soin", desc: "Un coeur avec une croix de soin : on prend soin de toi, en sécurité.", svg: function (m, a, c) { return '<path d="M50 88 C16 64 12 36 32 26 C44 20 50 30 50 36 C50 30 56 20 68 26 C88 36 84 64 50 88 Z" fill="' + m + '"/><rect x="45" y="44" width="10" height="26" fill="' + c + '"/><rect x="37" y="52" width="26" height="10" fill="' + c + '"/>'; } },
    "cloche": { label: "Cloche de service", desc: "La cloche du resto : on sert, c'est chaud, c'est prêt.", svg: function (m, a, c) { return '<path d="M14 66 A36 34 0 0 1 86 66 Z" fill="' + m + '"/><rect x="8" y="66" width="84" height="8" rx="3" fill="' + m + '"/><circle cx="50" cy="26" r="5" fill="' + a + '"/>'; } },
    "tasse": { label: "Tasse de café", desc: "Une tasse qui fume : pause, chaleur, on jase.", svg: function (m, a, c) { return '<rect x="22" y="36" width="48" height="40" rx="6" fill="' + m + '"/><path d="M70 44 Q88 44 88 56 Q88 68 70 68" fill="none" stroke="' + m + '" stroke-width="6"/><path d="M38 28 C34 22 42 18 38 12 M52 28 C48 22 56 18 52 12" fill="none" stroke="' + a + '" stroke-width="4"/>'; } },
    "casque": { label: "Casque de chantier", desc: "Le casque : construction, sécurité, on bâtit solide.", svg: function (m, a, c) { return '<path d="M16 66 C16 36 32 22 50 22 C68 22 84 36 84 66 L90 66 A6 6 0 0 1 90 76 L10 76 A6 6 0 0 1 10 66 Z" fill="' + m + '"/><rect x="46" y="24" width="8" height="38" fill="' + c + '"/>'; } },
    "voiture": { label: "Voiture", desc: "Une silhouette d'auto en un seul geste, comme CPPauto : vitesse, route, métier.", svg: function (m, a, c) { return '<path d="M10 66 Q12 48 30 45 L42 30 Q45 26 50 26 L68 26 Q73 26 76 30 L85 45 Q94 47 94 58 L94 66 Z" fill="' + m + '"/><path d="M46 33 L58 33 L58 43 L42 43 Z" fill="' + c + '"/><circle cx="32" cy="68" r="10" fill="' + c + '"/><circle cx="32" cy="68" r="4" fill="' + m + '"/><circle cx="72" cy="68" r="10" fill="' + c + '"/><circle cx="72" cy="68" r="4" fill="' + m + '"/>'; } },
    "roue": { label: "Roue", desc: "Une roue : auto, route, ça roule.", svg: function (m, a, c) { return '<circle cx="50" cy="50" r="34" fill="' + m + '"/><rect x="47" y="18" width="6" height="64" fill="' + c + '"/><rect x="18" y="47" width="64" height="6" fill="' + c + '"/><circle cx="50" cy="50" r="20" fill="' + c + '"/><circle cx="50" cy="50" r="7" fill="' + m + '"/>'; } },
    "fleur": { label: "Fleur", desc: "Une fleur simple : beauté, douceur, nature.", svg: function (m, a, c) { return '<g fill="' + m + '"><ellipse cx="50" cy="26" rx="11" ry="17"/><ellipse cx="50" cy="26" rx="11" ry="17" transform="rotate(72 50 50)"/><ellipse cx="50" cy="26" rx="11" ry="17" transform="rotate(144 50 50)"/><ellipse cx="50" cy="26" rx="11" ry="17" transform="rotate(216 50 50)"/><ellipse cx="50" cy="26" rx="11" ry="17" transform="rotate(288 50 50)"/></g><circle cx="50" cy="50" r="11" fill="' + a + '"/>'; } },
    "document": { label: "Document coché", desc: "Un document avec une coche : sérieux, vérifié, on s'en occupe.", svg: function (m, a, c) { return '<rect x="26" y="12" width="48" height="76" rx="6" fill="' + m + '"/><rect x="36" y="26" width="28" height="5" fill="' + c + '"/><rect x="36" y="40" width="28" height="5" fill="' + c + '"/><rect x="36" y="54" width="18" height="5" fill="' + c + '"/><path d="M40 74 L48 82 L66 60" fill="none" stroke="' + a + '" stroke-width="6"/>'; } },
    "cle": { label: "Clé", desc: "Une clé : immobilier, on ouvre la porte de ta maison.", svg: function (m, a, c) { return '<circle cx="36" cy="36" r="19" fill="' + m + '"/><circle cx="36" cy="36" r="9" fill="' + c + '"/><rect x="50" y="50" width="38" height="10" rx="4" transform="rotate(45 50 50)" fill="' + m + '"/><rect x="76" y="72" width="6" height="12" fill="' + m + '"/><rect x="66" y="80" width="6" height="12" fill="' + m + '"/>'; } },
    "sac": { label: "Sac de boutique", desc: "Un sac : commerce de détail, on repart avec quelque chose.", svg: function (m, a, c) { return '<path d="M24 36 L76 36 L84 88 L16 88 Z" fill="' + m + '"/><path d="M38 36 A12 12 0 0 1 62 36" fill="none" stroke="' + m + '" stroke-width="6"/>'; } },
    "cintre": { label: "Cintre", desc: "Un cintre : mode, vêtements, on s'habille.", svg: function (m, a, c) { return '<path d="M50 36 A9 9 0 1 1 59 27" fill="none" stroke="' + m + '" stroke-width="6"/><polygon points="50,36 88,78 12,78" fill="none" stroke="' + m + '" stroke-width="6"/><circle cx="50" cy="36" r="4" fill="' + a + '"/>'; } },
    "feuille": { label: "Feuille", desc: "Une feuille : agriculture, nature, ça pousse.", svg: function (m, a, c) { return '<path d="M50 10 C80 26 86 62 50 90 C14 62 20 26 50 10 Z" fill="' + m + '"/><line x1="50" y1="24" x2="50" y2="80" stroke="' + c + '" stroke-width="4"/>'; } },
    "diplome": { label: "Toque de diplômé", desc: "La toque : éducation, on apprend, on réussit.", svg: function (m, a, c) { return '<polygon points="8,42 50,20 92,42 50,64" fill="' + m + '"/><path d="M32 52 L32 72 Q50 82 68 72 L68 52 L50 62 Z" fill="' + a + '"/><line x1="88" y1="46" x2="88" y2="66" stroke="' + m + '" stroke-width="4"/><circle cx="88" cy="70" r="5" fill="' + a + '"/>'; } },
    "livre": { label: "Livre ouvert", desc: "Un livre ouvert : savoir, on apprend.", svg: function (m, a, c) { return '<path d="M50 30 Q32 18 12 26 L12 76 Q32 68 50 78 Q68 68 88 76 L88 26 Q68 18 50 30 Z" fill="' + m + '"/><line x1="50" y1="30" x2="50" y2="78" stroke="' + c + '" stroke-width="4"/>'; } },
    "palette-art": { label: "Palette d'artiste", desc: "La palette : arts, création, couleurs.", svg: function (m, a, c) { return '<circle cx="50" cy="52" r="36" fill="' + m + '"/><circle cx="34" cy="42" r="6" fill="' + c + '"/><circle cx="52" cy="34" r="6" fill="' + c + '"/><circle cx="68" cy="44" r="6" fill="' + c + '"/><circle cx="66" cy="70" r="9" fill="' + c + '"/><rect x="78" y="14" width="8" height="34" rx="3" transform="rotate(30 82 31)" fill="' + a + '"/>'; } },
    "puce": { label: "Puce électronique", desc: "Une puce : technologie, numérique, ça connecte.", svg: function (m, a, c) { return '<rect x="26" y="26" width="48" height="48" rx="6" fill="' + m + '"/><rect x="40" y="40" width="20" height="20" fill="' + c + '"/><g fill="' + m + '"><rect x="34" y="14" width="6" height="12"/><rect x="47" y="14" width="6" height="12"/><rect x="60" y="14" width="6" height="12"/><rect x="34" y="74" width="6" height="12"/><rect x="47" y="74" width="6" height="12"/><rect x="60" y="74" width="6" height="12"/><rect x="14" y="34" width="12" height="6"/><rect x="14" y="47" width="12" height="6"/><rect x="14" y="60" width="12" height="6"/><rect x="74" y="34" width="12" height="6"/><rect x="74" y="47" width="12" height="6"/><rect x="74" y="60" width="12" height="6"/></g>'; } },
    "graphique": { label: "Graphique en hausse", desc: "Des barres qui montent : finance, ça grandit.", svg: function (m, a, c) { return '<rect x="18" y="58" width="14" height="30" fill="' + m + '"/><rect x="43" y="44" width="14" height="44" fill="' + m + '"/><rect x="68" y="28" width="14" height="60" fill="' + m + '"/><path d="M18 52 L44 36 L60 46 L84 18" fill="none" stroke="' + a + '" stroke-width="5"/><polygon points="84,18 72,18 84,30" fill="' + a + '"/>'; } },
    "montagne": { label: "Montagne et soleil", desc: "Une montagne : tourisme, plein air, horizon.", svg: function (m, a, c) { return '<polygon points="6,88 38,34 58,64 70,46 94,88" fill="' + m + '"/><polygon points="38,34 46,46 38,50 30,46" fill="' + c + '"/><circle cx="74" cy="22" r="9" fill="' + a + '"/>'; } },
    "maison-coeur": { label: "Maison et coeur", desc: "Une maison avec un coeur : chez soi, on s'en occupe.", svg: function (m, a, c) { return '<polygon points="50,30 90,58 82,58 82,88 18,88 18,58 10,58" fill="' + m + '"/><path d="M50 78 C40 70 38 60 44 56 C48 53 50 57 50 59 C50 57 52 53 56 56 C62 60 60 70 50 78 Z" fill="' + a + '"/>'; } },
    "patte": { label: "Patte d'animal", desc: "Une patte : animaux, on en prend soin.", svg: function (m, a, c) { return '<ellipse cx="50" cy="68" rx="22" ry="16" fill="' + m + '"/><circle cx="24" cy="46" r="9" fill="' + m + '"/><circle cx="41" cy="34" r="9" fill="' + m + '"/><circle cx="59" cy="34" r="9" fill="' + m + '"/><circle cx="76" cy="46" r="9" fill="' + m + '"/>'; } },
    "haltere": { label: "Haltère", desc: "Un haltère : sport, force, on se dépasse.", svg: function (m, a, c) { return '<rect x="28" y="46" width="44" height="8" fill="' + m + '"/><rect x="12" y="32" width="13" height="36" rx="3" fill="' + m + '"/><rect x="75" y="32" width="13" height="36" rx="3" fill="' + m + '"/><rect x="25" y="40" width="6" height="20" fill="' + a + '"/><rect x="69" y="40" width="6" height="20" fill="' + a + '"/>'; } },
    "note": { label: "Note de musique", desc: "Une note : événementiel, fête, musique.", svg: function (m, a, c) { return '<ellipse cx="36" cy="78" rx="11" ry="8" fill="' + m + '"/><rect x="45" y="26" width="6" height="52" fill="' + m + '"/><path d="M51 26 Q72 30 70 48 Q58 40 51 44 Z" fill="' + m + '"/><circle cx="76" cy="22" r="5" fill="' + a + '"/>'; } },
    "mains-coeur": { label: "Coeur porté", desc: "Un coeur porté par une main ouverte : entraide, OBNL, on donne.", svg: function (m, a, c) { return '<path d="M50 78 C16 54 12 26 32 16 C44 10 50 20 50 26 C50 20 56 10 68 16 C88 26 84 54 50 78 Z" fill="' + m + '"/><path d="M18 88 Q50 76 82 88" fill="none" stroke="' + a + '" stroke-width="6"/>'; } },
    "camion": { label: "Camion", desc: "Un camion : transport, livraison, route.", svg: function (m, a, c) { return '<rect x="10" y="28" width="50" height="40" fill="' + m + '"/><polygon points="60,40 84,40 92,68 60,68" fill="' + m + '"/><circle cx="30" cy="72" r="10" fill="' + c + '"/><circle cx="30" cy="72" r="4" fill="' + m + '"/><circle cx="74" cy="72" r="10" fill="' + c + '"/><circle cx="74" cy="72" r="4" fill="' + m + '"/>'; } },
    "avion": { label: "Avion en papier", desc: "Un avion en papier : voyage, liberté, on part.", svg: function (m, a, c) { return '<polygon points="8,50 92,16 66,84 56,58" fill="' + m + '"/><line x1="56" y1="58" x2="92" y2="16" stroke="' + c + '" stroke-width="3"/>'; } },
    "soleil": { label: "Soleil", desc: "Un soleil : lumière, optimisme, nouveau jour.", svg: function (m, a, c) { return '<circle cx="50" cy="50" r="20" fill="' + a + '"/><g stroke="' + m + '" stroke-width="5"><line x1="50" y1="14" x2="50" y2="24"/><line x1="50" y1="76" x2="50" y2="86"/><line x1="14" y1="50" x2="24" y2="50"/><line x1="76" y1="50" x2="86" y2="50"/><line x1="25" y1="25" x2="32" y2="32"/><line x1="68" y1="68" x2="75" y2="75"/><line x1="75" y1="25" x2="68" y2="32"/><line x1="32" y1="68" x2="25" y2="75"/></g>'; } },
    "boussole": { label: "Boussole", desc: "Une boussole : exploration, on trouve son chemin.", svg: function (m, a, c) { return '<circle cx="50" cy="50" r="36" fill="none" stroke="' + m + '" stroke-width="6"/><polygon points="50,20 58,50 50,80 42,50" fill="' + a + '"/><circle cx="50" cy="50" r="6" fill="' + m + '"/>'; } },
    "eclair": { label: "Éclair", desc: "Un éclair : énergie, rupture, ça frappe.", svg: function (m, a, c) { return '<polygon points="58,8 26,54 46,54 38,92 74,44 52,44" fill="' + a + '"/>'; } },
    "etoile-magie": { label: "Étoile magique", desc: "Une étoile qui scintille : transformation, rêve.", svg: function (m, a, c) { return '<polygon points="50,10 59,38 88,38 65,55 73,84 50,67 27,84 35,55 12,38 41,38" fill="' + m + '"/><polygon points="82,12 85,20 93,23 85,26 82,34 79,26 71,23 79,20" fill="' + a + '"/>'; } },
    "bouclier-coeur": { label: "Bouclier et coeur", desc: "Un bouclier avec un coeur : on protège, avec soin.", svg: function (m, a, c) { return '<path d="M50 10 L84 24 L84 54 Q84 78 50 90 Q16 78 16 54 L16 24 Z" fill="' + m + '"/><path d="M50 72 C36 62 33 48 41 43 C47 39 50 44 50 47 C50 44 53 39 59 43 C67 48 64 62 50 72 Z" fill="' + a + '"/>'; } },
    "couronne": { label: "Couronne", desc: "Une couronne : prestige, excellence, le meilleur.", svg: function (m, a, c) { return '<polygon points="16,70 12,32 36,50 50,20 64,50 88,32 84,70" fill="' + m + '"/><rect x="16" y="74" width="68" height="9" fill="' + a + '"/><circle cx="50" cy="52" r="5" fill="' + c + '"/>'; } },
    "ampoule": { label: "Ampoule d'idée", desc: "Une ampoule : idée, création, ça s'allume.", svg: function (m, a, c) { return '<circle cx="50" cy="42" r="25" fill="' + m + '"/><rect x="41" y="66" width="18" height="6" fill="' + a + '"/><rect x="43" y="76" width="14" height="6" fill="' + a + '"/><line x1="50" y1="6" x2="50" y2="12" stroke="' + a + '" stroke-width="4"/><line x1="16" y1="28" x2="21" y2="32" stroke="' + a + '" stroke-width="4"/><line x1="84" y1="28" x2="79" y2="32" stroke="' + a + '" stroke-width="4"/>'; } },
    "sourire": { label: "Visage souriant", desc: "Un sourire : plaisir, humour, légèreté.", svg: function (m, a, c) { return '<circle cx="50" cy="50" r="38" fill="' + m + '"/><circle cx="36" cy="42" r="5" fill="' + c + '"/><circle cx="64" cy="42" r="5" fill="' + c + '"/><path d="M32 60 Q50 74 68 60" fill="none" stroke="' + c + '" stroke-width="5"/>'; } },
    "chat": { label: "Tête de chat", desc: "Un chat : calme, il observe, il vient vers toi.", svg: function (m, a, c) { return '<path d="M28 34 L32 12 L48 24 L52 24 L68 12 L72 34 A26 26 0 0 1 72 60 Q72 86 50 86 Q28 86 28 60 Z" fill="' + m + '"/><circle cx="40" cy="52" r="4" fill="' + c + '"/><circle cx="60" cy="52" r="4" fill="' + c + '"/><polygon points="50,64 44,70 56,70" fill="' + a + '"/>'; } },
    "arbre": { label: "Arbre", desc: "Un arbre : nature, ancré, ça respire.", svg: function (m, a, c) { return '<circle cx="50" cy="32" r="19" fill="' + m + '"/><circle cx="30" cy="52" r="15" fill="' + m + '"/><circle cx="70" cy="52" r="15" fill="' + m + '"/><rect x="45" y="58" width="10" height="28" fill="' + m + '"/>'; } },
    "vague": { label: "Vagues", desc: "Des vagues : mer, lac, fluide, apaisant.", svg: function (m, a, c) { return '<g fill="none" stroke="' + m + '" stroke-width="7"><path d="M12 38 Q25 26 38 38 T64 38 T90 38"/><path d="M12 58 Q25 46 38 58 T64 58 T90 58"/><path d="M12 78 Q25 66 38 78 T64 78 T90 78"/></g>'; } },
    "trophee": { label: "Trophée", desc: "Un trophée : victoire, dépassement, on gagne.", svg: function (m, a, c) { return '<path d="M28 14 L72 14 L72 44 Q72 62 50 62 Q28 62 28 44 Z" fill="' + m + '"/><path d="M28 20 Q12 20 12 34 Q12 48 28 48" fill="none" stroke="' + m + '" stroke-width="6"/><path d="M72 20 Q88 20 88 34 Q88 48 72 48" fill="none" stroke="' + m + '" stroke-width="6"/><rect x="46" y="62" width="8" height="12" fill="' + m + '"/><rect x="34" y="74" width="32" height="8" fill="' + a + '"/>'; } }
  };

  /* Un pictogramme par secteur (les 22 secteurs), un par archétype
     en repli, et des mots-clés du questionnaire en priorité : le nom de
     l'entreprise et les réponses du client peuvent changer le symbole
     (ex. « lueur » + santé = maison-lueur, pas un M). */
  var SECTEUR_SYMBOLES = {
    restauration: "cloche", construction: "casque", mecanique: "voiture",
    sante: "coeur-soin", beaute: "fleur", "services-pro": "document",
    immobilier: "cle", detail: "sac", mode: "cintre", agro: "feuille",
    education: "diplome", arts: "palette-art", techno: "puce",
    finance: "graphique", tourisme: "montagne", domicile: "maison-coeur",
    animaux: "patte", sport: "haltere", evenementiel: "note",
    obnl: "mains-coeur", transport: "camion", autre: ""
  };
  var ARCHETYPE_SYMBOLES = {
    innocent: "soleil", sage: "livre", explorateur: "boussole",
    rebelle: "eclair", magicien: "etoile-magie", heros: "trophee",
    amoureux: "coeur", bouffon: "sourire", "homme-ordinaire": "maison-coeur",
    protecteur: "bouclier-coeur", souverain: "couronne", createur: "ampoule"
  };
  var MOTS_SYMBOLES = [
    { mots: ["chat"], id: "chat" },
    { mots: ["chien"], id: "patte" },
    { mots: ["maison", "foyer"], id: "maison-lueur" },
    { mots: ["lueur", "lumiere"], id: "maison-lueur", secteurs: ["sante", "domicile", "immobilier"] },
    { mots: ["lueur", "lumiere", "soleil", "aurore"], id: "soleil" },
    { mots: ["voiture", "auto", "garage", "carrosserie", "mecanique"], id: "voiture" },
    { mots: ["camion", "livraison"], id: "camion" },
    { mots: ["dent"], id: "coeur-soin" },
    { mots: ["cafe", "the"], id: "tasse" },
    { mots: ["arbre", "foret", "bois"], id: "arbre" },
    { mots: ["mer", "ocean", "plage", "lac", "riviere"], id: "vague" },
    { mots: ["montagne"], id: "montagne" },
    { mots: ["fleur", "jardin"], id: "fleur" },
    { mots: ["livre", "lecture", "enseigner", "formation"], id: "livre" },
    { mots: ["musique", "chanson", "dj", "fete"], id: "note" },
    { mots: ["avion", "voyage"], id: "avion" },
    { mots: ["coiffure", "beaute", "maquillage"], id: "fleur" },
    { mots: ["vetement", "mode", "couture"], id: "cintre" },
    { mots: ["argent", "banque", "finance", "assurance"], id: "graphique" },
    { mots: ["sport", "gym", "entrainement", "course"], id: "haltere" },
    { mots: ["outil", "bricolage", "renovation"], id: "casque" },
    { mots: ["restaurant", "resto", "cuisine", "pain", "boulangerie"], id: "cloche" }
  ];
  function choisirSymbole() {
    if (state.pictogramme && SYMBOLES[state.pictogramme]) return state.pictogramme;
    /* La réponse « animal » ne décide pas du symbole : dire « un chat »
       dans cette question, c'est un signal d'archétype, pas un métier.
       Le symbole vient du nom, du secteur et des 8 autres réponses. */
    var txt = norm([state.entreprise, state.secteurAutre].concat(CFG.questionsOuvertes.filter(function (q) { return q.id !== "animal"; }).map(function (q) { return state.reponses[q.id] || ""; })).join(" "));
    var i, j, r;
    for (i = 0; i < MOTS_SYMBOLES.length; i++) {
      r = MOTS_SYMBOLES[i];
      if (r.secteurs && r.secteurs.indexOf(state.secteur) === -1) continue;
      for (j = 0; j < r.mots.length; j++) { if (txt.indexOf(r.mots[j]) !== -1) return r.id; }
    }
    if (SECTEUR_SYMBOLES[state.secteur]) return SECTEUR_SYMBOLES[state.secteur];
    if (state.top && ARCHETYPE_SYMBOLES[state.top.id]) return ARCHETYPE_SYMBOLES[state.top.id];
    return "soleil";
  }
  function symboleActuel() { var id = choisirSymbole(); return { id: id, def: SYMBOLES[id] }; }

  /* ---------- état ---------- */
  var state = {
    step: 1,
    entreprise: "", secteur: "", secteurAutre: "", clientele: "", typeLogo: "symbole", style: "",
    reponses: {}, aakerFondateur: {}, aakerClient: {},
    scores: null, top: null, second: null, trace: [],
    paletteIdx: 0, forme: "", police: "", palette: null, pictogramme: null,
    crash: null, previewBg: "blanc",
    consentement: false, consentEmail: "", leadGardeId: null, leadGardeErreur: "",
    sourceAnalyse: "locale", iaModele: "", iaAnalyse: null, imagePrompt: null
  };
  CFG.dimensionsAaker.forEach(function (d) { state.aakerFondateur[d.id] = 3; state.aakerClient[d.id] = 3; });

  function archById(id) { return CFG.archetypes.find(function (a) { return a.id === id; }); }
  function palettesFor(arch) {
    var base = arch.couleurs;
    return [
      { nom: "Palette 1 — d'origine", couleurs: base.slice() },
      { nom: "Palette 2 — plus sombre", couleurs: base.map(function (c) { return shade(c, -35); }) },
      { nom: "Palette 3 — plus claire", couleurs: base.map(function (c) { return shade(c, 60); }) }
    ];
  }

  /* ---------- analyse par mots-clés ---------- */
  function analyze() {
    var scores = {}, trace = [];
    CFG.archetypes.forEach(function (a) { scores[a.id] = 0; });
    CFG.questionsOuvertes.forEach(function (q) {
      var txt = norm(state.reponses[q.id] || "");
      var found = [];
      if (txt) {
        CFG.archetypes.forEach(function (a) {
          a.motsCles.forEach(function (kw) {
            var n = txt.split(kw).length - 1;
            if (n > 0) { scores[a.id] += 2 * n + (n > 1 ? 1 : 0); found.push({ arch: a.id, mot: kw, points: 2 * n + (n > 1 ? 1 : 0) }); }
          });
        });
        if (q.id === "animal") {
          CFG.animalMap.forEach(function (m) {
            if (m.mots.some(function (w) { return txt.indexOf(norm(w)) !== -1; })) {
              m.arch.forEach(function (id) { scores[id] += 3; });
              found.push({ arch: m.arch.join(" + "), mot: "animal : " + m.mots.join("/"), points: 3, note: m.note });
            }
          });
        }
        if (q.id === "moment") {
          CFG.momentMap.forEach(function (m) {
            if (m.mots.some(function (w) { return txt.indexOf(norm(w)) !== -1; })) {
              found.push({ arch: "couleurs", mot: "moment : " + m.mots.join("/"), points: 0, note: m.note });
            }
          });
        }
        if (q.id === "endroit") {
          CFG.lieuMap.forEach(function (m) {
            if (m.mots.some(function (w) { return txt.indexOf(norm(w)) !== -1; })) {
              found.push({ arch: "couleurs", mot: "lieu : " + m.mots.join("/"), points: 0, note: m.note });
            }
          });
        }
      }
      trace.push({ question: q, reponse: state.reponses[q.id] || "", found: found });
    });
    var style = CFG.styles.find(function (s) { return s.id === state.style; });
    if (style) style.boost.forEach(function (id) { scores[id] = (scores[id] || 0) + 3; });
    var ranked = CFG.archetypes.slice().sort(function (a, b) { return scores[b.id] - scores[a.id]; });
    state.scores = scores; state.trace = trace;
    state.top = ranked[0]; state.second = ranked[1]; state.pictogramme = null;
    state.palette = palettesFor(state.top)[0]; state.paletteIdx = 0;
    state.forme = state.top.formes[0]; state.police = state.top.polices[0];
  }


  /* ---------- analyse par IA (Workers AI), avec repli local ----------
     POST /api/logo/analyser envoie le questionnaire pour analyse
     pendant la requête seulement : rien n'est conservé (Loi 25).
     Si l'IA est indisponible, en quota, ou renvoie une sortie invalide,
     la route répond source:"locale" et on garde l'analyse locale par
     mots-clés. Le client voit toujours un résultat, jamais une erreur. */
  async function analyserAvecIA() {
    var payload = {
      entreprise: state.entreprise, secteur: state.secteur, secteurAutre: state.secteurAutre,
      clientele: state.clientele, typeLogo: state.typeLogo, style: state.style,
      reponses: state.reponses, aakerFondateur: state.aakerFondateur, aakerClient: state.aakerClient
    };
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 30000);
      var res = await fetch("/api/logo/analyser", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(payload), signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) return false;
      var data = await res.json();
      if (!data || data.source !== "ia" || !data.analyse) return false;
      appliquerAnalyseIA(data);
      return true;
    } catch (e) { return false; }
  }
  function appliquerAnalyseIA(data) {
    var a = data.analyse;
    var scores = {};
    CFG.archetypes.forEach(function (x) { scores[x.id] = (a.scores_archetypes && a.scores_archetypes[x.id]) || 0; });
    state.scores = scores; state.trace = state.trace || [];
    state.top = archById(a.archetype_principal) || CFG.archetypes[0];
    state.second = archById(a.archetype_secondaire) || CFG.archetypes[1];
    state.sourceAnalyse = "ia"; state.iaModele = data.model || ""; state.iaAnalyse = a;
    state.imagePrompt = data.image_prompt || null;
    // Palette IA : 3 hex validés côté serveur. Si la forme ou la police
    // de l'IA ne correspondent pas à l'archétype, on garde celles du top.
    if (a.palette && a.palette.length) {
      state.palette = { nom: "Palette IA — proposée", couleurs: a.palette.map(function (c) { return c.hex; }) };
      state.paletteIdx = -1;
    } else { state.palette = palettesFor(state.top)[0]; state.paletteIdx = 0; }
    state.forme = (a.forme && CFG.formes.some(function (f) { return f.id === a.forme; })) ? a.forme : state.top.formes[0];
    state.police = (a.police && state.top.polices.indexOf(a.police) !== -1) ? a.police : state.top.polices[0];
    state.pictogramme = (a.pictogramme && SYMBOLES[a.pictogramme]) ? a.pictogramme : null;
    // Aaker IA (1-5) : on les applique, le double portrait se recalcule.
    CFG.dimensionsAaker.forEach(function (d) {
      if (a.aaker_fondateur && a.aaker_fondateur[d.id]) state.aakerFondateur[d.id] = a.aaker_fondateur[d.id];
      if (a.aaker_clientele && a.aaker_clientele[d.id]) state.aakerClient[d.id] = a.aaker_clientele[d.id];
    });
    // Trace : pour « Pourquoi TON logo », on liste les 9 réponses telles
    // quelles, sans refaire l'analyse locale (analyze() écraserait le
    // résultat IA). L'histoire IA s'affiche dans le rendu.
    state.trace = CFG.questionsOuvertes.map(function (q) {
      return { question: q, reponse: state.reponses[q.id] || "", found: [] };
    });
  }

  /* ---------- SVG du logo ---------- */
  function shapeMarkup(forme, couleur, lettre) {
    var fill = couleur, ink = isLight(couleur) ? "#111111" : "#ffffff";
    var shape = "";
    switch (forme) {
      case "bouclier": shape = '<path d="M100 18 L168 44 V102 C168 144 136 170 100 182 C64 170 32 144 32 102 V44 Z" fill="' + fill + '"/>'; break;
      case "losange": shape = '<polygon points="100,18 182,88 100,158 18,88" fill="' + fill + '"/>'; break;
      case "vague": shape = '<path d="M18 108 C48 62 78 142 100 104 C122 66 152 142 182 104 L182 160 L18 160 Z" fill="' + fill + '"/>'; break;
      case "etoile": shape = '<polygon points="100,14 122,72 184,72 134,108 152,170 100,132 48,170 66,108 16,72 78,72" fill="' + fill + '"/>'; break;
      case "hexagone": shape = '<polygon points="100,16 172,58 172,124 100,166 28,124 28,58" fill="' + fill + '"/>'; break;
      case "fleche": shape = '<polygon points="18,52 118,52 118,22 184,92 118,162 118,132 18,132" fill="' + fill + '"/>'; break;
      case "goutte": shape = '<path d="M100 16 C100 16 168 92 168 122 A68 68 0 1 1 32 122 C32 92 100 16 100 16 Z" fill="' + fill + '"/>'; break;
      default: shape = '<circle cx="100" cy="88" r="70" fill="' + fill + '"/>'; break;
    }
    /* La lettre n'est dessinée que pour le monogramme, choisi
       explicitement par le client. Pour un symbole, jamais de lettre :
       le pictogramme représente l'entreprise, pas son initiale. */
    if (lettre) {
      var y = forme === "etoile" ? 112 : forme === "fleche" ? 108 : forme === "goutte" ? 138 : forme === "bouclier" ? 112 : 106;
      var fs = forme === "etoile" ? 34 : forme === "fleche" ? 42 : 52;
      shape += '<text x="100" y="' + y + '" text-anchor="middle" font-size="' + fs + '" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
    }
    return shape;
  }
  function initials(nom) {
    var mots = (nom || "Ton entreprise").trim().split(/\s+/);
    if (state.typeLogo === "texte") return "";
    if (state.typeLogo === "monogramme") return mots.slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
    return (mots[0] || "T")[0].toUpperCase();
  }
  function logoSVG(size) {
    var pal = state.palette || palettesFor(state.top || CFG.archetypes[0])[0];
    var font = FONT_STACKS[state.police] || "Arial, sans-serif";
    var nom = state.entreprise || "Ton entreprise";
    var bg = state.previewBg === "blanc" ? "#ffffff" : state.previewBg === "fonce" ? "#0d0d0f" : "none";
    var textColor = state.previewBg === "fonce" ? "#ffffff" : "#111111";
    var s = size || 640;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 200 200">'
      + (bg !== "none" ? '<rect width="200" height="200" fill="' + bg + '"/>' : '');
    if (state.typeLogo === "texte") {
      /* Texte seulement, choisi explicitement : le nom en gros, sans forme
         vide et sans initiale. */
      svg += '<text x="100" y="98" text-anchor="middle" font-size="22" font-weight="bold" fill="' + textColor + '" font-family="' + esc(font) + '">' + esc(nom.toUpperCase()) + '</text>'
        + '<rect x="70" y="112" width="60" height="5" fill="' + pal.couleurs[0] + '"/>';
    } else if (state.typeLogo === "monogramme") {
      /* Monogramme choisi explicitement : les initiales dans la forme,
         comme un blason. Ce n'est pas le cas par défaut. */
      svg += shapeMarkup(state.forme, pal.couleurs[0], initials(nom));
    } else {
      /* Symbole : la forme choisie sert de contenant, le pictogramme
         dessine ce que l'entreprise représente. Jamais une initiale. */
      var sym = symboleActuel();
      var ink = isLight(pal.couleurs[0]) ? "#111111" : "#ffffff";
      var rempli = ["cercle", "bouclier", "losange", "hexagone", "goutte", "etoile", "fleche"].indexOf(state.forme) !== -1;
      var contenant = state.forme === "vague" ? shade(pal.couleurs[0], 70) : pal.couleurs[0];
      var symMain = rempli ? ink : pal.couleurs[0];
      var symAccent = pal.couleurs[1] || symMain;
      var symCut = rempli ? pal.couleurs[0] : "#ffffff";
      svg += shapeMarkup(state.forme, contenant, "");
      svg += '<g transform="translate(62,52) scale(0.76)">' + sym.def.svg(symMain, symAccent, symCut) + '</g>';
    }
    if (state.typeLogo !== "texte") {
      svg += '<text x="100" y="196" text-anchor="middle" font-size="13" font-weight="bold" fill="' + textColor + '" font-family="' + esc(font) + '">' + esc(nom.toUpperCase()) + '</text>';
    }
    svg += '</svg>';
    return svg;
  }
  function renderLogo() {
    var box = $("logoPreview"); if (!box || !state.top) return;
    box.innerHTML = logoSVG(640);
    var cap = $("logoCaption");
    if (cap) cap.textContent = (state.entreprise || "Ton entreprise") + " — " + state.top.nom + " · Symbole : " + symboleActuel().def.label + " · " + state.palette.nom + " · " + (CFG.formes.find(function (f) { return f.id === state.forme; }) || {}).label + " · " + state.police;
  }

  /* ---------- rendu des étapes ---------- */
  function showStep(n) {
    state.step = n;
    [1, 2, 3].forEach(function (i) {
      var el = $("step" + i); if (el) el.hidden = i !== n;
      var b = $("stepBtn" + i); if (b) b.classList.toggle("active", i === n);
    });
    window.scrollTo(0, 0);
  }
  function renderResult() {
    if (!state.top) return;
    var srcNote = state.sourceAnalyse === "ia"
      ? "<p class='cl-note'><b>Analyse IA</b>" + (state.iaModele ? " (" + esc(state.iaModele) + ")" : "") + " — piste de travail à valider, pas un diagnostic. Daniel valide avant toute livraison.</p>"
      : "<p class='cl-note'>Analyse locale par mots-clés — l'IA était indisponible pour cette analyse, le résultat local s'applique. Piste de travail à valider, pas un diagnostic.</p>";
    $("resArchetype").innerHTML = srcNote + "<b>" + esc(state.top.nom) + "</b><p>Ton logo raconte surtout l'histoire du " + esc(state.top.nom) + " : " + esc(state.top.promesse) + "</p><p>En deuxième : <b>" + esc(state.second.nom) + "</b> — " + esc(state.second.promesse) + "</p><p class='cl-note'>Ombre à éviter : " + esc(state.top.ombre) + "</p>";
    var bars = CFG.archetypes.slice().sort(function (a, b) { return state.scores[b.id] - state.scores[a.id]; })
      .map(function (a) {
        var max = Math.max(1, state.scores[state.top.id]);
        var pct = Math.round(state.scores[a.id] / max * 100);
        return '<div class="cl-bar-row"><span>' + esc(a.nom) + '</span><div class="cl-bar"><i style="width:' + pct + '%"></i></div><b>' + state.scores[a.id] + '</b></div>';
      }).join("");
    $("resBars").innerHTML = bars;
    renderEditor(); renderLogo(); renderPourquoi(); renderAaker(); renderStory();
  }
  function renderEditor() {
    var pals = palettesFor(state.top);
    $("paletteChoices").innerHTML = pals.map(function (p, i) {
      return '<button type="button" class="cl-choice' + (i === state.paletteIdx ? " active" : "") + '" data-pal="' + i + '"><span class="cl-swatches">' + p.couleurs.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + '</span>' + esc(p.nom) + '<small>' + p.couleurs.join(" · ") + '</small></button>';
    }).join("");
    $("formeChoices").innerHTML = state.top.formes.map(function (f) {
      var meta = CFG.formes.find(function (x) { return x.id === f; }) || { label: f, description: "" };
      return '<button type="button" class="cl-choice' + (state.forme === f ? " active" : "") + '" data-forme="' + f + '">' + esc(meta.label) + '<small>' + esc(meta.description) + '</small></button>';
    }).join("");
    var symSel = $("symboleSelect");
    if (symSel) {
      var cur = choisirSymbole();
      symSel.innerHTML = Object.keys(SYMBOLES).map(function (id) {
        return '<option value="' + id + '"' + (id === cur ? " selected" : "") + '>' + esc(SYMBOLES[id].label) + " — " + esc(SYMBOLES[id].desc) + "</option>";
      }).join("");
    }
    $("policeChoices").innerHTML = state.top.polices.map(function (p) {
      return '<button type="button" class="cl-choice' + (state.police === p ? " active" : "") + '" data-police="' + esc(p) + '" style="font-family:' + esc(FONT_STACKS[p] || "Arial, sans-serif") + '">' + esc(p) + '</button>';
    }).join("");
  }
  function renderAaker() {
    function rows(who) {
      return CFG.dimensionsAaker.map(function (d) {
        var v = who === "fondateur" ? state.aakerFondateur[d.id] : state.aakerClient[d.id];
        return '<label class="cl-slider"><span>' + esc(d.label) + ' <small>' + esc(d.description) + '</small></span><input type="range" min="1" max="5" step="1" value="' + v + '" data-aaker="' + who + ":" + d.id + '"><b>' + v + ' / 5</b></label>';
      }).join("");
    }
    var f = $("aakerFondateur"), c = $("aakerClient");
    if (f) f.innerHTML = rows("fondateur");
    if (c) c.innerHTML = rows("client");
    var total = 0, detail = CFG.dimensionsAaker.map(function (d) {
      var gap = Math.abs(state.aakerFondateur[d.id] - state.aakerClient[d.id]); total += gap;
      return "<li>" + esc(d.label) + " : écart de " + gap + " (fondateur " + state.aakerFondateur[d.id] + " / clientèle " + state.aakerClient[d.id] + ")</li>";
    }).join("");
    var strat = total <= 3 ? "Écart petit : tu peux aligner le logo sur le fondateur, ça va ressembler à ta clientèle aussi."
      : total <= 7 ? "Écart moyen : fais un compromis explicite, garde le ton du fondateur, mais parle le langage de ta clientèle."
      : "Écart grand : attention, un logo qui te ressemble seulement risque de ne pas vendre. Aligne d'abord sur ce que ta clientèle veut devenir.";
    var out = $("aakerResult");
    if (out) out.innerHTML = "<p><b>Écart total : " + total + " / 20.</b> " + esc(strat) + "</p><ul>" + detail + "</ul>";
  }
  function renderStory() {
    var el = $("storyBox"); if (!el) return;
    var fierte = state.reponses["fierte"] || "…", defi = state.reponses["defi"] || "…", ressenti = state.reponses["ressenti"] || "…";
    el.innerHTML = "<p>« " + esc(state.entreprise || "Ton entreprise") + " existe parce que " + esc(fierte) + " Même après " + esc(defi) + ", l'idée reste la même : que les gens repartent en se sentant " + esc(ressenti) + " Voilà pourquoi le logo raconte l'histoire du " + esc(state.top.nom) + ". »</p><p class='cl-note'>Une page, 30 secondes à raconter. Si une phrase ne vient pas de tes réponses, enlève-la : une histoire forcée se voit.</p>";
  }
  function renderPourquoi() {
    var el = $("pourquoiBox"); if (!el) return;
    if (!state.top) { el.innerHTML = "<p>Remplis le questionnaire, puis reviens ici : cet onglet va expliquer ton logo à partir de TES réponses, pas de généralités.</p>"; return; }
    var html = "<h3>Pourquoi TON logo</h3><p>Ta chaîne, en 4 étapes : tes mots → les points → ton archétype (" + esc(state.top.nom) + ") → tes choix dans l'éditeur.</p>";
    if (state.sourceAnalyse === "ia" && state.iaAnalyse) {
      html += "<p><b>Analyse IA.</b> Ici, ce n'est pas le pointage par mots-clés qui a décidé, c'est le sens de tes réponses : " + esc(state.iaAnalyse.histoire_une_page || "") + "</p><p class='cl-note'>Confiance : " + esc(state.iaAnalyse.confiance) + " — " + esc(state.iaAnalyse.confiance_raison || "") + "</p>";
    }
    html += "<h4>1. Tes choix fermés</h4><ul><li><b>Secteur et clientèle : 0 point.</b> Ils ne scorent pas, ils cadrent le contexte. Un même archétype ne donne pas le même logo en restauration et en services professionnels.</li>";
    var style = CFG.styles.find(function (s) { return s.id === state.style; });
    html += "<li><b>Style visuel (" + esc(style ? style.label : "—") + ") : +3 points</b> vers " + esc(style && style.boost.length ? style.boost.map(function (id) { return archById(id).nom; }).join(", ") : "aucun archétype") + ".</li>";
    html += "<li><b>Type de logo : " + esc(state.typeLogo) + ".</b> Ça change la forme du logo, pas l'archétype.</li></ul>";
    html += "<h4>2. Tes 9 réponses, une par une</h4>";
    state.trace.forEach(function (t) {
      html += "<div class='cl-trace'><p><b>" + esc(t.question.texte) + "</b></p><blockquote>« " + esc(t.reponse || "(pas de réponse)") + " »</blockquote>";
      if (!t.found.length) html += state.sourceAnalyse === "ia"
        ? "<p class='cl-note'>L'IA a lu le sens de cette réponse, pas seulement ses mots-clés : elle compte dans l'histoire ci-dessus, même sans mot-clé détecté.</p>"
        : "<p class='cl-note'>Aucun mot-clé détecté ici. Cette réponse n'a pas changé le pointage, et c'est normal : le questionnaire est un déclencheur de conversation, pas un détecteur parfait.</p>";
      else html += "<ul>" + t.found.map(function (f) { return "<li><b>" + esc(f.arch) + "</b> : +" + f.points + " — mot détecté : « " + esc(f.mot) + " »" + (f.note ? "<br><span class='cl-note'>" + esc(f.note) + "</span>" : "") + "</li>"; }).join("") + "</ul>";
      html += "</div>";
    });
    var pal = state.palette;
    html += "<h4>3. Tes couleurs choisies</h4><p>" + esc(pal.nom) + " :</p><ul>" + pal.couleurs.map(function (c) {
      var hsl = hexToHsl(c);
      return "<li><i class='cl-dot' style='background:" + c + "'></i><b>" + c + "</b> — teinte " + hsl.h + "°, saturation " + hsl.s + " %, luminosité " + hsl.l + " %. " + (hsl.l > 60 ? "Claire : plaisante, douce." : hsl.s > 60 ? "Saturée : activante, qui frappe." : "Sobre : posée, qui inspire confiance.") + "</li>";
    }).join("") + "</ul>";
    var momentTxt = norm(state.reponses["moment"] || ""), lieuTxt = norm(state.reponses["endroit"] || "");
    CFG.momentMap.forEach(function (m) { if (m.mots.some(function (w) { return momentTxt.indexOf(norm(w)) !== -1; })) html += "<p class='cl-note'>Ton moment préféré : " + esc(m.note) + "</p>"; });
    CFG.lieuMap.forEach(function (m) { if (m.mots.some(function (w) { return lieuTxt.indexOf(norm(w)) !== -1; })) html += "<p class='cl-note'>Ton endroit préféré : " + esc(m.note) + "</p>"; });
    var formeMeta = CFG.formes.find(function (x) { return x.id === state.forme; }) || {};
    var sym = symboleActuel();
    html += "<h4>4. Ton symbole, ta forme et ta police</h4><p><b>Symbole : " + esc(sym.def.label) + "</b> — " + esc(sym.def.desc) + " Un logo qui ne représente rien, on le refuse : le symbole doit dire ton secteur ou ta personnalité en 1 seconde.</p><p><b>" + esc(formeMeta.label || state.forme) + "</b> — " + esc(formeMeta.description || "") + " <b>Police : " + esc(state.police) + ".</b> La forme et la police doivent rester congruentes avec l'archétype " + esc(state.top.nom) + ", sinon le logo envoie deux messages en même temps.</p>";
    html += "<p class='cl-note'>Ce que ce logo ne prouve pas : qu'il va vendre plus, ni que tes clients vont le percevoir comme tu le perçois. C'est pour ça qu'il y a le crash-test, juste en dessous.</p>";
    el.innerHTML = html;
  }

  /* ---------- export PNG / analyse / courriel ---------- */
  function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportPNG(transparent) {
    if (!state.top) return;
    var svg = logoSVG(1280);
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 1280;
      var ctx = canvas.getContext("2d");
      if (!transparent) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 1280, 1280); }
      ctx.drawImage(img, 0, 0, 1280, 1280);
      canvas.toBlob(function (b) { if (b) downloadBlob(b, "logo-" + (state.entreprise || "entreprise").toLowerCase().replace(/[^a-z0-9]+/g, "-") + (transparent ? "-transparent" : "") + ".png"); }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function analysisHTML() {
    var pal = state.palette;
    var rows = CFG.archetypes.slice().sort(function (a, b) { return state.scores[b.id] - state.scores[a.id]; })
      .map(function (a) { return "<tr><td>" + esc(a.nom) + "</td><td>" + state.scores[a.id] + "</td><td>" + esc(a.promesse) + "</td></tr>"; }).join("");
    var crash = state.crash ? "<p>Secteur deviné : " + esc(state.crash.secteur) + " · Ton perçu : " + esc(state.crash.ton) + " · Confiance : " + state.crash.confiance + " / 5 · Ce qui a marqué : " + esc(state.crash.marque) + "</p><p><b>Attention :</b> test local, n = 1. Ce n'est pas une preuve, c'est un début. Le vrai crash-test se fait auprès de 20 à 50 personnes de ta clientèle cible.</p>"
      : "<p>Crash-test pas encore fait dans cette session. Les 3 chiffres (mémorabilité, confiance, distinctivité) restent à mesurer auprès de vrais clients, pas à inventer.</p>";
    return "<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>Analyse logo — " + esc(state.entreprise || "") + "</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#111}h1{color:#f48a08}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}@media print{body{margin:0}}</style></head><body>"
      + "<h1>Évolution PME — Créateur de marques</h1><h2>Analyse de logo : " + esc(state.entreprise || "Ton entreprise") + "</h2>"
      + "<p><b>Archétype principal : " + esc(state.top.nom) + "</b> — " + esc(state.top.promesse) + "<br>Secondaire : " + esc(state.second.nom) + " — " + esc(state.second.promesse) + "<br>Ombre à éviter : " + esc(state.top.ombre) + "</p>"
      + "<p>Ceci est une piste de travail à valider, pas un diagnostic. Les archétypes sont le vocabulaire de Pearson (1991) et de Mark et Pearson (2001), inspiré de Jung.</p>"
      + "<p><b>Source de l'analyse : " + (state.sourceAnalyse === "ia" ? "IA (Workers AI" + (state.iaModele ? ", " + esc(state.iaModele) : "") + ")" : "locale, par mots-clés") + ".</b></p>"
      + (state.iaAnalyse && state.iaAnalyse.histoire_une_page ? "<h3>Ton histoire, selon l'IA</h3><p>" + esc(state.iaAnalyse.histoire_une_page) + "</p><p><b>Ombre à éviter :</b> " + esc(state.iaAnalyse.ombre) + " · <b>Confiance :</b> " + esc(state.iaAnalyse.confiance) + "</p>" : "")
      + (state.imagePrompt ? "<h3>Prompt image (symbole seulement, sans texte)</h3><p>Pour FLUX, en inspiration seulement — le logo final reste un SVG vectoriel, et ton nom est ajouté en vrai texte, jamais rendu par l'image.</p><p><b>Prompt :</b> " + esc(state.imagePrompt.prompt) + "</p><p><b>Negative prompt :</b> " + esc(state.imagePrompt.negative_prompt) + "</p>" : "")
      + "<h3>Pointage des 12 archétypes</h3><table><tr><th>Archétype</th><th>Points</th><th>Promesse</th></tr>" + rows + "</table>"
      + "<h3>Couleurs, forme, symbole et police choisis</h3><p>" + esc(pal.nom) + " : " + pal.couleurs.join(", ") + " · Forme : " + esc(state.forme) + " · Symbole : " + esc(symboleActuel().def.label) + " · Police : " + esc(state.police) + "</p>"
      + "<h3>Double portrait (Aaker)</h3><p>" + esc(($("aakerResult") || {}).textContent || "") + "</p>"
      + "<h3>Crash-test</h3>" + crash
      + "<h3>Tes réponses</h3>" + state.trace.map(function (t) { return "<p><b>" + esc(t.question.texte) + "</b><br>« " + esc(t.reponse || "") + " »</p>"; }).join("")
      + "<p><small>Loi 25 : cette analyse a été générée localement dans ton navigateur. Aucune réponse n'a été envoyée ni conservée sur un serveur. Pour la faire peaufiner par un pro : info@evolutionpme.ca</small></p></body></html>";
  }
  function downloadAnalysis() {
    if (!state.top) return;
    downloadBlob(new Blob([analysisHTML()], { type: "text/html;charset=utf-8" }), "analyse-logo-" + (state.entreprise || "entreprise").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html");
  }
  function dateDuJour() { return new Date().toISOString().slice(0, 10); }
  function consentementActif() {
    var box = $("consentGarder");
    return !!(box && box.checked);
  }
  function courrielValide(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || ""); }
  async function garderLeadDansCms() {
    /* Appelé SEULEMENT si la case est cochée. Envoie le minimum utile
       à POST /api/cms/logo-lead (Worker, table cms_submissions, D1).
       Si le CMS est indisponible (aperçu local, D1 non liée), on retourne
       false et le courriel dira de garder le lead à la main : on ne
       bloque jamais le courriel du client pour ça. */
    try {
      var res = await fetch("/api/cms/logo-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consentement: true,
          entreprise: state.entreprise,
          courriel: state.consentEmail,
          archetype: state.top.id,
          archetypeSecondaire: state.second ? state.second.id : "",
          secteur: state.secteur,
          clientele: state.clientele,
          dateConsentement: dateDuJour()
        })
      });
      var data = null; try { data = await res.json(); } catch (e) { data = null; }
      if (res.ok && data && data.ok) { state.leadGardeId = data.id; state.leadGardeErreur = ""; return true; }
      state.leadGardeErreur = (data && data.error) || ("Erreur HTTP " + res.status);
      return false;
    } catch (e) { state.leadGardeErreur = "CMS indisponible (réseau ou aperçu local)."; return false; }
  }
  async function mailPro() {
    if (!state.top) return;
    var erreur = $("consentErreur"), statut = $("consentStatut");
    if (erreur) erreur.hidden = true;
    if (statut) statut.hidden = true;
    state.consentement = consentementActif();
    state.consentEmail = (($("consentEmail") || {}).value || "").trim().toLowerCase();
    if (state.consentement && !courrielValide(state.consentEmail)) {
      if (erreur) { erreur.hidden = false; erreur.textContent = "Pour garder tes infos dans le CMS, entre un courriel valide, ou décoche la case."; }
      var champ = $("consentEmail"); if (champ) champ.focus();
      return;
    }
    var date = dateDuJour();
    var garde = false;
    if (state.consentement) garde = await garderLeadDansCms();
    if (statut) {
      statut.hidden = false;
      statut.textContent = state.consentement
        ? (garde ? "Merci ! Ton lead est gardé dans le CMS d'Évolution PME (soumission #" + state.leadGardeId + ")."
          : "Ton courriel part quand même. Le CMS était indisponible (" + state.leadGardeErreur + ") : Daniel gardera ton lead à la main dans le CMS, avec ton consentement.")
        : "Aucune info gardée, comme demandé : ton courriel part seulement, rien n'est conservé dans le CMS.";
    }
    var consentLigne = state.consentement
      ? "Consentement : oui, le " + date + ", source : Créateur de logo — " + (garde ? "lead déjà gardé dans le CMS (soumission #" + state.leadGardeId + ")." : "à garder dans le CMS à la main (" + state.leadGardeErreur + ").")
      : "Consentement : non — rien à garder dans le CMS.";
    var lignes = [
      "Bonjour Évolution PME,",
      "",
      "Je viens de faire le Créateur de logo psychologique pour : " + (state.entreprise || "(entreprise non nommée)"),
      "Secteur : " + (state.secteur || "—") + " · Clientèle : " + (state.clientele || "—"),
      "Archétype : " + state.top.nom + " (secondaire : " + state.second.nom + ")",
      "Couleurs : " + state.palette.couleurs.join(", "),
      "Forme : " + state.forme + " · Symbole : " + symboleActuel().def.label + " · Police : " + state.police,
      "",
      consentLigne,
      state.consentement ? "Courriel du client : " + state.consentEmail : "",
      "",
      "J'aimerais que vous peaufiniez mon logo (vrais fichiers, déclinaisons, charte).",
      "Merci de me revenir avec les prochaines étapes.",
      "",
      "— Analyse générée localement, aucune réponse conservée sur vos serveurs" + (state.consentement ? " (sauf le lead ci-dessus, gardé dans le CMS avec mon consentement)." : ".")
    ];
    location.href = "mailto:" + CFG.contactEmail + "?subject=" + encodeURIComponent("Peaufiner mon logo — " + (state.entreprise || "")) + "&body=" + encodeURIComponent(lignes.filter(function (l) { return l !== ""; }).join("\n"));
  }

  /* ---------- crash-test ---------- */
  function runCrashTest() {
    if (!state.top) return;
    var box = $("crashBox"); if (!box) return;
    box.innerHTML = "<p>Regarde bien ton logo pendant 1 seconde…</p><div class='cl-crash-flash'>" + logoSVG(320) + "</div>";
    setTimeout(function () {
      box.innerHTML = "<p><b>1 seconde, c'est fini.</b> Sans regarder : c'est quoi le secteur de cette entreprise ?</p>"
        + "<label>Secteur deviné <select id='crashSecteur'>" + CFG.secteurs.map(function (s) { return "<option>" + esc(s.label) + "</option>"; }).join("") + "</select></label>"
        + "<label>Ton perçu <select id='crashTon'><option>Chaleureux</option><option>Professionnel</option><option>Audacieux</option><option>Calme</option><option>Joueur</option><option>Prestigieux</option></select></label>"
        + "<label>Confiance que ça t'inspire (1 à 5) <input id='crashConfiance' type='number' min='1' max='5' value='3'></label>"
        + "<label>Qu'est-ce qui t'a marqué en premier ? <input id='crashMarque' type='text' placeholder='La couleur, la forme, le nom...'></label>"
        + "<button type='button' class='button' id='crashSave'>VOIR MON SCORE →</button><div id='crashResult'></div>";
      $("crashSave").addEventListener("click", function () {
        var secteur = $("crashSecteur").value, ton = $("crashTon").value;
        var conf = parseInt($("crashConfiance").value, 10) || 3;
        var marque = $("crashMarque").value || "";
        state.crash = { secteur: secteur, ton: ton, confiance: conf, marque: marque };
        var secteurOk = state.secteur && secteur === (CFG.secteurs.find(function (s) { return s.id === state.secteur; }) || {}).label;
        $("crashResult").innerHTML = "<p><b>Ton score, test local, n = 1 :</b></p><ul>"
          + "<li><b>Mémorabilité :</b> " + (marque ? "tu as retenu quelque chose (« " + esc(marque) + " »). À confirmer avec de vrais clients." : "rien retenu pour l'instant.") + "</li>"
          + "<li><b>Confiance :</b> " + conf + " / 5, selon toi.</li>"
          + "<li><b>Distinctivité :</b> secteur " + (secteurOk ? "bien deviné" : "pas deviné") + ". Si tes clients ne devinent pas ton secteur en 1 seconde, le logo doit être testé, pas juste aimé.</li></ul>"
          + "<p class='cl-note'>Ce n'est pas une preuve. Le vrai crash-test : 20 à 50 personnes de ta clientèle cible, 3 directions, un rapport avant de payer le solde.</p>";
        renderPourquoi();
      });
    }, 1000);
  }

  /* ---------- onglets ---------- */
  function bindTabs() {
    document.querySelectorAll("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var group = btn.getAttribute("data-tab-group") || "depth";
        document.querySelectorAll("[data-tab-group='" + group + "']").forEach(function (b) { b.classList.toggle("active", b === btn); });
        document.querySelectorAll("[data-panel-group='" + group + "']").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== btn.getAttribute("data-tab"); });
      });
    });
  }

  /* ---------- construction des formulaires ---------- */
  function buildForms() {
    var sec = $("secteurSelect");
    if (sec) sec.innerHTML = CFG.secteurs.map(function (s) { return "<option value='" + s.id + "'>" + esc(s.label) + "</option>"; }).join("");
    var secEx = $("secteurExemple");
    function updExemple() {
      var s = CFG.secteurs.find(function (x) { return x.id === sec.value; });
      if (secEx) secEx.textContent = s ? s.exemple : "";
      var autre = $("secteurAutreWrap"); if (autre) autre.hidden = sec.value !== "autre";
    }
    if (sec) { sec.addEventListener("change", updExemple); updExemple(); }
    var cl = $("clienteleChoices");
    if (cl) cl.innerHTML = CFG.clientele.map(function (c, i) { return "<label class='cl-radio'><input type='radio' name='clientele' value='" + esc(c) + "'" + (i === 0 ? " checked" : "") + "> " + esc(c) + "</label>"; }).join("");
    var tl = $("typeChoices");
    if (tl) tl.innerHTML = CFG.typesLogo.map(function (t, i) { return "<label class='cl-radio'><input type='radio' name='typeLogo' value='" + t.id + "'" + (i === 0 ? " checked" : "") + "> <b>" + esc(t.label) + "</b> <small>" + esc(t.description) + "</small></label>"; }).join("");
    var st = $("styleChoices");
    if (st) st.innerHTML = CFG.styles.map(function (s, i) { return "<label class='cl-radio'><input type='radio' name='style' value='" + s.id + "'" + (i === 0 ? " checked" : "") + "> " + esc(s.label) + "</label>"; }).join("");
    var q = $("questionsOuvertes");
    if (q) q.innerHTML = CFG.questionsOuvertes.map(function (qq, i) {
      return "<label class='cl-q'><span>" + (i + 1) + ". " + esc(qq.texte) + "</span><small>" + esc(qq.indice) + "</small><textarea data-q='" + qq.id + "' rows='2' placeholder='Écris comme tu parles...'></textarea></label>";
    }).join("");
    var ex = $("btnExemple");
    if (ex) ex.addEventListener("click", function () {
      $("nomEntreprise").value = "Maison Bien-Être Lueur";
      sec.value = "sante"; updExemple();
      document.querySelector("input[name='clientele'][value='Particuliers']").checked = true;
      document.querySelector("input[name='typeLogo'][value='symbole']").checked = true;
      document.querySelector("input[name='style'][value='classique']").checked = true;
      var exemples = {
        fierte: "Je suis fier quand un client me dit qu'il se sent écouté et en sécurité chez nous, comme à la maison.",
        refus: "Je refuse de bâcler un soin ou de vendre quelque chose dont le client n'a pas besoin, peu importe le prix.",
        soiree: "Elle serait dans un coin tranquille à écouter les gens, avec un thé, et tout le monde viendrait se confier à elle.",
        ressenti: "Calme, en confiance, pris en charge.",
        defi: "Ouvrir ma clinique seule, sans filet, et tenir les deux premières années difficiles.",
        "dix-ans": "Qu'on dise que c'était l'endroit où on se sentait vraiment écouté.",
        animal: "Un chat doux, parce qu'il est calme, il observe, et il vient vers toi quand tu en as besoin.",
        moment: "Le matin, tôt, quand tout est calme et que la lumière entre par la fenêtre.",
        endroit: "La forêt, près d'un lac, ça m'apaise et ça me remet les idées en place."
      };
      document.querySelectorAll("[data-q]").forEach(function (t) { t.value = exemples[t.getAttribute("data-q")] || ""; });
      collect(); analyze(); renderResult(); showStep(3);
    });
  }
  function collect() {
    state.entreprise = ($("nomEntreprise") || {}).value || "";
    state.secteur = ($("secteurSelect") || {}).value || "";
    state.secteurAutre = ($("secteurAutre") || {}).value || "";
    var c = document.querySelector("input[name='clientele']:checked"); state.clientele = c ? c.value : "";
    var t = document.querySelector("input[name='typeLogo']:checked"); state.typeLogo = t ? t.value : "symbole";
    var s = document.querySelector("input[name='style']:checked"); state.style = s ? s.value : "";
    document.querySelectorAll("[data-q]").forEach(function (el) { state.reponses[el.getAttribute("data-q")] = el.value; });
  }

  /* ---------- démarrage ---------- */
  function init() {
    if (!CFG.enabled) { var off = $("creatorDisabled"); if (off) off.hidden = false; return; }
    buildForms(); bindTabs();
    [1, 2, 3].forEach(function (n) {
      var b = $("stepBtn" + n);
      if (b) b.addEventListener("click", function () { collect(); if (n === 3 && !state.top) { showStep(2); return; } showStep(n); });
    });
    var to2 = $("toStep2"); if (to2) to2.addEventListener("click", function () { collect(); showStep(2); });
    var back1 = $("backStep1"); if (back1) back1.addEventListener("click", function () { showStep(1); });
    var go = $("btnAnalyser"); if (go) go.addEventListener("click", async function () {
      collect();
      go.disabled = true; var label0 = go.textContent; go.textContent = "ANALYSE EN COURS…";
      var okIA = await analyserAvecIA();
      if (!okIA) { state.sourceAnalyse = "locale"; state.iaAnalyse = null; state.imagePrompt = null; analyze(); }
      go.disabled = false; go.textContent = label0;
      renderResult(); showStep(3);
    });
    var back2 = $("backStep2"); if (back2) back2.addEventListener("click", function () { showStep(2); });
    var restart = $("btnRecommencer"); if (restart) restart.addEventListener("click", function () { showStep(1); });
    document.addEventListener("click", function (e) {
      var pal = e.target.closest("[data-pal]");
      if (pal) { state.paletteIdx = parseInt(pal.getAttribute("data-pal"), 10); state.palette = palettesFor(state.top)[state.paletteIdx]; renderEditor(); renderLogo(); renderPourquoi(); return; }
      var fo = e.target.closest("[data-forme]");
      if (fo) { state.forme = fo.getAttribute("data-forme"); renderEditor(); renderLogo(); renderPourquoi(); return; }
      var po = e.target.closest("[data-police]");
      if (po) { state.police = po.getAttribute("data-police"); renderEditor(); renderLogo(); renderPourquoi(); return; }
      var bg = e.target.closest("[data-bg]");
      if (bg) { state.previewBg = bg.getAttribute("data-bg"); document.querySelectorAll("[data-bg]").forEach(function (b) { b.classList.toggle("active", b === bg); }); renderLogo(); return; }
    });
    document.addEventListener("input", function (e) {
      var a = e.target.closest("[data-aaker]");
      if (a) {
        var parts = a.getAttribute("data-aaker").split(":");
        if (parts[0] === "fondateur") state.aakerFondateur[parts[1]] = parseInt(a.value, 10);
        else state.aakerClient[parts[1]] = parseInt(a.value, 10);
        renderAaker();
      }
    });
    /* Case « garder mes infos dans le CMS » : décochée par défaut, jamais
       obligatoire. Le champ courriel n'apparaît que si elle est cochée. */
    var consentTxt = $("consentTexte");
    if (consentTxt && CFG.conservation && CFG.conservation.texte) consentTxt.textContent = CFG.conservation.texte;
    var consentLbl = $("consentEmailLabel");
    if (consentLbl && CFG.conservation && CFG.conservation.labelCourriel) consentLbl.textContent = CFG.conservation.labelCourriel;
    var consentNote = $("consentNote");
    if (consentNote && CFG.conservation && CFG.conservation.note) consentNote.textContent = CFG.conservation.note;
    var consentBox = $("consentGarder");
    if (consentBox) consentBox.addEventListener("change", function () {
      var wrap = $("consentEmailWrap"); if (wrap) wrap.hidden = !consentBox.checked;
      var erreur = $("consentErreur"); if (erreur) erreur.hidden = true;
    });
    var symSel = $("symboleSelect");
    if (symSel) symSel.addEventListener("change", function () { state.pictogramme = symSel.value; renderLogo(); renderPourquoi(); });
    var pngT = $("btnPngTransparent"); if (pngT) pngT.addEventListener("click", function () { exportPNG(true); });
    var pngB = $("btnPngBlanc"); if (pngB) pngB.addEventListener("click", function () { exportPNG(false); });
    var dl = $("btnDlAnalyse"); if (dl) dl.addEventListener("click", downloadAnalysis);
    var pro = $("btnPro"); if (pro) pro.addEventListener("click", mailPro);
    var crash = $("btnCrash"); if (crash) crash.addEventListener("click", runCrashTest);
    showStep(1);
  }
  window.EVOPME_LOGO_TEST = { SYMBOLES: SYMBOLES, choisirSymbole: choisirSymbole, symboleActuel: symboleActuel, logoSVG: logoSVG, state: state };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
