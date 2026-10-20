// Google Ads — charger la balise uniquement après consentement aux témoins non essentiels.
(() => {
  const GOOGLE_ADS_ID = 'AW-11322458314';
  const CONSENT_KEY = 'evopme-cookie-consent';
  let loaded = false;

  function loadGoogleAds() {
    if (loaded || document.querySelector('script[data-google-ads-tag]')) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_ADS_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_ADS_ID;
    script.dataset.googleAdsTag = GOOGLE_ADS_ID;
    document.head.appendChild(script);
  }

  try {
    if (localStorage.getItem(CONSENT_KEY) === 'accept') loadGoogleAds();
  } catch (_) {
    // Sans accès au consentement enregistré, aucun suivi n'est lancé.
  }

  window.addEventListener('evopme:cookie-consent', event => {
    if (event.detail?.choice === 'accept') loadGoogleAds();
  });
})();

(() => {
  const header = document.querySelector('header');
  const nav = header?.querySelector('nav');
  if (!header || !nav) return;

  if (!nav.querySelector('a[href="/paiement.html"]')) {
    const paymentLink = document.createElement('a');
    paymentLink.href = '/paiement.html';
    paymentLink.textContent = 'Payer une facture';
    const portalLink = nav.querySelector('a[href="https://portail.evolutionpme.ca"]');
    nav.insertBefore(paymentLink, portalLink || null);
  }

  if (!nav.querySelector('a[href="/evoot.html"]')) {
    const evootLink = document.createElement('a');
    evootLink.href = '/evoot.html';
    evootLink.textContent = 'Évout!';
    const formationsLink = nav.querySelector('a[href="/formations.html"]');
    nav.insertBefore(evootLink, formationsLink || nav.firstChild);
  }

  if (!nav.querySelector('a[href="/accompagnement-entreprise.html"]')) {
    const coachingLink = document.createElement('a');
    coachingLink.href = '/accompagnement-entreprise.html';
    coachingLink.textContent = 'Accompagnement';
    const aboutLink = nav.querySelector('a[href="/a-propos.html"]');
    nav.insertBefore(coachingLink, aboutLink || null);
  }

  nav.id ||= 'navigation-principale';
  const button = document.createElement('button');
  button.className = 'menu-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Ouvrir le menu');
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span aria-hidden="true"></span>';
  header.insertBefore(button, nav);

  const closeMenu = () => {
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Ouvrir le menu');
  };

  button.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 850) closeMenu();
  });
})();
