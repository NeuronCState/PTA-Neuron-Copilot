const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8');
assert.match(src,/@version\s+2\.0\.0\n/);assert.match(src,/@name\s+PTA Auto Solver Beta\n/);assert.match(src,/var STORAGE_KEY = 'pta-auto-solver-v1'/);
assert.match(src,/var RELEASE_FEATURES = \{ review: false, developer: false \}/);
const ctx={RELEASE_FEATURES:{review:false,developer:false},Map,Set,Promise,Date,AbortController};vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('    var reviewHub='),src.indexOf('    // Invisible read-only review collection.')),ctx);
(async()=>{
 // All hidden entry points return before GM storage, routing, timers or network; saved flag remains untouched.
 ctx.reviewHub.enabled=true;ctx.reviewHub.showTools=true;
 for(const name of ['loadReviewPreference','setReviewEnabled','syncReviewAutomation','cacheReviewGroup','openCachedReview','syncOriginalReviewIntent','startReviewLifecycle'])await ctx[name](true);
 assert.equal(ctx.reviewHub.enabled,true);assert.equal(ctx.reviewHub.timer,null);
 function fn(name){const start=src.indexOf('    function '+name+'(');let brace=src.indexOf('{',start),depth=1,i=brace+1;for(;depth;i++){if(src[i]==='{')depth++;if(src[i]==='}')depth--;}return src.slice(start,i);}
 // Existing diagnostic records are not deleted; stop routines are invoked instead of hooks/observers.
 let stoppedAPI=0,stoppedDOM=0;Object.assign(ctx,{stopApiDiagnostics(){stoppedAPI++;},stopDiagnostics(){stoppedDOM++;}});
 for(const name of ['startApiDiagnostics','resumeApiDiagnostics','startDiagnostics'])vm.runInContext(fn(name),ctx);
 ctx.startApiDiagnostics();ctx.resumeApiDiagnostics();ctx.startDiagnostics();assert.equal(stoppedAPI,2);assert.equal(stoppedDOM,1);
 // Exercise real stop functions with existing records: hiding cancels activity without erasing data.
 Object.assign(ctx,{clearTimeout,clearInterval,apiDiagnosticStatus(){},diagnosticStatus(){},apiDiagnostics:{records:[{saved:'api'}],enabled:true,generation:0,timer:null,readers:new Set(),restore:null},diagnostics:{records:[{saved:'page'}],enabled:true,timer:null,endTimer:null,routeTimer:null}});
 for(const name of ['stopApiDiagnostics','stopDiagnostics'])vm.runInContext(fn(name),ctx);
 ctx.startApiDiagnostics();ctx.startDiagnostics();assert.equal(ctx.apiDiagnostics.enabled,false);assert.equal(ctx.diagnostics.enabled,false);assert.equal(ctx.apiDiagnostics.records[0].saved,'api');assert.equal(ctx.diagnostics.records[0].saved,'page');
 assert.match(src,/dev\.hidden=true;dev\.setAttribute\('inert',''\);dev\.style\.setProperty\('display','none','important'\)/);
 assert.ok(src.includes("if(typeof reviewCacheClass==='function'&&(typeof RELEASE_FEATURES==='undefined'||RELEASE_FEATURES.review))"));
 console.log('PASS 2.0.0 hides review/developer entry points, blocks persisted auto-start and diagnostic resume without cache/setting deletion; manager identity retained');
})().catch(e=>{console.error(e);process.exitCode=1;});
