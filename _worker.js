import { onRequestPost, onRequest } from './functions/api/forms.js';
import { handleCms, getPublicCmsContent, getCmsMedia } from './functions/api/cms.js';
import { handlePayments } from './functions/api/payments.js';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function renderCmsHtml(response,env){
  if(!env.CMS_DB||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('data-public-cms'))return new Response(html,response);
  try{
    const {results=[]}=await env.CMS_DB.prepare('SELECT key,value,type FROM cms_content ORDER BY key').all();
    const content=new Map(results.map(row=>[row.key,row]));
    html=html.replace(/(<([a-zA-Z][\\w:-]*)\\b[^>]*\\sdata-public-cms=["']([^"']+)["'][^>]*>)([\\s\\S]*?)(<\\/\\2>)/g,(match,open,tag,key,current,close)=>{
      const item=content.get(key);
      if(!item||typeof item.value!=='string'||!item.value.trim())return match;
      return open+escapeHtml(item.value)+close;
    });
    html=html.replace(/(<img\\b[^>]*\\sdata-public-cms-image=["']([^"']+)["'][^>]*\\ssrc=["'])([^"']*)(["'][^>]*>)/g,(match,start,key,current,end)=>{
      const item=content.get(key);
      if(!item||typeof item.value!=='string'||!item.value.trim())return match;
      const value=item.value.trim();
      if(!/^(?:\\/|https:\\/\\/)/i.test(value))return match;
      return start+escapeHtml(value)+end;
    });
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('x-evopme-render','cms-server');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{
    return new Response(html,response);
  }
}

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
    const response=await env.ASSETS.fetch(request);
    return renderCmsHtml(response,env);
  }
};
