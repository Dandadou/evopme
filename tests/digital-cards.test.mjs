import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../_worker.js';
import { cleanCard, getDigitalCard, handleDigitalCardsAdmin } from '../functions/api/digital-cards.js';
import { cleanCardLinks } from '../assets/digital-card-links.js';
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
  const zones=[{face:'front',label:'Site web',url:'https://example.com/',x:0,y:0,w:100,h:100},
    {face:'back',label:'Courriel',url:'mailto:contact@example.com',x:35,y:49,w:32,h:14}];
  assert.equal((await handleDigitalCardsAdmin(request(edit,'PUT',{...base,published:true,zones,hideHeading:true,hideActions:true}),env,1)).status,200);
  const publicRes=await worker.fetch(request(publicPath),env);
  assert.equal(publicRes.headers.get('cache-control'),'no-store');
  const {card}=await publicRes.json();
  assert.equal(card.name,base.name);
  assert.deepEqual(card.zones,zones);
  assert.equal(card.hideHeading,true);
  assert.equal(card.hideActions,true);
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
    const zones=[{face:'front',label:'Site',url:'https://example.com',x:2,y:3,w:30,h:20},
      {face:'back',label:'Appeler',url:'tel:+14505550100',x:0,y:0,w:100,h:100}];
    renderCard(root,{...base,front:'recto.png',back:'verso.png',zones},{contact:false});
    const [frame,controls]=root.children, [hint,button]=controls.children, [flip]=frame.children, [front,back]=flip.children;
    assert.equal(front.children[0].src,'recto.png');
    assert.equal(back.children[0].src,'verso.png');
    assert.equal(back.attrs['aria-hidden'],'true');
    assert.equal(back.inert,true);
    assert.equal(front.children[1].href,'https://example.com/');
    assert.equal(front.children[1].attrs['aria-label'],'Site');
    assert.equal(back.children[1].href,'tel:+14505550100');
    assert.equal(back.children[1].style.width,'100%');
    frame.click({target:{closest:()=>true}});
    assert.equal(flip.dataset.back,'false');
    button.click();
    assert.equal(flip.dataset.back,'true');
    assert.equal(front.attrs['aria-hidden'],'true');
    assert.equal(back.attrs['aria-hidden'],'false');
    assert.equal(front.inert,true);
    assert.equal(back.inert,false);
    assert.match(hint.textContent,/^Verso/);
    button.click();
    assert.equal(flip.dataset.back,'false');
  }finally{globalThis.document=before;}
});

test('zones recto-verso validées et présentation sans texte facultative',()=>{
  const front={face:'front',label:'Portfolio',url:'https://example.com',x:0,y:0,w:100,h:100};
  const back={face:'back',label:'Téléphone',url:'tel:+14505550100',x:30,y:32,w:47,h:18};
  const valid=cleanCard({...base,hideHeading:true,hideActions:true,zones:[front,back]});
  assert.deepEqual(valid.zones.map(z=>z.face),['front','back']);
  assert.equal(valid.hideHeading,true);
  assert.equal(valid.hideActions,true);
  assert.equal(cleanCard(base).hideHeading,false);
  assert.deepEqual(cleanCard(base).zones,[]);
  for(const url of ['javascript:alert(1)','data:text/html,abc','mailto:x@example.com?subject=no','https://user:pass@example.com']){
    assert.throws(()=>cleanCardLinks([{...front,url}]));
  }
  assert.throws(()=>cleanCardLinks([{...back,x:60}]));
});

test('la préversion de branche ne lit ni ne modifie les cartes en D1',async()=>{
  const origin='https://hubert-cartes-numeriques-evopme.dadou195.workers.dev';
  const env={get CMS_DB(){throw new Error('Le D1 ne doit pas être consulté.');}};
  for(const method of ['GET','POST','PUT']) {
    assert.equal((await worker.fetch(new Request(origin+'/api/cms/digital-cards',{method}),env)).status,401);
  }
  for(const route of ['/carte/atelier-test','/api/cartes/atelier-test']){
    assert.equal((await worker.fetch(new Request(origin+route),env)).status,404);
  }
});

