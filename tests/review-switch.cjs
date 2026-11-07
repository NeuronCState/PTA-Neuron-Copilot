const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8'),KEY='pta-review-enabled-v1';
function harness(disk=new Map()){
 const calls=[],ctx={Map,Set,Promise,AbortController,Date,JSON,setTimeout,clearTimeout,setInterval(){},GM_getValue:(k,d)=>disk.has(k)?disk.get(k):d,GM_setValue:async(k,v)=>disk.set(k,v),reviewStorageWait:p=>p,sessionStorage:{getItem:()=>null,removeItem(){}},location:{href:'https://pintia.cn/problem-sets/dashboard',pathname:'/problem-sets/dashboard'},state:{},catalogueSignature:'',refreshClassHome(){},toast(){},cancelReviewCache(){},stopOriginalReview(){},catalogueState:{directoryComplete:true,cacheVerified:true,snapshotAt:123,rows:[{id:'1',lifecycle:'ended',listedExamId:'10'},{id:'2',lifecycle:'active'}]},catalogueCache:{owner:'100'},cataloguePanelActive:()=>true};
 vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('    var reviewHub='),src.indexOf('    // Invisible read-only review collection.')),ctx);ctx.cacheReviewGroup=async items=>calls.push(items.map(x=>x.id));return{ctx,calls,disk};
}
(async()=>{
 let h=harness();await h.ctx.loadReviewPreference();assert.equal(h.ctx.reviewHub.enabled,false);h.ctx.syncReviewAutomation();assert.equal(h.calls.length,0);
 await h.ctx.setReviewEnabled(true);assert.equal(h.disk.get(KEY),true);h.ctx.syncReviewAutomation();h.ctx.syncReviewAutomation();assert.equal(h.calls.length,1);assert.deepEqual(Array.from(h.calls[0]),['1']);
 // New document restores the real preference, not a session-only UI flag.
 let next=harness(h.disk);await next.ctx.loadReviewPreference();assert.equal(next.ctx.reviewHub.enabled,true);next.ctx.syncReviewAutomation();assert.equal(next.calls.length,1);
 // Cancel/cache cleanup must not mutate the separate switch key.
 next.ctx.stopReviewWork();assert.equal(next.disk.get(KEY),true);assert.equal(next.ctx.reviewHub.enabled,true);
 next.ctx.catalogueState.rows.push({id:'3',lifecycle:'ended'});next.ctx.syncReviewAutomation();assert.equal(next.calls.length,2);
 await next.ctx.setReviewEnabled(false);assert.equal(next.disk.get(KEY),false);next.ctx.syncReviewAutomation();assert.equal(next.calls.length,2);
 const off=harness(next.disk);await off.ctx.loadReviewPreference();assert.equal(off.ctx.reviewHub.enabled,false);
 // No speculative background reads before complete trusted catalogue or during practice.
 const waiting=harness(new Map([[KEY,true]]));await waiting.ctx.loadReviewPreference();waiting.ctx.catalogueState.directoryComplete=false;waiting.ctx.catalogueState.cacheVerified=false;waiting.ctx.syncReviewAutomation();assert.equal(waiting.calls.length,0);waiting.ctx.catalogueState.directoryComplete=true;waiting.ctx.reviewHub.activeSet='1';waiting.ctx.syncReviewAutomation();assert.equal(waiting.calls.length,0);
 const failed=harness();failed.ctx.GM_setValue=async()=>{throw Error('quota');};await failed.ctx.loadReviewPreference();await failed.ctx.setReviewEnabled(true);assert.equal(failed.ctx.reviewHub.enabled,false);assert.match(failed.ctx.reviewHub.status,/保存失败/);
 assert.match(src,/reviewTools.setAttribute\('role','switch'\)/);assert.match(src,/reviewTools.setAttribute\('aria-checked'/);assert.ok(!src.includes('GM_deleteValue(REVIEW_ENABLED_KEY)'));
 console.log('PASS persistent review switch, refresh/off restoration, cache-independent preference, automatic ended-only acquisition and no polling retry storm');
})().catch(e=>{console.error(e);process.exitCode=1;});
