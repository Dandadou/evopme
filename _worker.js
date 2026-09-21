import { onRequestPost, onRequest } from './functions/api/forms.js';
import { handleCms, getPublicCmsContent, getCmsMedia } from './functions/api/cms.js';
import { handlePayments } from './functions/api/payments.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/forms') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return onRequest();
    }
    if (url.pathname === '/api/content' && request.method === 'GET') return getPublicCmsContent(env,url.hostname);
    if (url.pathname.startsWith('/api/payments/')) return handlePayments(request, env);
    if (url.pathname.startsWith('/api/cms/')) return handleCms(request, env);
    if (url.pathname.startsWith('/media/') && request.method === 'GET') return getCmsMedia(request, env);
    return env.ASSETS.fetch(request);
  }
};
