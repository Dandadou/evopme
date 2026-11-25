import { getDigitalCard, validSlug } from './functions/api/digital-cards.js';
import { onRequestPost, onRequest } from './functions/api/forms.js';
import { handleCms, getPublicCmsContent, getPublicHeyzineCatalogues, getCmsMedia } from './functions/api/cms.js';
import { handlePayments } from './functions/api/payments.js';
import { handleWorkshop } from './functions/api/workshops.js';
import { onRequestGet as getVitrine } from './functions/api/vitrine.js';
import { handleLogoAnalyse } from './functions/api/logo.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/cartes/')) return getDigitalCard(request,env,url.pathname.slice(12));
    if (url.pathname.startsWith('/carte/') && (request.method==='GET'||request.method==='HEAD')) {
      const slug=url.pathname.slice(7).replace(/\/$/,'');
      if (!validSlug(slug)) return new Response('Carte introuvable.',{status:404});
      const page=await env.ASSETS.fetch(new Request(new URL('/carte',url),request));
      const headers=new Headers(page.headers);
      headers.set('x-robots-tag','noindex, nofollow');
      headers.set('referrer-policy','no-referrer');
      return new Response(page.body,{status:page.status,headers});
    }
    if (url.pathname === '/api/forms') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return onRequest();
    }
    if (url.pathname === '/api/catalogues' && request.method === 'GET') return getPublicHeyzineCatalogues(env,url.hostname);
    if (url.pathname === '/api/content' && request.method === 'GET') return getPublicCmsContent(env,url.hostname);
    if (url.pathname === '/api/vitrine' && request.method === 'GET') return getVitrine({request,env});
    if (url.pathname === '/api/logo/analyser') return handleLogoAnalyse(request, env);
    if (url.pathname.startsWith('/api/workshops/')) return handleWorkshop(request, env);
    if (url.pathname.startsWith('/api/payments/')) return handlePayments(request, env);
    if (url.pathname.startsWith('/api/cms/')) return handleCms(request, env);
    if (url.pathname.startsWith('/media/') && request.method === 'GET') return getCmsMedia(request, env);
    return env.ASSETS.fetch(request);
  }
};
