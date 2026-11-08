const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),{webcrypto}=require('crypto'),C=require('../notifications/core'),V=require('../notifications/secure-protocol'),L=require('../notifications/tab-lock');
const runtime=fs.readFileSync('notifications/universal-runtime.js','utf8'),mainBase=fs.readFileSync('notifications/main-runtime.js','utf8'),mainSecure=fs.readFileSync('notifications/secure-main.js','utf8');
const H='pnc-helper-universal-v1:',M='pnc-reminder-v2:';let offset=0;class TestDate extends Date{static now(){return Date.now()+offset;}}
(async()=>{
 const store=new Map(),tabStore={},packets=[],notifications=[],locks={};
 const get=async(k,d)=>store.has(k)?structuredClone(store.get(k)):d,set=async(k,v)=>{store.set(k,structuredClone(v));};
 const nav={locks:{request:async(name,f)=>{const p=(locks[name]||Promise.resolve()).catch(()=>{}).then(f);locks[name]=p;return p;}}};
 function makeMain(){const ui={toggle:{checked:false},days:{value:'3'},status:{textContent:''}},events={},menus=[];for(const k in ui)ui[k].addEventListener=(n,f)=>events[k]=f;
  const ctx={crypto:webcrypto,Uint32Array,TextEncoder,btoa,atob,GM_getValue:get,GM_setValue:set,GM_registerMenuCommand:(n,f)=>menus.push(f),GM_setClipboard:v=>ctx.copied=v,GM_info:{scriptHandler:'Tampermonkey'},document:{getElementById:id=>ui[id.replace('pta-deadline-reminder-','')]},location:{origin:'https://pintia.cn'},navigator:nav,window:{addEventListener:(n,f)=>events['window:'+n]=f,postMessage:(e,o)=>packets.push({e,o})},PNCReminderProtocol:V,setInterval:()=>{},alert:()=>{},getVerifiedCatalogueIdentity:()=>({userId:'10',verifiedAt:Date.now()}),catalogueCache:{owner:'10',snapshot:{complete:true,rows:[{id:'11',title:'Secret assignment',endTime:Date.now()+600000}]}},Promise,Array,Number,String,JSON};vm.createContext(ctx);vm.runInContext(mainBase+'\n'+mainSecure,ctx);ctx.ui=ui;ctx.events=events;ctx.menus=menus;return ctx;}
 const a=makeMain(),b=makeMain();await Promise.all([a.menus[0](),b.menus[0]()]);assert.equal(a.copied,b.copied,'concurrent key initialization serialized');const pub=JSON.parse(a.copied);assert.equal(pub.d,undefined);
 await a.reminderSet('control',{id:'c1',enabled:true,days:3,owner:'10',revocation:''});await a.reminderSet('snapshot',{version:1,id:'s1',owner:'10',verifiedAt:Date.now(),capturedAt:Date.now(),rows:a.catalogueCache.snapshot.rows});
 await Promise.all([a.scheduleSignedDeadlineReminder(),b.scheduleSignedDeadlineReminder()]);const seq=packets.map(p=>JSON.parse(p.e.raw).sequence);assert.equal(new Set(seq).size,seq.length);assert.ok(seq.every((v,i)=>i===0||v>seq[i-1]));assert.ok(packets.every(p=>p.o==='https://pintia.cn'&&!JSON.stringify(p.e).includes('privateKey')));
 const count=packets.length;const request={source:a.window,origin:'https://pintia.cn',data:{channel:'pnc-helper-request-sync-v1'}};a.events['window:message']({...request,origin:'https://evil.test'});assert.equal(packets.length,count);a.events['window:message'](request);for(let i=0;i<30;i++)await new Promise(r=>setTimeout(r,2));assert.ok(packets.length>count);const refreshed=packets.length;a.events['window:message'](request);for(let i=0;i<5;i++)await new Promise(r=>setTimeout(r,2));assert.equal(packets.length,refreshed,'sync requests throttled');
 function helper(origin,tab,handler='Tampermonkey'){
  const events={},menus=[],intervals=[],timers=[];const win={};win.top=win;win.self=win;win.addEventListener=(k,f)=>events[k]=f;
  const ctx={Date:TestDate,PNCDeadlineCore:C,PNCReminderProtocol:V,PNCReminderTabLock:L,crypto:webcrypto,Uint32Array,TextEncoder,btoa,atob,GM_info:{scriptHandler:handler},GM_getValue:get,GM_setValue:set,GM_getTabs:f=>f(structuredClone(tabStore)),GM_saveTab:v=>{tabStore[tab]=structuredClone(v);},GM_registerMenuCommand:(n,f)=>menus.push({n,f}),GM_notification:d=>{notifications.push({origin,d});if(handler==='ScriptCat')d.oncreate();},document:{},window:win,location:{origin},setInterval:f=>intervals.push(f),setTimeout:(f,t)=>{if(t===1000){timers.push(f);return 1;}return setTimeout(f,Math.min(t,5));},clearTimeout,prompt:()=>JSON.stringify(pub),confirm:()=>true,alert:()=>{}};vm.runInNewContext(runtime,ctx);return {events,menus,intervals,timers,ctx};
 }
 const pta=helper('https://pintia.cn',1),site=helper('https://unrelated.example',2);
 assert.equal(site.events.message,undefined,'no page message listener on other sites');assert.ok(pta.events.message);
 await pta.menus.find(m=>m.n.includes('粘贴')).f();
 assert.equal(await get(H+'paused'),true);
 await pta.menus.find(m=>m.n.includes('授权')).f();
 const last=packets.at(-1).e;await pta.events.message({source:pta.ctx.window,origin:'https://pintia.cn',data:last});
 // flush WebCrypto/storage/lock pipeline before notification timeout.
 for(let i=0;i<30;i++)await new Promise(r=>setTimeout(r,2));
 pta.timers.splice(0).forEach(f=>f());for(let i=0;i<30;i++)await new Promise(r=>setTimeout(r,2));
 assert.equal(notifications.length,1);assert.match(notifications[0].d.text,/Secret assignment/);
 const accepted=await get(H+'accepted',null);await pta.events.message({source:pta.ctx.window,origin:'https://pintia.cn',data:packets[0].e});assert.equal((await get(H+'accepted')).sequence,accepted.sequence,'replay rejected');
 const altered={...last,raw:last.raw.replace('Secret assignment','Attacker')};await pta.events.message({source:pta.ctx.window,origin:'https://pintia.cn',data:altered});assert.equal((await get(H+'accepted')).sequence,accepted.sequence,'modified payload rejected');
 // Sync a future threshold, then close PTA; other origins continue from Helper-private cache.
 await a.reminderSet('snapshot',{version:1,id:'s2',owner:'10',verifiedAt:Date.now(),capturedAt:Date.now(),rows:[{id:'12',title:'Later deadline',endTime:Date.now()+3*86400000+60000}]});
 await pta.events.message({source:pta.ctx.window,origin:'https://pintia.cn',data:packets.at(-1).e});
 for(let i=0;i<20;i++)await new Promise(r=>setTimeout(r,2));
 delete tabStore[1];await site.intervals[0]();site.timers.splice(0).forEach(f=>f());assert.equal(notifications.length,1,'requested outcome not auto-retried on Tampermonkey');
 offset=120000;const running=site.intervals[0]();for(let i=0;i<20;i++)await new Promise(r=>setTimeout(r,2));site.timers.splice(0).forEach(f=>f());await running;assert.equal(notifications.length,2);assert.equal(notifications[1].origin,'https://unrelated.example');assert.match(notifications[1].d.text,/Later deadline/);offset=0;
 await site.menus.find(m=>m.n.includes('暂停')).f();assert.equal(await get(H+'paused'),true);
 assert.ok([...store.keys()].filter(k=>k.startsWith(H)).every(k=>!k.includes('private')));
 site.events.pagehide();const before=JSON.stringify([...store]),beforeTabs=JSON.stringify(tabStore);await site.intervals[0]();assert.equal(JSON.stringify([...store]),before,'pagehide ends storage activity');assert.equal(JSON.stringify(tabStore),beforeTabs,'pagehide ends tab-lock activity');
 // Main verified new account revokes even without a completed directory, and signs that revocation.
 a.getVerifiedCatalogueIdentity=()=>({userId:'20',verifiedAt:Date.now()});a.catalogueCache.snapshot=null;await a.observeDeadlineReminderOwner('20');assert.match(await get(M+'revocation',''),/^verified-account-changed:/);assert.match(JSON.parse(packets.at(-1).e.raw).revocation,/verified-account-changed/);
 console.log('PASS real main signing serialization→verified Helper GM chain, explicit menu permission, cross-origin isolation, tamper/replay, no TM timeout retry, account revoke');
})().catch(e=>{console.error(e);process.exitCode=1;});
