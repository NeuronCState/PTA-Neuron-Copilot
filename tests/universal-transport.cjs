const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
const C=require('../notifications/core'),V=require('../notifications/secure-protocol'),L=require('../notifications/tab-lock');
const mainCode=fs.readFileSync('notifications/main-runtime.js','utf8')+'\n'+fs.readFileSync('notifications/secure-main.js','utf8'),helperCode=fs.readFileSync('notifications/universal-runtime.js','utf8');
(async()=>{
 for(const mode of ['proxy-window','dom-only','both']){
  const mainStore=new Map(),helperStore=new Map(),tabs={},menus=new Map(),events={main:{},helper:{}},dom={main:{},helper:{}},pending=[],messages=[],domMessages=[];let input='';
  const get=(store)=>(k,d)=>store.has(k)?structuredClone(store.get(k)):d,set=store=>(k,v)=>store.set(k,structuredClone(v));
  const ui={toggle:{checked:true},days:{value:'3'},status:{textContent:''}};
  function emit(from,data){messages.push(data);if(mode==='dom-only')return;const to=from==='main'?'helper':'main',f=events[to].message;if(f)pending.push(Promise.resolve(f({origin:'https://pintia.cn',source:{differentSandboxProxy:true},data:structuredClone(data)})));}
  class CustomEvent {constructor(type,init={}){this.type=type;this.detail=init.detail;}}
  function doc(side){return {getElementById:id=>ui[id.replace('pta-deadline-reminder-','')],addEventListener:(name,f)=>dom[side][name]=f,dispatchEvent:e=>{domMessages.push(e);if(mode==='proxy-window')return true;const f=dom[side==='main'?'helper':'main'][e.type];if(f)pending.push(Promise.resolve(f(e)));return true;}};}
  const win=side=>{const w={postMessage:data=>emit(side,data),addEventListener:(name,f)=>events[side][name]=f};w.top=w;w.self=w;return w;};
  const common={crypto:webcrypto,Uint32Array,TextEncoder,btoa,atob,Date,setTimeout,clearTimeout,setInterval:()=>{},CustomEvent,location:{origin:'https://pintia.cn'},alert:()=>{},PNCReminderProtocol:V};
  const main={...common,document:doc('main'),window:win('main'),navigator:{locks:{request:(n,f)=>f()}},GM_getValue:get(mainStore),GM_setValue:set(mainStore),getVerifiedCatalogueIdentity:()=>({userId:'10',verifiedAt:Date.now()}),catalogueCache:{owner:'10',snapshot:{complete:true,rows:[]}}};
  vm.createContext(main);vm.runInContext(mainCode,main);const key=await main.reminderSigningState();input=JSON.stringify(key.publicKey);
  const helper={...common,document:doc('helper'),window:win('helper'),GM_info:{scriptHandler:'Tampermonkey'},PNCDeadlineCore:C,PNCReminderTabLock:L,GM_getValue:get(helperStore),GM_setValue:set(helperStore),GM_getTabs:f=>f(structuredClone(tabs)),GM_saveTab:v=>tabs.self=structuredClone(v),GM_registerMenuCommand:(n,f)=>menus.set(n,f),GM_notification:()=>assert.fail('no due assignments'),prompt:()=>input,confirm:()=>true};vm.runInNewContext(helperCode,helper);
  async function flush(){for(let i=0;i<30;i++){await Promise.all(pending.splice(0));await new Promise(r=>setTimeout(r,2));}}
  await menus.get('配对')();await flush();assert.ok(messages.some(p=>p.channel==='pnc-helper-request-sync-v1'));assert.ok(domMessages.some(p=>p.type==='pnc-helper-request-sync-v1'));
  await main.reminderSet('control',{id:'c',enabled:true,days:3,owner:'10',revocation:''});await main.reminderSet('snapshot',{version:1,id:'s',owner:'10',verifiedAt:Date.now(),capturedAt:Date.now(),rows:[]});await flush();
  const accepted=helperStore.get('pnc-helper-universal-v1:accepted');assert.equal(accepted.snapshot.owner,'10',mode+' sync despite different source wrapper');assert.equal(accepted.control.enabled,true);const seq=accepted.sequence;
  const signed=messages.filter(e=>e.channel===V.CHANNEL).at(-1);assert.ok(signed);assert.ok(domMessages.some(e=>e.type==='pnc-helper-signed-sync-v1'&&typeof e.detail==='string'));assert.doesNotMatch(JSON.stringify([...messages,...domMessages]),/privateKey|"d":/);
  // Forged, wrong-origin, stale and duplicate packets cannot replace accepted state.
  await events.helper.message({origin:'https://evil.example',source:helper.window,data:signed});
  await dom.helper['pnc-helper-signed-sync-v1']({detail:JSON.stringify({...signed,raw:signed.raw.replace('"enabled":true','"enabled":false')})});
  await dom.helper['pnc-helper-signed-sync-v1']({detail:JSON.stringify(signed)});
  await dom.helper['pnc-helper-signed-sync-v1']({detail:{...signed}});await dom.helper['pnc-helper-signed-sync-v1']({detail:'x'.repeat(8*1024*1024+1025)});
  assert.equal(helperStore.get('pnc-helper-universal-v1:accepted').sequence,seq);assert.equal(helperStore.get('pnc-helper-universal-v1:accepted').control.enabled,true);
  assert.equal(helperStore.has('pnc-reminder-signing-v1'),false,'separate stores');
 }
 console.log('PASS actual main/Helper modules through proxy-window, DOM-only, dual transports; untrusted request cannot grant permission; signed tamper/replay/origin/size checks and private-store separation');
})().catch(e=>{console.error(e);process.exitCode=1});
