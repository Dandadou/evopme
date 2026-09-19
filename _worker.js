import { onRequestPost, onRequest } from './functions/api/forms.js';
import { handleCms } from './functions/api/cms.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/forms') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return onRequest();
    }
    if (url.pathname.startsWith('/api/cms/')) return handleCms(request, env);
    return env.ASSETS.fetch(request);
  }
};
