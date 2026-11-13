/* ============================================================================
 * Créateur de logo psychologique — Évolution PME
 * Logique 100 % locale. AUCUNE donnée ne quitte le navigateur :
 * pas d'envoi serveur, pas de base de données, pas de liste de leads.
 * La seule transmission, c'est le mailto vers info@evolutionpme.ca quand
 * le client clique lui-même « Fais-le peaufiner par un pro ».
 * Règle Loi 25 : courriel seulement, on ne garde pas les infos.
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

  /* ---------- état ---------- */
  var state = {
    step: 1,
    entreprise: "", secteur: "", secteurAutre: "", clientele: "", typeLogo: "symbole", style: "",
    reponses: {}, aakerFondateur: {}, aakerClient: {},
    scores: null, top: null, second: null, trace: [],
    paletteIdx: 0, forme: "", police: "", palette: null,
    crash: null, previewBg: "blanc"
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
    state.top = ranked[0]; state.second = ranked[1];
    state.palette = palettesFor(state.top)[0]; state.paletteIdx = 0;
    state.forme = state.top.formes[0]; state.police = state.top.polices[0];
  }

  /* ---------- SVG du logo ---------- */
  function shapeMarkup(forme, couleur, lettre) {
    var fill = couleur, ink = isLight(couleur) ? "#111111" : "#ffffff";
    switch (forme) {
      case "bouclier": return '<path d="M100 18 L168 44 V102 C168 144 136 170 100 182 C64 170 32 144 32 102 V44 Z" fill="' + fill + '"/><text x="100" y="112" text-anchor="middle" font-size="52" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
      case "losange": return '<polygon points="100,18 182,88 100,158 18,88" fill="' + fill + '"/><text x="100" y="106" text-anchor="middle" font-size="48" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
      case "vague": return '<path d="M18 108 C48 62 78 142 100 104 C122 66 152 142 182 104 L182 160 L18 160 Z" fill="' + fill + '"/><text x="100" y="82" text-anchor="middle" font-size="48" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
      case "etoile": return '<polygon points="100,14 122,72 184,72 134,108 152,170 100,132 48,170 66,108 16,72 78,72" fill="' + fill + '"/><text x="100" y="112" text-anchor="middle" font-size="34" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
      case "hexagone": return '<polygon points="100,16 172,58 172,124 100,166 28,124 28,58" fill="' + fill + '"/><text x="100" y="106" text-anchor="middle" font-size="48" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
      case "fleche": return '<polygon points="18,52 118,52 118,22 184,92 118,162 118,132 18,132" fill="' + fill + '"/><text x="78" y="108" text-anchor="middle" font-size="42" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
      case "goutte": return '<path d="M100 16 C100 16 168 92 168 122 A68 68 0 1 1 32 122 C32 92 100 16 100 16 Z" fill="' + fill + '"/><text x="100" y="138" text-anchor="middle" font-size="46" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
      default: return '<circle cx="100" cy="88" r="70" fill="' + fill + '"/><text x="100" y="106" text-anchor="middle" font-size="52" font-weight="bold" fill="' + ink + '" font-family="Arial, sans-serif">' + esc(lettre) + '</text>';
    }
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
      + (bg !== "none" ? '<rect width="200" height="200" fill="' + bg + '"/>' : '')
      + shapeMarkup(state.forme, pal.couleurs[0], initials(nom))
      + '<text x="100" y="196" text-anchor="middle" font-size="13" font-weight="bold" fill="' + textColor + '" font-family="' + esc(font) + '">' + esc(nom.toUpperCase()) + '</text>'
      + '</svg>';
    return svg;
  }
  function renderLogo() {
    var box = $("logoPreview"); if (!box || !state.top) return;
    box.innerHTML = logoSVG(640);
    var cap = $("logoCaption");
    if (cap) cap.textContent = (state.entreprise || "Ton entreprise") + " — " + state.top.nom + " · " + state.palette.nom + " · " + (CFG.formes.find(function (f) { return f.id === state.forme; }) || {}).label + " · " + state.police;
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
    $("resArchetype").innerHTML = "<b>" + esc(state.top.nom) + "</b><p>Ton logo raconte surtout l'histoire du " + esc(state.top.nom) + " : " + esc(state.top.promesse) + "</p><p>En deuxième : <b>" + esc(state.second.nom) + "</b> — " + esc(state.second.promesse) + "</p><p class='cl-note'>Ombre à éviter : " + esc(state.top.ombre) + "</p>";
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
    html += "<h4>1. Tes choix fermés</h4><ul><li><b>Secteur et clientèle : 0 point.</b> Ils ne scorent pas, ils cadrent le contexte. Un même archétype ne donne pas le même logo en restauration et en services professionnels.</li>";
    var style = CFG.styles.find(function (s) { return s.id === state.style; });
    html += "<li><b>Style visuel (" + esc(style ? style.label : "—") + ") : +3 points</b> vers " + esc(style && style.boost.length ? style.boost.map(function (id) { return archById(id).nom; }).join(", ") : "aucun archétype") + ".</li>";
    html += "<li><b>Type de logo : " + esc(state.typeLogo) + ".</b> Ça change la forme du logo, pas l'archétype.</li></ul>";
    html += "<h4>2. Tes 9 réponses, une par une</h4>";
    state.trace.forEach(function (t) {
      html += "<div class='cl-trace'><p><b>" + esc(t.question.texte) + "</b></p><blockquote>« " + esc(t.reponse || "(pas de réponse)") + " »</blockquote>";
      if (!t.found.length) html += "<p class='cl-note'>Aucun mot-clé détecté ici. Cette réponse n'a pas changé le pointage, et c'est normal : le questionnaire est un déclencheur de conversation, pas un détecteur parfait.</p>";
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
    html += "<h4>4. Ta forme et ta police</h4><p><b>" + esc(formeMeta.label || state.forme) + "</b> — " + esc(formeMeta.description || "") + " <b>Police : " + esc(state.police) + ".</b> La forme et la police doivent rester congruentes avec l'archétype " + esc(state.top.nom) + ", sinon le logo envoie deux messages en même temps.</p>";
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
      + "<h3>Pointage des 12 archétypes</h3><table><tr><th>Archétype</th><th>Points</th><th>Promesse</th></tr>" + rows + "</table>"
      + "<h3>Couleurs, forme et police choisies</h3><p>" + esc(pal.nom) + " : " + pal.couleurs.join(", ") + " · Forme : " + esc(state.forme) + " · Police : " + esc(state.police) + "</p>"
      + "<h3>Double portrait (Aaker)</h3><p>" + esc(($("aakerResult") || {}).textContent || "") + "</p>"
      + "<h3>Crash-test</h3>" + crash
      + "<h3>Tes réponses</h3>" + state.trace.map(function (t) { return "<p><b>" + esc(t.question.texte) + "</b><br>« " + esc(t.reponse || "") + " »</p>"; }).join("")
      + "<p><small>Loi 25 : cette analyse a été générée localement dans ton navigateur. Aucune réponse n'a été envoyée ni conservée sur un serveur. Pour la faire peaufiner par un pro : info@evolutionpme.ca</small></p></body></html>";
  }
  function downloadAnalysis() {
    if (!state.top) return;
    downloadBlob(new Blob([analysisHTML()], { type: "text/html;charset=utf-8" }), "analyse-logo-" + (state.entreprise || "entreprise").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html");
  }
  function mailPro() {
    if (!state.top) return;
    var lignes = [
      "Bonjour Évolution PME,",
      "",
      "Je viens de faire le Créateur de logo psychologique pour : " + (state.entreprise || "(entreprise non nommée)"),
      "Secteur : " + (state.secteur || "—") + " · Clientèle : " + (state.clientele || "—"),
      "Archétype : " + state.top.nom + " (secondaire : " + state.second.nom + ")",
      "Couleurs : " + state.palette.couleurs.join(", "),
      "Forme : " + state.forme + " · Police : " + state.police,
      "",
      "J'aimerais que vous peaufiniez mon logo (vrais fichiers, déclinaisons, charte).",
      "Merci de me revenir avec les prochaines étapes.",
      "",
      "— Analyse générée localement, aucune réponse conservée sur vos serveurs."
    ];
    location.href = "mailto:" + CFG.contactEmail + "?subject=" + encodeURIComponent("Peaufiner mon logo — " + (state.entreprise || "")) + "&body=" + encodeURIComponent(lignes.join("\n"));
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
    var go = $("btnAnalyser"); if (go) go.addEventListener("click", function () { collect(); analyze(); renderResult(); showStep(3); });
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
    var pngT = $("btnPngTransparent"); if (pngT) pngT.addEventListener("click", function () { exportPNG(true); });
    var pngB = $("btnPngBlanc"); if (pngB) pngB.addEventListener("click", function () { exportPNG(false); });
    var dl = $("btnDlAnalyse"); if (dl) dl.addEventListener("click", downloadAnalysis);
    var pro = $("btnPro"); if (pro) pro.addEventListener("click", mailPro);
    var crash = $("btnCrash"); if (crash) crash.addEventListener("click", runCrashTest);
    showStep(1);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
