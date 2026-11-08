const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),{webcrypto}=require('crypto');
const runtime=fs.readFileSync('notifications/universal-runtime.js','utf8'),C=require('../notifications/core'),V=require('../notifications/secure-protocol'),L=require('../notifications/tab-lock');
(async()=>{
 const key=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),pub=await webcrypto.subtle.exportKey('jwk',key.publicKey);
 const table={},store=new Map();let holdPair=null;const flush=()=>new Promise(r=>setImmediate(r));
 function make(tab,{queued=false}={}){
  const events={},menus=[],writes=[];let ipc=Promise.resolve(),held=true;const pending=[];
  const ctx={crypto:webcrypto,Uint32Array,PNCDeadlineCore:C,PNCReminderProtocol:V,PNCReminderTabLock:L,PNC_HELPER_PUBLIC_KEY:pub,Date,document:{},location:{origin:'https://example.test'},window:null,
   GM_getValue:async(k,d)=>{if(holdPair&&holdPair.tab===tab&&k.endsWith(':pair'))await holdPair.wait;return store.has(k)?structuredClone(store.get(k)):d;},GM_setValue:async(k,v)=>store.set(k,structuredClone(v)),
   GM_getTabs:f=>f(structuredClone(table)),GM_saveTab:v=>{writes.push(structuredClone(v));if(!queued){table[tab]=structuredClone(v);return;}const next=ipc.then(()=>new Promise(resolve=>{const apply=()=>{table[tab]=structuredClone(v);resolve();};if(held)pending.push(apply);else apply();}));ipc=next;return next;},GM_registerMenuCommand:(n,f)=>menus.push({n,f}),GM_notification:()=>assert.fail('not authorized to notify'),setInterval:()=>{},setTimeout,clearTimeout,alert:()=>{}};
  const win={addEventListener:(n,f)=>events[n]=f};win.top=win;win.self=win;ctx.window=win;vm.runInNewContext(runtime,ctx);
  return {events,writes,authorize:()=>menus.find(m=>m.n.includes('授权')).f(),releaseIPC:async()=>{held=false;pending.splice(0).forEach(f=>f());await ipc;}};
 }
 // Before participating, pagehide must not create/overwrite any tab record.
 const unused=make(0);unused.events.pagehide();assert.equal(unused.writes.length,0);
 // Held critical section -> pagehide -> no replacement document (restricted URL).
 const owner=make(1),other=make(2);let unblock;holdPair={tab:1,wait:new Promise(r=>unblock=r)};
 const first=owner.authorize();for(let i=0;i<20&&!table[1]?.pncReminderLock.ticket;i++)await flush();assert.ok(table[1].pncReminderLock.ticket>0);
 owner.events.pagehide();assert.equal(table[1].pncReminderLock.ticket,0);await other.authorize();const after=JSON.stringify(table);unblock();await first;assert.equal(JSON.stringify(table),after,'old continuation cannot rewrite lock');holdPair=null;
 // Nonzero acquisition already queued: FIFO asynchronous manager IPC must end with zero.
 const acquiring=make(3,{queued:true}),pending=acquiring.authorize();for(let i=0;i<20&&!acquiring.writes.length;i++)await flush();assert.ok(acquiring.writes[0].pncReminderLock.choosing);
 acquiring.events.pagehide();assert.equal(acquiring.writes.at(-1).pncReminderLock.ticket,0);await acquiring.releaseIPC();await pending;assert.equal(table[3].pncReminderLock.ticket,0);assert.equal(table[3].pncReminderLock.choosing,false);await other.authorize();
 console.log('PASS pagehide while held/acquiring, restricted-page no replacement, FIFO asynchronous IPC teardown, old continuation stopped, unused document no lock write');
})().catch(e=>{console.error(e);process.exitCode=1;});
