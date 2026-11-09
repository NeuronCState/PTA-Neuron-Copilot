const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),core=require('../notifications/core.js');
let now=1800000000000;const DAY=86400000,P='pnc-reminder-v2:';
const rows=[{id:'1',title:'Alpha',endTime:now+DAY},{id:'2',title:'Beta',endTime:now+2*DAY}],snap={version:1,id:'snapshot',owner:'10',verifiedAt:now,capturedAt:now,rows};
assert.equal(core.due(snap,{enabled:true,days:2},{},now).length,1);
assert.equal(core.snapshot({...snap,rows:Array.from({length:501},(_,i)=>({id:String(i),title:'Q',endTime:now+DAY}))},now).rows.length,501);
assert.equal(core.snapshot({...snap,rows:Array(10001).fill(rows[0])},now),null);
assert.equal(core.snapshot({...snap,owner:'x'},now),null);assert.equal(core.remaining(1),'1分钟');
async function harness({failure=false,initial={}}={}){
 const store=new Map(Object.entries(initial)),access=[],notifications=[],listeners={},intervals=[],events={},timeouts=[],ui={},hooks={};
 for(const id of ['toggle','days','status'])ui[id]={checked:false,value:'2',textContent:'',addEventListener:(event,f)=>events[id]=f};
 let seq=1;const fakeDate=class extends Date{static now(){return now;}};
 const get=async(k,d)=>{access.push(k);return store.has(k)?structuredClone(store.get(k)):d;};
 const set=async(k,v)=>{access.push(k);store.set(k,structuredClone(v));if(hooks.set)await hooks.set(k,v);if(listeners[k])listeners[k]();};
 const bg={PNCDeadlineCore:core,GM_info:{scriptHandler:'ScriptCat'},Date:fakeDate,GM:{getValue:get,setValue:set},GM_notification:d=>{notifications.push(d);if(failure)throw Error('denied');d.oncreate();},GM_addValueChangeListener:(k,f)=>listeners[k]=f,setInterval:f=>intervals.push(f),setTimeout:f=>{timeouts.push(f);return timeouts.length;},clearTimeout:()=>{}};
 vm.runInNewContext(fs.readFileSync('notifications/background-runtime.js','utf8'),bg);
 const main={GM_info:{scriptHandler:'ScriptCat'},GM_getValue:get,GM_setValue:set,document:{getElementById:id=>ui[id.replace('pta-deadline-reminder-','')]},Date:fakeDate,crypto:{getRandomValues:a=>{a.fill(seq++);return a;}},Uint32Array,Promise,Array,Number,String,JSON,setInterval:f=>intervals.push(f),getVerifiedCatalogueIdentity:()=>({userId:'10',verifiedAt:now}),catalogueCache:{owner:'10',snapshot:{complete:true,rows}}};
 vm.runInNewContext(fs.readFileSync('notifications/main-runtime.js','utf8')+';bindDeadlineReminderUI();',main);
 async function flush(){for(let i=0;i<200;i++)await Promise.resolve();}
 await flush();return {hooks,store,access,notifications,main,ui,events,intervals,flush,async tick(){intervals[0]();await flush();}};
}
(async()=>{
 let h=await harness();assert.equal(h.notifications.length,0);h.ui.toggle.checked=true;await h.events.toggle({isTrusted:false});await h.flush();assert.ok(!h.store.has(P+'control'),'synthetic DOM change cannot authorize');
 h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();await h.tick();assert.equal(h.notifications.length,1,'main→GM snapshot→background notification');assert.match(h.notifications[0].text,/Alpha/);
 await h.tick();assert.equal(h.notifications.length,1,'dedup');assert.ok(h.access.every(k=>[P+'control',P+'snapshot',P+'revocation',P+'state',P+'status'].includes(k)),'never access other keys');
 await h.main.syncDeadlineReminderV2();assert.equal(h.main.reminderV2.pendingSnapshot,null,'snapshot acknowledgement consumed');
 let restart=await harness({initial:Object.fromEntries(h.store)});await restart.tick();assert.equal(restart.notifications.length,0,'restart dedup');
 await h.main.revokeDeadlineReminders('login-invalid');await h.flush();h.store.set(P+'snapshot',{...snap,rows:[{id:'3',title:'new',endTime:now+5000}]});await h.tick();assert.equal(h.notifications.length,1,'revocation blocks old account');
 h=await harness({failure:true});h.main.catalogueCache.snapshot.rows=[rows[0]];h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();await h.tick();assert.equal(h.notifications.length,1);await h.tick();assert.equal(h.notifications.length,1,'failure backoff');now+=60001;await h.tick();assert.equal(h.notifications.length,2,'failed creation retried');
 for(let i=0;i<6;i++){now+=60000*Math.pow(2,i+1)+1;await h.tick();}assert.equal(h.notifications.length,5,'exactly five attempts then stop');
 h=await harness();h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();const count=h.notifications.length;h.store.set(P+'snapshot',{...snap,owner:'11',capturedAt:now});await h.tick();assert.match(h.store.get(P+'revocation'),/^account:/);assert.equal(h.notifications.length,count,'owner mismatch cannot send');
 h=await harness();h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();await h.tick();const concurrent=h.notifications.length;for(let i=0;i<100;i++)h.intervals[0]();await h.flush();assert.equal(h.notifications.length,concurrent,'overlapping callbacks serialized');
 // Same millisecond: latest actual storage command wins, no timestamp order comparator.
 h=await harness();h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});h.ui.toggle.checked=false;await h.events.toggle({isTrusted:true});await h.flush();const ctl=h.store.get(P+'control');assert.equal(ctl.enabled,false);const before=h.notifications.length;await h.tick();assert.equal(h.notifications.length,before);
 h=await harness();h.main.catalogueCache.snapshot.rows=Array.from({length:501},(_,i)=>({id:String(i),title:'Q',endTime:now+DAY}));h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();assert.equal(h.store.get(P+'snapshot').rows.length,501,'real main chain preserves over500');
 h=await harness();h.main.catalogueCache.snapshot.rows=Array(10001).fill(rows[0]);h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();assert.equal(h.store.get(P+'snapshot'),null);assert.match(h.ui.status.textContent,/10000/);
 // A newly verified owner invalidates authorization even while their directory is missing/incomplete.
 for(const directory of [null,{complete:false,rows:[]}]){
  h=await harness();h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();await h.tick();const before=h.notifications.length;
  h.main.getVerifiedCatalogueIdentity=()=>({userId:'11',verifiedAt:now});h.main.catalogueCache.owner='11';h.main.catalogueCache.snapshot=directory;
  await h.main.syncDeadlineReminderV2();await h.flush();assert.match(h.store.get(P+'revocation'),/^verified-account-changed:/);assert.equal(h.ui.toggle.checked,false);
  h.store.set(P+'snapshot',{...snap,capturedAt:now,rows:[{id:'9',title:'old account',endTime:now+1000}]});await h.tick();assert.equal(h.notifications.length,before,'incomplete new directory cannot leave old account active');
 }
 // Interleave actual main publication between background reservation and dispatch.
 h=await harness();h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();await h.tick();const beforePostpone=h.notifications.length;let interleaved=false;
 h.hooks.set=async(k,v)=>{if(!interleaved&&k===P+'state'&&Object.values(v.sent||{}).some(e=>e.status==='pending')){
   interleaved=true;h.main.catalogueCache.snapshot={complete:true,rows:[{id:'99',title:'postponed',endTime:now+10*DAY}]};await h.main.syncDeadlineReminderV2();
 }};
 h.main.catalogueCache.snapshot={complete:true,rows:[{id:'99',title:'original due',endTime:now+1000}]};await h.main.syncDeadlineReminderV2();await h.flush();await h.tick();
 assert.equal(interleaved,true);assert.equal(h.notifications.length,beforePostpone,'updated snapshot id cancels old deadline batch');
 assert.ok(!Object.keys(h.store.get(P+'state').sent).some(k=>k.includes(':99:')),'cancelled attempt does not reserve or consume retry');
 await h.tick();assert.equal(h.notifications.length,beforePostpone,'postponed deadline remains quiet');
 const main=fs.readFileSync('PNC.user.js','utf8');h=await harness();h.ui.toggle.checked=true;await h.events.toggle({isTrusted:true});await h.flush();await h.tick();
 h.main.catalogueIdentity=null;h.main.cataloguePersistence={generation:0,stored:null};h.main.clearCatalogueCache=()=>{h.main.catalogueCache.owner=null;h.main.catalogueCache.snapshot=null;};
 vm.runInNewContext(main.slice(main.indexOf('    function catalogueCacheOwner('),main.indexOf('    function catalogueCacheWrite(')),h.main);
 h.main.catalogueCacheOwner({},{userId:'11'});await h.flush();assert.match(h.store.get(P+'revocation'),/^verified-account-changed:/,'actual API owner verification hook revokes before any directory completes');
 assert.ok(main.includes(fs.readFileSync('notifications/main-runtime.js','utf8')),'tested main module is embedded verbatim');assert.doesNotMatch(main,/^\/\/ @storageName/m);assert.ok(!fs.existsSync('notifications/PNC Deadline Bridge-2.1.0-beta.1.user.js'));
 assert.doesNotMatch(fs.readFileSync('notifications/background-runtime.js','utf8'),/listValues|fetch\(|document\.|postMessage/);assert.doesNotMatch(fs.readFileSync('notifications/main-runtime.js','utf8'),/postMessage/);
 console.log('PASS direct trusted GM chain, synthetic-event rejection, 501/10001 rows, opt-out, revocation, retry/backoff, restart dedup, same-ms last write, fixed-key scope');
})().catch(e=>{console.error(e);process.exitCode=1;});
