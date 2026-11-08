const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
const V=require('../notifications/secure-protocol'),C=require('../notifications/core'),L=require('../notifications/tab-lock');
const code=fs.readFileSync('notifications/universal-runtime.js','utf8'),P='pnc-helper-universal-v1:';
(async()=>{
 const store=new Map(),tabs={};let input=null,confirmation=true,alerts=[],requests=[],serial=0;
 const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const pub=await webcrypto.subtle.exportKey('jwk',pair.publicKey),priv=await webcrypto.subtle.exportKey('jwk',pair.privateKey);
 function launch(handler){const events={},menus=new Map(),id=++serial,win={postMessage:(data,origin)=>requests.push({data,origin}),addEventListener:(n,f)=>events[n]=f};win.top=win;win.self=win;
 const ctx={PNCDeadlineCore:C,PNCReminderProtocol:V,PNCReminderTabLock:L,crypto:webcrypto,Uint32Array,Date,document:{},location:{origin:'https://pintia.cn'},window:win,
 GM_info:{scriptHandler:handler},GM_getValue:(k,d)=>store.has(k)?structuredClone(store.get(k)):d,GM_setValue:(k,v)=>store.set(k,structuredClone(v)),GM_getTabs:f=>f(structuredClone(tabs)),GM_saveTab:v=>tabs[id]=structuredClone(v),GM_registerMenuCommand:(n,f)=>menus.set(n,f),GM_notification:()=>assert.fail('notification not expected'),prompt:()=>input,confirm:()=>confirmation,alert:v=>alerts.push(v),setInterval:()=>{},setTimeout,clearTimeout};vm.runInNewContext(code,ctx);
 return {ctx,events,menu:label=>[...menus].find(([n])=>n.includes(label))[1]()};}
 const a=launch('Tampermonkey');assert.equal(store.size,0);await a.menu('授权');assert.equal(store.get(P+'paused'),undefined);
 input=null;await a.menu('粘贴');assert.equal(store.size,0);
 for(const bad of ['not json',JSON.stringify(priv),JSON.stringify({...pub,x:'bad'}),JSON.stringify({...pub,apiKey:'secret'}),JSON.stringify({...pub,x:'A'.repeat(43),y:'A'.repeat(43)})]){input=bad;await a.menu('粘贴');assert.equal(store.size,0);}
 input=JSON.stringify(pub);confirmation=false;await a.menu('粘贴');assert.equal(store.size,0);confirmation=true;
 a.ctx.prompt=()=>assert.fail('page replacement must not capture key');await a.menu('粘贴');assert.equal(store.get(P+'paused'),true);const original=store.get(P+'pairing');assert.equal(original.key.d,undefined);assert.match(alerts.at(-1),/配对已保存/);assert.equal(requests.length,1);assert.equal(requests[0].origin,'https://pintia.cn');assert.deepEqual(Object.keys(requests[0].data),['channel']);
 const b=launch('ScriptCat');await b.menu('授权');assert.equal(store.get(P+'paused'),false,'paired key survives fresh document');assert.equal(requests.length,2,'authorization requests immediate sync');
 const packet=await V.sign(webcrypto,priv,{version:1,sequence:1,at:Date.now(),control:null,revocation:'',snapshot:null});await a.events.message({source:a.ctx.window,origin:'https://pintia.cn',data:packet});assert.equal(store.get(P+'accepted').sequence,1);
 // Verification started under old trust must not complete after revoke/re-pair, even same key.
 let release,started;const gate=new Promise(r=>started=r),normal=V.verify;V.verify=async(...args)=>{started();await new Promise(r=>release=r);return normal(...args);};
 const pending=a.events.message({source:a.ctx.window,origin:'https://pintia.cn',data:packet});await gate;await b.menu('撤销');assert.equal(store.get(P+'pairing'),null);assert.equal(store.get(P+'accepted'),null);await b.menu('粘贴');assert.notEqual(store.get(P+'pairing').revision,original.revision);release();await pending;V.verify=normal;assert.equal(store.get(P+'accepted'),null,'in-flight old trust discarded');
 await b.menu('撤销');await a.events.message({source:a.ctx.window,origin:'https://pintia.cn',data:packet});assert.equal(store.get(P+'pairing'),null,'old tab cannot restore revoked key');assert.equal(store.get(P+'accepted'),null);
 console.log('PASS menu-only pairing, cancel, malformed/private/extra/off-curve keys, confirmation, persistent GM trust, TM/ScriptCat API models, revoke/re-pair race and old-tab rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
