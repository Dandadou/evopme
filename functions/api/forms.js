const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

const fileToBase64 = async file => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return json({ error: 'Le service de courriel n’est pas encore configuré.' }, 503);
  }

  const data = await request.formData();
  const formType = String(data.get('form_type') || 'contact');
  const name = String(data.get('nom') || '').trim();
  const email = String(data.get('courriel') || '').trim();
  const message = String(data.get('message') || '').trim();

  if (!name || !email || !message || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: 'Veuillez vérifier votre nom, votre courriel et votre message.' }, 400);
  }

  const attachments = [];
  let totalBytes = 0;
  for (const value of data.getAll('fichiers')) {
    if (!(value instanceof File) || !value.size) continue;
    if (value.size > MAX_FILE_BYTES) {
      return json({ error: `Le fichier « ${value.name} » dépasse la limite de 8 Mo.` }, 413);
    }
    totalBytes += value.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return json({ error: 'L’ensemble des fichiers dépasse la limite de 18 Mo.' }, 413);
    }
    attachments.push({ filename: value.name, content: await fileToBase64(value) });
  }

  const ignored = new Set(['form_type', 'fichiers']);
  const rows = [];
  for (const [key, value] of data.entries()) {
    if (ignored.has(key) || value instanceof File || !String(value).trim()) continue;
    rows.push(`<tr><th style="text-align:left;padding:8px 12px;border-bottom:1px solid #ddd">${escapeHtml(key.replaceAll('_', ' '))}</th><td style="padding:8px 12px;border-bottom:1px solid #ddd">${escapeHtml(value).replaceAll('\n', '<br>')}</td></tr>`);
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.RESEND_FROM || 'Évolution PME <formulaires@evolutionpme.ca>',
      to: [env.CONTACT_EMAIL || 'info@evolutionpme.ca'],
      reply_to: email,
      subject: `${formType === 'soumission' ? 'Nouvelle demande de soumission' : 'Nouveau message'} — ${name}`,
      html: `<h1>${formType === 'soumission' ? 'Demande de soumission' : 'Message du site Web'}</h1><table style="border-collapse:collapse;width:100%;max-width:760px">${rows.join('')}</table>`,
      attachments
    })
  });

  if (!response.ok) {
    console.error('Resend error', response.status, await response.text());
    return json({ error: 'Le service de courriel a refusé l’envoi.' }, 502);
  }

  return json({ ok: true });
}

export function onRequest() {
  return json({ error: 'Méthode non permise.' }, 405);
}
