// Google Ads et Google Analytics 4 — activés avec le consentement du visiteur.
(() => {
  const GOOGLE_ADS_ID = 'AW-11322458314';
  const GA4_ID = 'G-6576HFYKY0';
  const CONSENT_KEY = 'evopme-cookie-consent';
  let initialized = false;

  function initializeGoogleTags() {
    if (initialized) return;
    initialized = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_ADS_ID);
    window.gtag('config', GA4_ID);

    // Une seule bibliothèque Google pour les deux destinations.
    if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
      script.dataset.googleTags = 'true';
      document.head.appendChild(script);
    }
  }

  try {
    if (localStorage.getItem(CONSENT_KEY) === 'accept') initializeGoogleTags();
  } catch (_) {
    // Sans consentement vérifiable, ne pas activer le suivi.
  }

  window.addEventListener('evopme:cookie-consent', event => {
    if (event.detail?.choice === 'accept') initializeGoogleTags();
  });
})();

(() => {
  const header=document.querySelector('header'),nav=header?.querySelector('nav');
  if(!nav)return;
  // Navigation commune à toutes les pages du site.
  nav.classList.add('evopme-nav');
  nav.id='navigation-principale';
  const group=(label,links)=>{
    const details=document.createElement('details');details.className='nav-dropdown';
    const summary=document.createElement('summary');summary.textContent=label;details.append(summary);
    const sub=document.createElement('div');sub.className='nav-submenu';
    links.forEach(([text,href])=>{const a=document.createElement('a');a.textContent=text;a.href=href;sub.append(a)});
    details.append(sub);return details;
  };
  const link=(label,href,cls)=>{const a=document.createElement('a');a.textContent=label;a.href=href;if(cls)a.className=cls;return a};
  nav.replaceChildren(
    group('Nos services',[['Tous nos services','/services.html'],['Vêtements corporatifs','/services.html'],['Produits promotionnels','/catalogues.html?categorie=produits'],['Graphisme et image de marque','/services.html'],['Formations','/formations.html'],['Accompagnement','/accompagnement-entreprise.html']]),
    link('Évoot!','/evoot.html','nav-evoot'),
    group('Catalogues',[['Tous les catalogues','/catalogues.html'],['Vêtements','/catalogues.html?categorie=vetements'],['Produits promotionnels','/catalogues.html?categorie=produits']]),
    group('À propos',[['Notre entreprise','/a-propos.html'],['Études de cas','/etudes-de-cas.html'],['Nous joindre','/#contact']]),
    group('Espace client',[['Portail client','https://portail.evolutionpme.ca'],['Payer une facture','/paiement.html']]),
    link('Demander une soumission','/soumission.html','pill nav-quote')
  );
  const button=document.createElement('button');button.className='menu-toggle';button.type='button';
  button.setAttribute('aria-label','Ouvrir le menu');button.setAttribute('aria-controls',nav.id);
  button.setAttribute('aria-expanded','false');button.innerHTML='<span aria-hidden="true"></span>';
  header.insertBefore(button,nav);
  const closeDropdowns=()=>nav.querySelectorAll('details[open]').forEach(d=>d.open=false);
  const closeMenu=()=>{nav.classList.remove('is-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Ouvrir le menu');closeDropdowns()};
  button.addEventListener('click',()=>{const open=!nav.classList.contains('is-open');nav.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');if(!open)closeDropdowns()});
  nav.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{if(details.open)nav.querySelectorAll('details[open]').forEach(other=>{if(other!==details)other.open=false})}));
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
  document.addEventListener('click',e=>{if(!header.contains(e.target))closeDropdowns()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();button.focus()}});
  window.addEventListener('resize',()=>{if(window.innerWidth>850)closeMenu()});
})();
