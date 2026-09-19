(() => {
  const forms = document.querySelectorAll('form[data-form-type]');

  for (const form of forms) {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const originalLabel = submit?.textContent;

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      if (submit) {
        submit.disabled = true;
        submit.textContent = 'ENVOI EN COURS…';
      }
      if (status) {
        status.className = 'form-status show';
        status.textContent = 'Votre demande est en cours d’envoi…';
      }

      try {
        const response = await fetch('/api/forms', {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Impossible d’envoyer le formulaire.');

        form.reset();
        document.querySelectorAll('.dynamic-fields.active').forEach(group => group.classList.remove('active'));
        const fileList = document.getElementById('fileList');
        if (fileList) fileList.textContent = '';
        if (status) {
          status.className = 'form-status show success';
          status.innerHTML = '<strong>Merci! Votre demande a bien été envoyée.</strong><br>Nous communiquerons avec vous dès que possible.';
        }
      } catch (error) {
        if (status) {
          status.className = 'form-status show error';
          status.innerHTML = `<strong>L’envoi n’a pas fonctionné.</strong><br>${error.message} Vous pouvez aussi écrire à <a href="mailto:info@evolutionpme.ca">info@evolutionpme.ca</a>.`;
        }
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalLabel;
        }
        status?.focus();
      }
    });
  }
})();
