import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../_worker.js';
import { cleanCard, getDigitalCard, handleDigitalCardsAdmin } from '../functions/api/digital-cards.js';
import { renderCard, toVcard } from '../assets/digital-card.js';

const origin='https://cartes.example';
const base={name:'Élodie Martin',company:'Atelier, Démo',title:'Design',email:'info@example.com',slug:'atelier-test',accent:'#ff6600',background:'#202328',published:false};
function environment(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE organizations(id INTEGER PRIMARY KEY); INSERT INTO organizations VALUES (1),(2);');
  const migration=readFileSync(new URL('../migrations/20261125-digital-business-cards.sql',import.meta.url),'utf8');
  sqlite.exec(migration);sqlite.exec(migration);
  return {
    CMS_DB:{prepare(sql){return {bind(...args){
      const stmt=sqlite.prepare(sql);
      return {first:async()=>stmt.get(...args),all:async()=>({results:stmt.all(...args)}),
        run:async()=>({meta:stmt.run(...args)})};
    }};}},
    ASSETS:{async fetch(req){assert.equal(new URL(req.url).pathname,'/carte');return new Response('Carte HTML');}}
  };
}
const request=(path,method='GET',data,headers={})=>new Request(origin+path,{method,
  headers:{'content-type':'application/json',...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});

test('publication explicite, retrait, lien stable et séparation des organisations',async()=>{
  const env=environment(), path='/api/cms/digital-cards', edit=path+'?slug='+base.slug, publicPath='/api/cartes/'+base.slug;
  assert.equal((await worker.fetch(request(path),env)).status,401);
  assert.equal((await handleDigitalCardsAdmin(request(path,'POST',base,{origin:'https://other.example'}),env,1)).status,403);
  assert.equal((await handleDigitalCardsAdmin(request(path,'POST',{...base,published:true}),env,1)).status,400);
  assert.equal((await handleDigitalCardsAdmin(request(path,'POST',base),env,1)).status,201);
  assert.equal((await handleDigitalCardsAdmin(request(path,'POST',base),env,2)).status,409);
  assert.equal((await worker.fetch(request(publicPath),env)).status,404);
  assert.equal((await handleDigitalCardsAdmin(request(edit),env,2)).status,404);
  assert.equal((await handleDigitalCardsAdmin(request(edit,'PUT',{...base,published:true}),env,2)).status,404);
  assert.equal((await handleDigitalCardsAdmin(request(edit,'PUT',{...base,slug:'autre'}),env,1)).status,400);
  assert.equal((await handleDigitalCardsAdmin(request(edit,'PUT',{...base,published:true}),env,1)).status,200);
  const publicRes=await worker.fetch(request(publicPath),env);
  assert.equal(publicRes.headers.get('cache-control'),'no-store');
  assert.equal((await publicRes.json()).card.name,base.name);
  assert.equal((await worker.fetch(request('/carte/'+base.slug),env)).headers.get('x-robots-tag'),'noindex, nofollow');
  assert.equal((await handleDigitalCardsAdmin(request(edit,'PUT',base),env,1)).status,200);
  assert.equal((await getDigitalCard(request(publicPath),env,base.slug)).status,404);
  const list=await (await handleDigitalCardsAdmin(request(path),env,1)).json();
  assert.deepEqual(Object.keys(list.cards[0]).sort(),['company','name','published','slug']);
});
test('validation, images raster seulement et coordonnées sûres',()=>{
  assert.equal(cleanCard({...base,website:'https://example.com'}).website,'https://example.com/');
  assert.throws(()=>cleanCard({...base,website:'javascript:alert(1)'}));
  assert.throws(()=>cleanCard({...base,website:'https://foo:pw@example.com/'}));
  assert.throws(()=>cleanCard({...base,name:'A\nEND:VCARD'}));
  assert.throws(()=>cleanCard({...base,front:'data:image/svg+xml;base64,AAAA'}));
  assert.throws(()=>cleanCard({...base,front:'data:image/png;base64,AAAA'}));
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
  assert.equal(cleanCard({...base,front:png}).front,png);
});
test('vCard avec accents, échappement et pliage UTF-8',()=>{
  const v=toVcard({...base,title:'É'.repeat(100)});
  assert.match(v,/^BEGIN:VCARD\r\nVERSION:3\.0\r\nFN:Élodie Martin/);
  assert.match(v,/ORG:Atelier\\, Démo/);
  assert.ok(v.endsWith('END:VCARD\r\n'));
  assert.ok(v.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
});

test('le recto et le verso sont rendus et le bouton inverse la face accessible',()=>{
  class Node {
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};
      this.classList={add(){}};this.style={setProperty(){}};}
    append(...kids){this.children.push(...kids);}
    replaceChildren(...kids){this.children=kids;}
    setAttribute(k,v){this.attrs[k]=v;}
    addEventListener(k,fn){this[k]=fn;}
    get childElementCount(){return this.children.length;}
  }
  const before=globalThis.document;
  globalThis.document={createElement:tag=>new Node(tag)};
  try{
    const root=new Node('div');
    renderCard(root,{...base,front:'recto.png',back:'verso.png'},{contact:false});
    const [button]=root.children, [flip,hint]=button.children, [front,back]=flip.children;
    assert.equal(front.children[0].src,'recto.png');
    assert.equal(back.children[0].src,'verso.png');
    assert.equal(back.attrs['aria-hidden'],'true');
    button.click();
    assert.equal(flip.dataset.back,'true');
    assert.equal(front.attrs['aria-hidden'],'true');
    assert.equal(back.attrs['aria-hidden'],'false');
    assert.match(hint.textContent,/^Verso/);
    button.click();
    assert.equal(flip.dataset.back,'false');
  }finally{globalThis.document=before;}
});
