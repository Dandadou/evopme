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


  /* ---------- symbole créé, jamais une icône de banque ---------------
     Règle de Daniel (2026-11-16) : « Non c'est L'IA qui doit Créer
     quelque chose selon les Questions ». Il n'y a donc PLUS de banque
     de 39 pictogrammes préfaits : le symbole est CRÉÉ pour chaque
     client, à partir de ses réponses.
     - Par l'IA : elle renvoie une spec (2 à 6 formes géométriques
       simples dans une boîte 100 x 100, couleurs = rôles de la palette).
     - En repli local : le compositeur assemble des BRIQUES de base
       (maison, soleil, coeur...) selon les mots du questionnaire —
       des briques, pas des logos finis : la même maison + un soleil
       n'est pas le même logo qu'une maison + un coeur.
     Une spec = { nom, description, elements: [...], sources: [...] }.
     Un élément = { type: cercle|ellipse|rect|triangle|ligne,
       ...coordonnées 0-100..., couleur: dominante|appui|accent|fond }.
     Jamais de texte, jamais de lettre, jamais de noir pur : les
     éléments prennent uniquement les couleurs de la palette. */
  function couleurRole(role, pal, fond) {
    if (role === "dominante") return pal.couleurs[0];
    if (role === "appui") return pal.couleurs[1] || pal.couleurs[0];
    if (role === "accent") return pal.couleurs[2] || pal.couleurs[1] || pal.couleurs[0];
    return fond || "#ffffff"; /* "fond" = couleur du contenant */
  }
  function num(v, def) { var n = parseFloat(v); return isFinite(n) ? n : def; }
  function renderElement(el, pal, fond) {
    if (!el || typeof el !== "object") return "";
    var c = couleurRole(el.couleur, pal, fond);
    function cl(v) { return Math.max(0, Math.min(100, num(v, 0))); }
    switch (el.type) {
      case "cercle": return '<circle cx="' + cl(el.cx) + '" cy="' + cl(el.cy) + '" r="' + Math.max(2, Math.min(50, num(el.r, 10))) + '" fill="' + c + '"/>';
      case "ellipse": return '<ellipse cx="' + cl(el.cx) + '" cy="' + cl(el.cy) + '" rx="' + Math.max(2, Math.min(50, num(el.rx, 10))) + '" ry="' + Math.max(2, Math.min(50, num(el.ry, 10))) + '" fill="' + c + '"/>';
      case "rect": return '<rect x="' + cl(el.x) + '" y="' + cl(el.y) + '" width="' + Math.max(4, Math.min(100, num(el.w, 20))) + '" height="' + Math.max(4, Math.min(100, num(el.h, 20))) + '" rx="' + Math.max(0, Math.min(20, num(el.rx, 0))) + '" fill="' + c + '"/>';
      case "triangle": {
        var pts = String(el.points || "").split(/[\s,]+/).filter(Boolean).map(Number);
        if (pts.length !== 6 || pts.some(function (v) { return !isFinite(v); })) return "";
        return '<polygon points="' + pts.map(function (v) { return Math.max(0, Math.min(100, v)); }).join(",") + '" fill="' + c + '"/>';
      }
      case "ligne": return '<line x1="' + cl(el.x1) + '" y1="' + cl(el.y1) + '" x2="' + cl(el.x2) + '" y2="' + cl(el.y2) + '" stroke="' + c + '" stroke-width="' + Math.max(2, Math.min(10, num(el.epaisseur, 4))) + '" stroke-linecap="round"/>';
      default: return "";
    }
  }
  function renderSymboleSpec(spec, pal, fond) {
    if (!spec || !Array.isArray(spec.elements)) return "";
    return spec.elements.map(function (el) { return renderElement(el, pal, fond); }).join("");
  }
  /* Briques de construction : des formes de base, paramétrées par les
     rôles de couleur, jamais des logos finis. Chaque brique retourne
     ses éléments dans la boîte 100 x 100. */
  var BRIQUES = {
    maison: { label: "Maison", desc: "Une maison qui accueille.", elements: function () { return [
      { type: "rect", x: 18, y: 52, w: 64, h: 38, couleur: "dominante" },
      { type: "triangle", points: "10,56 50,22 90,56", couleur: "appui" },
      { type: "rect", x: 44, y: 68, w: 12, h: 22, couleur: "fond" }]; } },
    soleil: { label: "Soleil", desc: "Un soleil qui se lève.", elements: function () { return [
      { type: "cercle", cx: 50, cy: 46, r: 16, couleur: "accent" },
      { type: "ligne", x1: 50, y1: 14, x2: 50, y2: 24, epaisseur: 5, couleur: "accent" },
      { type: "ligne", x1: 50, y1: 68, x2: 50, y2: 78, epaisseur: 5, couleur: "accent" },
      { type: "ligne", x1: 18, y1: 46, x2: 28, y2: 46, epaisseur: 5, couleur: "accent" },
      { type: "ligne", x1: 82, y1: 46, x2: 72, y2: 46, epaisseur: 5, couleur: "accent" }]; } },
    coeur: { label: "Coeur", desc: "Un coeur : on tient à toi.", elements: function () { return [
      { type: "cercle", cx: 35, cy: 38, r: 16, couleur: "dominante" },
      { type: "cercle", cx: 65, cy: 38, r: 16, couleur: "dominante" },
      { type: "triangle", points: "20,46 80,46 50,84", couleur: "dominante" }]; } },
    feuille: { label: "Feuille", desc: "Une feuille : nature, ça pousse.", elements: function () { return [
      { type: "ellipse", cx: 50, cy: 50, rx: 26, ry: 36, couleur: "dominante" },
      { type: "ligne", x1: 50, y1: 22, x2: 50, y2: 82, epaisseur: 4, couleur: "fond" }]; } },
    voiture: { label: "Voiture", desc: "Une auto en un geste : route, vitesse.", elements: function () { return [
      { type: "rect", x: 8, y: 52, w: 84, h: 20, rx: 6, couleur: "dominante" },
      { type: "rect", x: 28, y: 36, w: 40, h: 18, rx: 4, couleur: "appui" },
      { type: "cercle", cx: 30, cy: 74, r: 9, couleur: "fond" },
      { type: "cercle", cx: 70, cy: 74, r: 9, couleur: "fond" }]; } },
    camion: { label: "Camion", desc: "Un camion : transport, livraison, route.", elements: function () { return [
      { type: "rect", x: 8, y: 30, w: 46, h: 36, couleur: "dominante" },
      { type: "triangle", points: "54,42 82,42 92,66 54,66", couleur: "appui" },
      { type: "cercle", cx: 28, cy: 72, r: 9, couleur: "fond" },
      { type: "cercle", cx: 72, cy: 72, r: 9, couleur: "fond" }]; } },
    cloche: { label: "Cloche de service", desc: "La cloche du resto : on sert, c'est chaud.", elements: function () { return [
      { type: "ellipse", cx: 50, cy: 54, rx: 32, ry: 24, couleur: "dominante" },
      { type: "rect", x: 12, y: 74, w: 76, h: 8, rx: 3, couleur: "dominante" },
      { type: "cercle", cx: 50, cy: 26, r: 5, couleur: "accent" }]; } },
    casque: { label: "Casque de chantier", desc: "Le casque : on bâtit solide, en sécurité.", elements: function () { return [
      { type: "ellipse", cx: 50, cy: 52, rx: 34, ry: 26, couleur: "dominante" },
      { type: "rect", x: 12, y: 72, w: 76, h: 8, rx: 3, couleur: "appui" },
      { type: "rect", x: 46, y: 28, w: 8, h: 40, couleur: "fond" }]; } },
    sac: { label: "Sac de boutique", desc: "Un sac : commerce, on repart avec quelque chose.", elements: function () { return [
      { type: "triangle", points: "24,38 76,38 84,86 16,86", couleur: "dominante" },
      { type: "rect", x: 38, y: 24, w: 24, h: 6, rx: 3, couleur: "appui" }]; } },
    puce: { label: "Puce électronique", desc: "Une puce : technologie, ça connecte.", elements: function () { return [
      { type: "rect", x: 28, y: 28, w: 44, h: 44, rx: 6, couleur: "dominante" },
      { type: "rect", x: 42, y: 42, w: 16, h: 16, couleur: "fond" },
      { type: "rect", x: 44, y: 12, w: 6, h: 12, couleur: "appui" },
      { type: "rect", x: 44, y: 76, w: 6, h: 12, couleur: "appui" }]; } },
    graphique: { label: "Graphique en hausse", desc: "Des barres qui montent : ça grandit.", elements: function () { return [
      { type: "rect", x: 18, y: 58, w: 14, h: 30, couleur: "dominante" },
      { type: "rect", x: 43, y: 44, w: 14, h: 44, couleur: "dominante" },
      { type: "rect", x: 68, y: 28, w: 14, h: 60, couleur: "dominante" },
      { type: "ligne", x1: 18, y1: 52, x2: 84, y2: 18, epaisseur: 5, couleur: "accent" }]; } },
    haltere: { label: "Haltère", desc: "Un haltère : sport, force, on se dépasse.", elements: function () { return [
      { type: "rect", x: 28, y: 46, w: 44, h: 8, couleur: "dominante" },
      { type: "rect", x: 12, y: 32, w: 13, h: 36, rx: 3, couleur: "dominante" },
      { type: "rect", x: 75, y: 32, w: 13, h: 36, rx: 3, couleur: "dominante" },
      { type: "rect", x: 25, y: 40, w: 6, h: 20, couleur: "accent" },
      { type: "rect", x: 69, y: 40, w: 6, h: 20, couleur: "accent" }]; } },
    vague: { label: "Vagues", desc: "Des vagues : fluide, apaisant.", elements: function () { return [
      { type: "ligne", x1: 12, y1: 34, x2: 88, y2: 34, epaisseur: 7, couleur: "dominante" },
      { type: "ligne", x1: 12, y1: 54, x2: 88, y2: 54, epaisseur: 7, couleur: "appui" },
      { type: "ligne", x1: 12, y1: 74, x2: 88, y2: 74, epaisseur: 7, couleur: "dominante" }]; } },
    fleur: { label: "Fleur", desc: "Une fleur : beauté, douceur.", elements: function () { return [
      { type: "cercle", cx: 50, cy: 24, r: 12, couleur: "dominante" },
      { type: "cercle", cx: 50, cy: 76, r: 12, couleur: "dominante" },
      { type: "cercle", cx: 24, cy: 50, r: 12, couleur: "dominante" },
      { type: "cercle", cx: 76, cy: 50, r: 12, couleur: "dominante" },
      { type: "cercle", cx: 50, cy: 50, r: 12, couleur: "accent" }]; } },
    livre: { label: "Livre", desc: "Un livre ouvert : savoir.", elements: function () { return [
      { type: "rect", x: 12, y: 26, w: 34, h: 52, rx: 3, couleur: "dominante" },
      { type: "rect", x: 54, y: 26, w: 34, h: 52, rx: 3, couleur: "appui" },
      { type: "ligne", x1: 50, y1: 26, x2: 50, y2: 78, epaisseur: 4, couleur: "fond" }]; } },
    montagne: { label: "Montagne", desc: "Une montagne : horizon, plein air.", elements: function () { return [
      { type: "triangle", points: "6,88 38,30 62,66 74,48 94,88", couleur: "dominante" },
      { type: "cercle", cx: 74, cy: 20, r: 9, couleur: "accent" }]; } },
    patte: { label: "Patte", desc: "Une patte : animaux, on en prend soin.", elements: function () { return [
      { type: "ellipse", cx: 50, cy: 68, rx: 22, ry: 15, couleur: "dominante" },
      { type: "cercle", cx: 26, cy: 44, r: 9, couleur: "dominante" },
      { type: "cercle", cx: 42, cy: 32, r: 9, couleur: "dominante" },
      { type: "cercle", cx: 58, cy: 32, r: 9, couleur: "dominante" },
      { type: "cercle", cx: 74, cy: 44, r: 9, couleur: "dominante" }]; } },
    note: { label: "Note de musique", desc: "Une note : fête, musique.", elements: function () { return [
      { type: "cercle", cx: 36, cy: 76, r: 11, couleur: "dominante" },
      { type: "rect", x: 45, y: 24, w: 6, h: 54, couleur: "dominante" },
      { type: "triangle", points: "51,24 74,30 70,48 51,42", couleur: "appui" }]; } },
    "bouclier-coeur": { label: "Bouclier et coeur", desc: "Un bouclier avec un coeur : on protège.", elements: function () { return [
      { type: "triangle", points: "50,10 86,24 86,54 50,90 14,54 14,24", couleur: "dominante" },
      { type: "cercle", cx: 41, cy: 46, r: 10, couleur: "accent" },
      { type: "cercle", cx: 59, cy: 46, r: 10, couleur: "accent" },
      { type: "triangle", points: "32,50 68,50 50,72", couleur: "accent" }]; } }
  };
  var SECTEUR_BRIQUES = {
    restauration: "cloche", construction: "casque", mecanique: "voiture",
    sante: "coeur", beaute: "fleur", "services-pro": "livre",
    immobilier: "maison", detail: "sac", mode: "fleur", agro: "feuille",
    education: "livre", arts: "fleur", techno: "puce",
    finance: "graphique", tourisme: "montagne", domicile: "maison",
    animaux: "patte", sport: "haltere", evenementiel: "note",
    obnl: "coeur", transport: "camion", autre: ""
  };
  var ARCHETYPE_BRIQUES = {
    innocent: "soleil", sage: "livre", explorateur: "montagne",
    rebelle: "soleil", magicien: "soleil", heros: "montagne",
    amoureux: "coeur", bouffon: "soleil", "homme-ordinaire": "maison",
    protecteur: "bouclier-coeur", souverain: "montagne", createur: "soleil"
  };
  var MOTS_BRIQUES = [
    { mots: ["maison", "foyer"], brique: "maison" },
    { mots: ["lueur", "lumiere", "soleil", "aurore"], brique: "soleil" },
    { mots: ["coeur", "amour", "soin", "sante", "ecoute"], brique: "coeur" },
    { mots: ["voiture", "auto", "garage", "carrosserie", "mecanique"], brique: "voiture" },
    { mots: ["camion", "livraison", "transport", "route"], brique: "camion" },
    { mots: ["dent"], brique: "coeur" },
    { mots: ["cafe", "the"], brique: "soleil" },
    { mots: ["arbre", "foret", "bois", "lac", "riviere"], brique: "feuille" },
    { mots: ["mer", "ocean", "plage"], brique: "vague" },
    { mots: ["montagne"], brique: "montagne" },
    { mots: ["fleur", "jardin"], brique: "fleur" },
    { mots: ["livre", "lecture", "enseigner", "formation", "apprendre"], brique: "livre" },
    { mots: ["musique", "chanson", "dj", "fete"], brique: "note" },
    { mots: ["avion", "voyage"], brique: "soleil" },
    { mots: ["vetement", "mode", "couture"], brique: "fleur" },
    { mots: ["argent", "banque", "finance", "assurance"], brique: "montagne" },
    { mots: ["outil", "bricolage", "renovation"], brique: "casque" },
    { mots: ["restaurant", "resto", "cuisine", "pain", "boulangerie"], brique: "cloche" },
    { mots: ["boutique", "commerce", "magasin"], brique: "sac" },
    { mots: ["technologie", "numerique", "informatique", "logiciel"], brique: "puce" },
    { mots: ["finance", "investissement"], brique: "graphique" },
    { mots: ["sport", "gym", "entrainement", "course"], brique: "haltere" }
  ];
  /* Replace un élément dans la boîte : échelle puis décalage. */
  function placer(elements, echelle, dx, dy) {
    function X(v) { return Math.round((num(v, 0) * echelle + dx) * 10) / 10; }
    function Y(v) { return Math.round((num(v, 0) * echelle + dy) * 10) / 10; }
    function S(v) { return Math.round(num(v, 0) * echelle * 10) / 10; }
    return elements.map(function (el) {
      var n = { type: el.type, couleur: el.couleur };
      if (el.type === "cercle") { n.cx = X(el.cx); n.cy = Y(el.cy); n.r = S(el.r); }
      else if (el.type === "ellipse") { n.cx = X(el.cx); n.cy = Y(el.cy); n.rx = S(el.rx); n.ry = S(el.ry); }
      else if (el.type === "rect") { n.x = X(el.x); n.y = Y(el.y); n.w = S(el.w); n.h = S(el.h); if (el.rx) n.rx = S(el.rx); }
      else if (el.type === "triangle") {
        var pts = String(el.points || "").split(/[\s,]+/).filter(Boolean).map(Number);
        n.points = pts.map(function (v, i) { return i % 2 === 0 ? X(v) : Y(v); }).join(",");
      }
      else if (el.type === "ligne") { n.x1 = X(el.x1); n.y1 = Y(el.y1); n.x2 = X(el.x2); n.y2 = Y(el.y2); n.epaisseur = Math.max(2, Math.round(num(el.epaisseur, 4) * echelle)); }
      return n;
    });
  }
  /* Compositeur local : il ASSEMBLE un symbole à partir des mots du
     questionnaire. La réponse « animal » ne décide pas du symbole :
     dire « un chat », c'est un signal d'archétype, pas un métier.
     Le symbole vient du nom, du secteur et des 8 autres réponses. */
  function composerSymboleLocal(themeForce) {
    var txt = norm([state.entreprise, state.secteurAutre].concat(CFG.questionsOuvertes.filter(function (q) { return q.id !== "animal"; }).map(function (q) { return state.reponses[q.id] || ""; })).join(" "));
    var principal = null, secondaire = null, sources = [];
    var i, j, r;
    if (themeForce && BRIQUES[themeForce]) {
      principal = themeForce;
      sources.push("Thème choisi dans l'éditeur : " + BRIQUES[themeForce].label + ".");
    } else {
      for (i = 0; i < MOTS_BRIQUES.length; i++) {
        r = MOTS_BRIQUES[i];
        for (j = 0; j < r.mots.length; j++) {
          if (txt.indexOf(r.mots[j]) !== -1) {
            if (!principal) { principal = r.brique; sources.push("Mot détecté : « " + r.mots[j] + " » → " + BRIQUES[r.brique].label + "."); }
            else if (r.brique !== principal && !secondaire) { secondaire = r.brique; sources.push("Mot détecté : « " + r.mots[j] + " » → " + BRIQUES[r.brique].label + "."); }
            break;
          }
        }
      }
      if (!principal) principal = SECTEUR_BRIQUES[state.secteur] || "";
      if (!principal && state.top) principal = ARCHETYPE_BRIQUES[state.top.id] || "soleil";
      if (!principal) principal = "soleil";
      if (!secondaire && state.top) {
        var rep = ARCHETYPE_BRIQUES[state.top.id];
        if (rep && rep !== principal) secondaire = rep;
      }
      if (!secondaire && principal === "maison") secondaire = "soleil";
    }
    var elements = placer(BRIQUES[principal].elements(), 0.72, 14, 18);
    /* Deux briques au maximum : 10 éléments simples au plus, jamais plus. */
    if (secondaire && BRIQUES[secondaire]) elements = elements.concat(placer(BRIQUES[secondaire].elements(), 0.30, 62, 2));
    var nom = BRIQUES[principal].label + (secondaire ? " et " + BRIQUES[secondaire].label.toLowerCase() : "");
    return {
      nom: nom,
      description: "Symbole composé à partir de tes réponses : " + BRIQUES[principal].desc + (secondaire ? " " + BRIQUES[secondaire].desc : ""),
      elements: elements,
      sources: sources,
      origine: "locale"
    };
  }
  function symboleActuel() {
    /* 1) Thème forcé dans l'éditeur, 2) symbole créé par l'IA,
       3) symbole composé localement à partir des réponses. */
    if (state.themeSymbole) return composerSymboleLocal(state.themeSymbole);
    if (state.symbole && Array.isArray(state.symbole.elements) && state.symbole.elements.length) return state.symbole;
    return composerSymboleLocal("");
  }


  /* ---------- état ---------- */
  var state = {
    step: 1,
    entreprise: "", secteur: "", secteurAutre: "", clientele: "", typeLogo: "symbole", style: "",
    reponses: {}, aakerFondateur: {}, aakerClient: {},
    scores: null, top: null, second: null, trace: [],
    paletteIdx: 0, forme: "", police: "", palette: null, symbole: null, themeSymbole: "",
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
    state.top = ranked[0]; state.second = ranked[1]; state.symbole = null; state.themeSymbole = "";
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
    state.symbole = (a.symbole && Array.isArray(a.symbole.elements) && a.symbole.elements.length) ? a.symbole : null;
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
      var contenant = state.forme === "vague" ? shade(pal.couleurs[0], 70) : pal.couleurs[0];
      svg += shapeMarkup(state.forme, contenant, "");
      svg += '<g transform="translate(62,52) scale(0.76)">' + renderSymboleSpec(sym, pal, contenant) + '</g>';
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
    if (cap) cap.textContent = (state.entreprise || "Ton entreprise") + " — " + state.top.nom + " · Symbole : " + symboleActuel().nom + " · " + state.palette.nom + " · " + (CFG.formes.find(function (f) { return f.id === state.forme; }) || {}).label + " · " + state.police;
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
      var cur = state.themeSymbole || "";
      symSel.innerHTML = '<option value="">Laisser l\'IA / le questionnaire créer le symbole</option>' + Object.keys(BRIQUES).map(function (id) {
        return '<option value="' + id + '"' + (id === cur ? " selected" : "") + '>' + esc(BRIQUES[id].label) + " — " + esc(BRIQUES[id].desc) + "</option>";
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
    html += "<h4>4. Ton symbole, ta forme et ta police</h4><p><b>Symbole : " + esc(sym.nom) + "</b> — " + esc(sym.description || "") + " Un logo qui ne représente rien, on le refuse : le symbole doit dire ton secteur ou ta personnalité en 1 seconde.</p>";
    if (sym.sources && sym.sources.length) html += "<p class='cl-note'>Ce symbole vient de tes mots : " + esc(sym.sources.join(" ")) + "</p>";
    if (sym.origine === "ia") html += "<p class='cl-note'>Symbole créé par l'IA à partir de tes réponses, pas choisi dans une banque d'icônes.</p>";
    html += "<p><b>" + esc(formeMeta.label || state.forme) + "</b> — " + esc(formeMeta.description || "") + " <b>Police : " + esc(state.police) + ".</b> La forme et la police doivent rester congruentes avec l'archétype " + esc(state.top.nom) + ", sinon le logo envoie deux messages en même temps.</p>";
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
      + "<h3>Couleurs, forme, symbole et police choisis</h3><p>" + esc(pal.nom) + " : " + pal.couleurs.join(", ") + " · Forme : " + esc(state.forme) + " · Symbole : " + esc(symboleActuel().nom) + " · Police : " + esc(state.police) + "</p>"
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
      "Forme : " + state.forme + " · Symbole : " + symboleActuel().nom + " · Police : " + state.police,
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
    if (symSel) symSel.addEventListener("change", function () { state.themeSymbole = symSel.value; renderLogo(); renderPourquoi(); });
    var pngT = $("btnPngTransparent"); if (pngT) pngT.addEventListener("click", function () { exportPNG(true); });
    var pngB = $("btnPngBlanc"); if (pngB) pngB.addEventListener("click", function () { exportPNG(false); });
    var dl = $("btnDlAnalyse"); if (dl) dl.addEventListener("click", downloadAnalysis);
    var pro = $("btnPro"); if (pro) pro.addEventListener("click", mailPro);
    var crash = $("btnCrash"); if (crash) crash.addEventListener("click", runCrashTest);
    showStep(1);
  }
  window.EVOPME_LOGO_TEST = { renderSymboleSpec: renderSymboleSpec, composerSymboleLocal: composerSymboleLocal, symboleActuel: symboleActuel, logoSVG: logoSVG, state: state };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
