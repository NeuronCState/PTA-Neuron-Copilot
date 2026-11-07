const assert=require('node:assert/strict'),{harness}=require('./class-home-api.cjs');
const KEY='pta-catalogue-cache-v1';
function closedClass(h){h.ctx.endAtById=Object.fromEntries(Array.from({length:24},(_,i)=>[String((i+1)*3),'2025-01-01T00:00:00Z']));}
(async()=>{
 const storage=new Map(),first=harness({total:72,storage});closedClass(first);await first.flush(first.api.loadClassCatalogue());const initial=storage.get(KEY);assert.equal(JSON.parse(initial).snapshot.complete,true);
 const fast=harness({total:72,storage});fast.advance(60000);closedClass(fast);let pageChecks=0,archiveBeforeProgress=false;
 fast.ctx.onFetch=url=>{
  const state=fast.api.catalogueState;
  if(url.pathname==='/api/problem-sets'){
   pageChecks++;assert.equal(state.source,'cache');assert.equal(state.rows.length,72,'full snapshot remains displayed throughout pagination');
   const partition=fast.api.catalogueArchiveGroups(fast.api.groupCatalogueRows(state.rows));assert.equal(partition.archived.length,1);assert.equal(partition.current.length,2);
  }
  if(url.pathname.endsWith('/problem-status') || (url.pathname.endsWith('/exams') && pageChecks===3)){
   assert.equal(state.source,'api');assert.equal(state.directoryComplete,true);assert.equal(state.status,'loading');assert.equal(fast.api.catalogueArchiveGroups(fast.api.groupCatalogueRows(state.rows)).archived.length,1);archiveBeforeProgress=true;
  }
 };
 assert.equal(fast.api.catalogueState.rows.length,0);await fast.flush(fast.api.loadClassCatalogue());assert.equal(pageChecks,3);assert.equal(archiveBeforeProgress,true);assert.equal(fast.api.catalogueState.status,'ready');
 const firstRequest=fast.calls[0].url;assert.ok(firstRequest.pathname.endsWith('/exams'),'one identity probe before revealing disk data');const probed=firstRequest.pathname.split('/')[3];assert.equal(fast.calls.filter(c=>c.url.pathname==='/api/problem-sets/'+probed+'/exams').length,1,'reuse probe for progress; no duplicate request');
 // A failed refresh cannot replace a complete verified cache with the first page.
 const partialStorage=new Map([[KEY,initial]]),partial=harness({total:72,mode:'changed',storage:partialStorage});partial.advance(60000);closedClass(partial);await partial.flush(partial.api.loadClassCatalogue());assert.equal(partial.api.catalogueState.source,'cache');assert.equal(partial.api.catalogueState.rows.length,72);assert.equal(partial.api.catalogueState.status,'partial');assert.match(partial.api.catalogueState.message,/保留完整缓存/);assert.equal(partialStorage.get(KEY),initial);
 // Wrong owner, expired/incomplete metadata and no active set cannot reveal disk rows.
 for(const variant of ['wrong-user','expired','incomplete','all-ended']){
  const value=JSON.parse(initial);if(variant==='expired')value.snapshot.at-=25*60*60*1000;if(variant==='incomplete')value.snapshot.complete=false;if(variant==='all-ended')value.snapshot.rows.forEach(r=>{r.endTime=Date.UTC(2025,0,1);r.deadlineOrder=r.endTime;});
  const h=harness({total:72,storage:new Map([[KEY,JSON.stringify(value)]])});h.advance(60000);closedClass(h);if(variant==='wrong-user')h.ctx.testUserId='6000';
  let firstSource=null;h.ctx.onFetch=url=>{if(url.pathname==='/api/problem-sets'&&firstSource===null)firstSource=h.api.catalogueState.source;};
  await h.flush(h.api.loadClassCatalogue());assert.notEqual(firstSource,null);assert.notEqual(firstSource,'cache',variant);assert.equal(h.api.catalogueState.status,'ready');
 }
 // Fresh directory also renders/archives atomically without needing any cache.
 const fresh=harness({total:72});closedClass(fresh);let sawComplete=false;
 fresh.ctx.onFetch=url=>{if(url.pathname==='/api/problem-sets')assert.equal(fresh.api.catalogueState.source,'dom');else{assert.equal(fresh.api.catalogueState.rows.length,72);assert.equal(fresh.api.catalogueArchiveGroups(fresh.api.groupCatalogueRows(fresh.api.catalogueState.rows)).archived.length,1);sawComplete=true;}};
 await fresh.flush(fresh.api.loadClassCatalogue());assert.equal(sawComplete,true);assert.equal(fresh.api.catalogueState.status,'ready');
 console.log('PASS: identity-gated atomic full snapshot and archive, stable pagination, failed refresh retains cache, fresh directory archives before progress, wrong-account/expired/incomplete/closed-only protection');
})().catch(e=>{console.error(e);process.exitCode=1;});
