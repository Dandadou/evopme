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
