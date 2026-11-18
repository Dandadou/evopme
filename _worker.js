import { onRequestPost, onRequest } from './functions/api/forms.js';
import { handleCms, getPublicCmsContent, getPublicHeyzineCatalogues, getCmsMedia } from './functions/api/cms.js';
import { handlePayments } from './functions/api/payments.js';
import { handleWorkshop } from './functions/api/workshops.js';
import { onRequestGet as getVitrine } from './functions/api/vitrine.js';
import { handleLogoAnalyse } from './functions/api/logo.js';
import { onRequestPost as handleLogoDirections } from './functions/api/logo/directions.js';
import { onRequestPost as handleLogoIllustrer } from './functions/api/logo/illustrer.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/forms') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return onRequest();
    }
    if (url.pathname === '/api/catalogues' && request.method === 'GET') return getPublicHeyzineCatalogues(env,url.hostname);
    if (url.pathname === '/api/content' && request.method === 'GET') return getPublicCmsContent(env,url.hostname);
    if (url.pathname === '/api/vitrine' && request.method === 'GET') return getVitrine({request,env});
    if (url.pathname === '/api/logo/analyser') return handleLogoAnalyse(request, env);
    if (url.pathname === '/api/logo/directions') {
      if (request.method !== 'POST') return new Response('Méthode non acceptée', {status:405});
      return handleLogoDirections({request,env});
    }
    if (url.pathname === '/api/logo/illustrer') {
      if (request.method !== 'POST') return new Response('Méthode non acceptée', {status:405});
      return handleLogoIllustrer({request,env});
    }
    if (url.pathname.startsWith('/api/workshops/')) return handleWorkshop(request, env);
    if (url.pathname.startsWith('/api/payments/')) return handlePayments(request, env);
    if (url.pathname.startsWith('/api/cms/')) return handleCms(request, env);
    if (url.pathname.startsWith('/media/') && request.method === 'GET') return getCmsMedia(request, env);
    return env.ASSETS.fetch(request);
  }
};