test('les modèles créent deux faces éditables et les éléments sont conservés à la publication',async()=>{
  const {makeCardTemplate}=await import('../assets/digital-card-templates.js');
  for(const theme of ['minimal','graphite','signature']){
    const preset=makeCardTemplate(theme,{...base,phone:'450 555-0100',website:'https://example.com'});
    const card=cleanCard({...base,...preset,blankFront:true,blankBack:true});
    assert.equal(card.theme,theme);
    assert.equal(card.zones.filter(z=>z.kind==='button').length,3);
    assert.ok(card.zones.some(z=>z.source==='name'));
    assert.ok(card.zones.every(z=>z.x+z.w<=100&&z.y+z.h<=100));
  }
  const data={...base,...makeCardTemplate('signature',base),blankFront:true,blankBack:true};
  data.zones.push({face:'back',kind:'icon',icon:'email',color:'#ffffff',size:18,align:'center',label:'Écrire',url:'mailto:info@example.com',x:68,y:52,w:14,h:21});
  const env=environment(), path='/api/cms/digital-cards';
  assert.equal((await handleDigitalCardsAdmin(request(path,'POST',data),env,1)).status,201);
  assert.equal((await handleDigitalCardsAdmin(request(path+'?slug='+base.slug,'PUT',{...data,published:true}),env,1)).status,200);
  const {card}=await (await getDigitalCard(request('/api/cartes/'+base.slug),env,base.slug)).json();
  assert.equal(card.theme,'signature');
  assert.equal(card.blankFront,true);
  assert.equal(card.zones.at(-1).icon,'email');
  assert.throws(()=>cleanCard({...data,theme:'mauvais'}));
  assert.throws(()=>cleanCardLinks([{...data.zones.at(-1),url:'javascript:alert(1)'}]));
  assert.throws(()=>cleanCardLinks([{...data.zones.at(-1),icon:'constructor'}]));
  assert.throws(()=>cleanCardLinks([{...data.zones.at(-1),color:'url(https://example.com)'}]));
  assert.throws(()=>cleanCardLinks([{...data.zones.find(z=>z.kind==='button'),url:''}]));
});

test('format et coins indépendants, avec valeurs historiques par défaut',()=>{
  assert.equal(cleanCard(base).format,'landscape');
  assert.equal(cleanCard(base).corners,'rounded');
  assert.equal(cleanCard({...base,format:'square',corners:'rounded'}).format,'square');
  assert.equal(cleanCard({...base,format:'portrait',corners:'square'}).corners,'square');
  assert.throws(()=>cleanCard({...base,format:'1:2'}));
  assert.throws(()=>cleanCard({...base,corners:'50px'}));
});

test('zones invisibles étroites permises, mais bornées à la face',()=>{
  const line={face:'back',label:'Téléphone',url:'tel:+14505550100',x:87,y:93,w:11,h:4};
  assert.deepEqual(cleanCardLinks([line]),[line]);
  assert.throws(()=>cleanCardLinks([{...line,h:2}]));
  assert.throws(()=>cleanCardLinks([{...line,w:14}]));
  assert.throws(()=>cleanCardLinks([{...line,kind:'button'}]));
});

test('saisie sans préfixe des destinations, collage complet et validation',async()=>{
  const {buildDestination,splitDestination}=await import('../assets/digital-card-links.js');
  assert.equal(buildDestination('email','nom@exemple.ca'),'mailto:nom@exemple.ca');
  assert.equal(buildDestination('phone','+1 (450) 555-0100'),'tel:+14505550100');
  assert.equal(buildDestination('web','exemple.ca'),'https://exemple.ca/');
  assert.equal(buildDestination('web','http://exemple.ca'),'http://exemple.ca/');
  assert.equal(buildDestination('phone','tel:4505550100'),'tel:4505550100');
  assert.equal(buildDestination('web','javascript:alert(1)'),'');
  assert.equal(buildDestination('phone','450abc5550100'),'');
  assert.equal(buildDestination('email','nom@exemple.ca?bcc=x@exemple.ca'),'');
  assert.equal(splitDestination('mailto:nom@exemple.ca').type,'email');
});
