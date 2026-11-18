/* Archétype — visualisation vectorielle locale, même si Workers AI est indisponible.
   Ce sont des esquisses SVG paramétriques, pas des illustrations produites par l'IA. */
(function () {
  "use strict";
  const escape = s => String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hash = s => [...String(s)].reduce((a,c) => (Math.imul(a,31)+c.charCodeAt(0))|0, 7) >>> 0;
  const motifs = [
    '<path d="M120 170 C40 135 42 70 120 38 C198 70 200 135 120 170 Z" fill="none" stroke="ACCENT" stroke-width="10"/><path d="M120 153 C86 117 95 81 120 58 C145 81 154 117 120 153Z" fill="SECOND"/>',
    '<path d="M120 32 C168 76 168 124 120 169 C72 124 72 76 120 32Z" fill="none" stroke="ACCENT" stroke-width="10"/><circle cx="120" cy="100" r="28" fill="SECOND"/><circle cx="120" cy="100" r="10" fill="BG"/>',
    '<path d="M49 133 C78 40 154 45 191 133" fill="none" stroke="ACCENT" stroke-width="13" stroke-linecap="round"/><path d="M62 155 Q120 100 178 155" fill="none" stroke="SECOND" stroke-width="11" stroke-linecap="round"/>',
    '<path d="M120 28 L145 75 L197 83 L159 121 L169 174 L120 150 L71 174 L81 121 L43 83 L95 75Z" fill="none" stroke="ACCENT" stroke-width="9"/><circle cx="120" cy="105" r="20" fill="SECOND"/>'
  ];
  function render(container, name, directions) {
    if (!container) return;
    const cleanName = (name || "Ta marque").trim().slice(0,80);
    const seed = hash(cleanName.toLowerCase());
    const palette = [["#2dd4bf","#f59e0b"],["#f59e0b","#2dd4bf"],["#60a5fa","#2dd4bf"],["#d4a5ff","#f59e0b"]][seed%4];
    const cards = container.querySelectorAll("article");
    cards.forEach((card,i) => {
      if (card.querySelector(".archetype-visual")) return;
      const family = directions?.[i]?.famille || ["illustration","typographie","monogramme","mixte"][i];
      const title = escape(cleanName.toLocaleUpperCase("fr-CA"));
      const initials = escape(cleanName.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toLocaleUpperCase("fr-CA")).join(""));
      const accent=palette[i%2], second=palette[(i+1)%2], bg="#0b1220";
      const motif=motifs[(seed+i)%motifs.length].replaceAll("ACCENT",accent).replaceAll("SECOND",second).replaceAll("BG",bg);
      let body;
      if (family==="typographie") body='<text x="240" y="210" fill="#f8fafc" text-anchor="middle" font-size="40" font-weight="900" font-family="Arial,sans-serif" textLength="400" lengthAdjust="spacingAndGlyphs">'+title+'</text><path d="M80 240 H400" stroke="'+accent+'" stroke-width="8"/>';
      else if (family==="monogramme") body='<circle cx="240" cy="145" r="102" fill="none" stroke="'+accent+'" stroke-width="7"/><text x="240" y="185" fill="#f8fafc" text-anchor="middle" font-size="112" font-weight="800" font-family="Georgia,serif">'+initials+'</text>';
      else body='<g transform="translate(120 15)">'+motif+'</g><text x="240" y="255" fill="#f8fafc" text-anchor="middle" font-size="27" font-weight="800" font-family="Arial,sans-serif" textLength="360" lengthAdjust="spacingAndGlyphs">'+title+'</text>';
      const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-label="Esquisse '+escape(family)+' pour '+escape(cleanName)+'"><rect width="480" height="300" rx="16" fill="'+bg+'"/>'+body+'</svg>';
      const wrapper=document.createElement("div");wrapper.className="archetype-visual";wrapper.style.cssText="margin-bottom:14px;background:#0b1220;border-radius:12px;overflow:hidden";wrapper.innerHTML=svg;
      card.insertBefore(wrapper,card.firstChild);
      const download=document.createElement("button");download.type="button";download.textContent="TÉLÉCHARGER L'ESQUISSE SVG";download.style.cssText="padding:10px 14px;border-radius:20px;background:#f59e0b;color:#0b1220;border:0;font-weight:800;cursor:pointer";
      download.addEventListener("click",()=>{const blob=new Blob([svg],{type:"image/svg+xml"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="archetype-"+(i+1)+".svg";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
      card.appendChild(download);
    });
  }
  window.ArchetypeVisuals={render};
})();