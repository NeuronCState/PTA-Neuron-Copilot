const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom'),{harness:baseHarness}=require('./class-home-api.cjs');
const harness=options=>baseHarness({...options,script:'PNC.user.js'});
const src=fs.readFileSync('PNC.user.js','utf8');
const KEY='pta-catalogue-cache-v1';
function attach(h){
 const {document}=parseHTML('<html><body><div id="pta-root"><div id="pta-shell"><div class="pta-expanded"><div id="pta-class-home"></div><div class="pta-status">ANSWER</div></div></div></div></body></html>');h.ctx.document=document;
 Object.assign(h.ctx,{state:{running:false,routeRevision:0},stopAssistance(){},stopReviewWork(){},reviewHub:{busy:false,revision:0},activeSolveController:null,setProgress(){},panelRouteChanged(){}});
 vm.runInContext(src.slice(src.indexOf("    var spaObservedURL = ''"),src.indexOf('    function installSPAGuards()')),h.ctx);
 return document;
}
async function ready(h){await h.flush(new Promise(resolve=>{const poll=()=>h.api.catalogueState.job?Promise.resolve().then(poll):resolve();poll();}));}
function go(h,path){h.ctx.location.pathname=path;h.ctx.location.href='https://pintia.cn'+path;h.ctx.observeSPARoute(true);h.intervals.forEach(f=>f());}
(async()=>{
 const storage=new Map(),session=new Map(),h=harness({total:6,storage,session});const document=attach(h);
 h.ctx.location.pathname='/home/account';h.ctx.location.href='https://pintia.cn/home/account';h.api.startClassHome();await ready(h);
 assert.equal(h.api.catalogueState.rows.length,6);assert.equal(document.querySelector('.pta-expanded').classList.contains('pta-catalog-mode'),true,'account page is catalogue, not answer');assert.equal(document.getElementById('pta-class-home').hidden,false);assert.equal(document.getElementById('pta-home-pull').hidden,true,'no answer-only pull needed on catalogue home');
 const raw=storage.get(KEY);assert.ok(raw);
 go(h,'/problem-sets/2/exam/problems/type/1');assert.equal(document.querySelector('.pta-expanded').classList.contains('pta-catalog-mode'),false);assert.equal(document.getElementById('pta-home-pull').hidden,false);
 go(h,'/home/account');await ready(h);assert.equal(h.api.catalogueState.rows.length,6);assert.equal(document.querySelector('.pta-expanded').classList.contains('pta-catalog-mode'),true);assert.equal(document.getElementById('pta-class-home').parentElement.className,'pta-expanded pta-catalog-mode');
 // Dirty in-memory metric survives navigating away before the delayed GM write.
 const row=h.api.catalogueState.rows.find(r=>r.id==='2');row.metrics={answered:3,total:40,score:'6',progress:'7.5%'};h.api.catalogueCacheWrite({userId:'5000'},row,{userId:'5000',id:'1002'});assert.equal(h.api.cataloguePersistence.dirty,true);
 go(h,'/unrelated');await h.flush(h.api.cataloguePersistence.queue);assert.equal(h.api.catalogueCache.items.get('2').metrics.answered,3);assert.equal(JSON.parse(storage.get(KEY)).entries.find(e=>e.id==='2').metrics.answered,3,'flush before view reset');assert.equal(h.api.getVerifiedCatalogueIdentity(),null,'route invalidates trust, not data');
 go(h,'/home/account');await ready(h);assert.equal(h.api.catalogueState.rows.length,6);assert.equal(h.api.catalogueCache.items.get('2').metrics.answered,3);
 // Full reload at /home/account revalidates one identity and restores the complete directory.
 const re=harness({total:6,storage,session});attach(re);re.advance(60000);re.ctx.location.pathname='/home/account';re.ctx.location.href='https://pintia.cn/home/account';re.api.startClassHome();await ready(re);assert.equal(re.calls.length,1);assert.equal(re.api.catalogueState.rows.length,6);
 // A denied identity check must hide private rows without deleting the saved cache; later retry recovers.
 const preserved=storage.get(KEY),deny=harness({total:6,mode:'exam401',storage,session});attach(deny);deny.advance(60000);deny.ctx.location.pathname='/home/account';deny.api.startClassHome();await ready(deny);assert.equal(deny.api.catalogueState.rows.length,0);assert.equal(storage.get(KEY),preserved);
 const recovered=harness({total:6,storage,session});attach(recovered);recovered.advance(60000);recovered.ctx.location.pathname='/home/account';recovered.api.startClassHome();await ready(recovered);assert.equal(recovered.api.catalogueState.rows.length,6);
 for(const p of ['/home','/home/','/home/account','/home/account/'])assert.equal(h.ctx.catalogueRoute(p),true);
 for(const p of ['/homepage/account','/problem-sets/2/exam','/login'])assert.equal(h.ctx.catalogueRoute(p),false);
 console.log('PASS account/home boot→exam→account→unrelated→account→reload, catalogue UI and pull routing, pending-write preservation, identity invalidation, auth denial keeps cache and recoverable retry');
})().catch(e=>{console.error(e);process.exitCode=1});
