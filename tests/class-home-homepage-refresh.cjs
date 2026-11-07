const assert=require('node:assert/strict'),{harness}=require('./class-home-api.cjs');
const KEY='pta-catalogue-cache-v1',VISITS='pta-catalogue-visits-v1';
(async()=>{
 const storage=new Map(),session=new Map();const first=harness({total:9,storage,session});first.api.startClassHome();await first.flush(new Promise(resolve=>{const poll=()=>first.api.catalogueState.job?Promise.resolve().then(poll):resolve();poll();}));
 const original=storage.get(KEY);assert.equal(JSON.parse(original).snapshot.complete,true);first.events.pagehide();await first.flush(Promise.resolve());assert.equal(first.api.catalogueCache.owner,null);
 // New document boot, homepage route, no visit markers: exactly one identity GET.
 const reload=harness({total:9,storage,session});reload.advance(60000);reload.api.startClassHome();await reload.flush(new Promise(resolve=>{const poll=()=>reload.api.catalogueState.job?Promise.resolve().then(poll):resolve();poll();}));
 assert.equal(reload.calls.length,1);assert.ok(reload.calls[0].url.pathname.endsWith('/exams'));assert.equal(reload.api.catalogueState.rows.length,9);assert.equal(reload.api.catalogueState.status,'ready');assert.match(reload.api.catalogueState.message,/仅核验账号/);assert.ok(reload.api.catalogueState.rows.every(r=>r.metricsCached));assert.equal(storage.get(KEY),original);
 // Polling after boot does not fan out or reload the cache.
 for(let i=0;i<5;i++)reload.intervals.forEach(fn=>fn());assert.equal(reload.calls.length,1);
 // Actual visit -> return -> consumed markers -> full page refresh.
 reload.ctx.location.pathname='/problem-sets/2/exam/problems/type/1';reload.api.trackCatalogueVisit();reload.api.stopClassCatalogue();reload.ctx.location.pathname='/problem-sets/dashboard';reload.api.trackCatalogueVisit();let before=reload.calls.length;await reload.flush(reload.api.loadClassCatalogue());assert.equal(reload.calls.length-before,2);assert.equal(JSON.parse(session.get(VISITS)).items.length,0);
 const afterVisit=harness({total:9,storage,session});afterVisit.advance(120000);await afterVisit.flush(afterVisit.api.loadClassCatalogue());assert.equal(afterVisit.calls.length,1);assert.match(afterVisit.api.catalogueState.message,/仅核验账号/);
 // Manual reread retains all-directory/all-active behavior.
 before=afterVisit.calls.length;await afterVisit.flush(afterVisit.api.loadClassCatalogue({type:'click'}));let calls=afterVisit.calls.slice(before);assert.equal(calls.filter(c=>c.url.pathname==='/api/problem-sets').length,1);assert.equal(calls.filter(c=>c.url.pathname.endsWith('/problem-status')).length,9);
 // Missing identity / network denial does not fall through into a full refresh.
 for(const mode of ['missing','exam401']){const h=harness({total:9,mode:mode==='missing'?'':mode,storage:new Map([[KEY,original]]),session:new Map()});h.advance(60000);if(mode==='missing')h.ctx.omitUser=true;await h.flush(h.api.loadClassCatalogue());assert.equal(h.calls.length,1);assert.equal(h.api.catalogueState.status,'partial');assert.equal(h.api.catalogueState.rows.length,0);}
 // A different account gets a fresh directory, never the previous private cache.
 const switched=harness({total:9,storage:new Map([[KEY,original]]),session:new Map()});switched.advance(60000);switched.ctx.testUserId='6000';let source;switched.ctx.onFetch=url=>{if(url.pathname==='/api/problem-sets')source=switched.api.catalogueState.source;};await switched.flush(switched.api.loadClassCatalogue());assert.equal(source,'dom');assert.equal(switched.api.catalogueCache.owner,'6000');assert.ok(switched.calls.some(c=>c.url.pathname==='/api/problem-sets'));
 // Expired metadata remains an explicit full-refresh case.
 const expired=JSON.parse(original);expired.snapshot.at-=25*3600000;const h=harness({total:9,storage:new Map([[KEY,JSON.stringify(expired)]])});h.advance(60000);await h.flush(h.api.loadClassCatalogue());assert.ok(h.calls.some(c=>c.url.pathname==='/api/problem-sets'));
 console.log('PASS: true homepage boot/reload uses one identity proof only, no polling fan-out, visit/consume/reload sequence, manual full reread, auth failure retention and expired snapshot fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
