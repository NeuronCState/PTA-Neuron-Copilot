const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const C=require('../notifications/core'),V=require('../notifications/secure-protocol'),L=require('../notifications/tab-lock');
const now=Date.now(),rows=Array.from({length:5},(_,i)=>({id:String(i+1),title:'题集'+(i+1),endTime:now+600000+i*1000,href:'https://evil.example/'}));
for(const id of ['1/../../2','1?redirect=evil','javascript:alert(1)','https://evil.example','1#x','a',1,'1'.repeat(26)])assert.equal(C.notificationDetails({...rows[0],id},'10',3,now),null);
assert.equal(C.notificationDetails({...rows[0],endTime:now},'10',3,now),null);
assert.equal(C.notificationDetails(rows[0],'evil',3,now),null);
assert.equal(C.notificationDetails(rows[0],'10',3,now).url,'https://pintia.cn/problem-sets/1/exam');
(async()=>{
 for(const mode of ['universal','background']){
  const P=mode==='universal'?'pnc-helper-universal-v1:':'pnc-reminder-v2:',store=new Map(),calls=[],intervals=[],tabs={};
  const control={id:'c',enabled:true,days:3,owner:'10',revocation:''},snapshot={version:1,id:'s',owner:'10',verifiedAt:now,capturedAt:now,rows};
  if(mode==='universal'){store.set(P+'pairing',{revision:'r',key:{x:'a',y:'b'}});store.set(P+'paused',false);store.set(P+'accepted',{sequence:1,at:now,control,snapshot,revocation:''});}
  else {store.set(P+'control',control);store.set(P+'snapshot',snapshot);store.set(P+'revocation','');}
  const get=(k,d)=>store.has(k)?structuredClone(store.get(k)):d,set=(k,v)=>store.set(k,structuredClone(v));
  const win={addEventListener:()=>{}};win.top=win;win.self=win;
  const ctx={PNCDeadlineCore:C,PNCReminderProtocol:V,PNCReminderTabLock:L,crypto:webcrypto,Uint32Array,Date,document:{},location:{origin:'https://pintia.cn'},window:win,GM_info:{scriptHandler:'ScriptCat'},GM_getValue:get,GM_setValue:set,GM:{getValue:get,setValue:set},GM_getTabs:f=>f(structuredClone(tabs)),GM_saveTab:v=>tabs.tab=structuredClone(v),GM_registerMenuCommand:()=>{},GM_notification:d=>{calls.push(d);d.oncreate();},setInterval:f=>intervals.push(f),setTimeout,clearTimeout};
  vm.runInNewContext(fs.readFileSync('notifications/'+(mode==='universal'?'universal-runtime':'background-runtime')+'.js','utf8'),ctx);
  async function flush(){for(let i=0;i<150;i++)await Promise.resolve();}
  await flush();assert.equal(calls.length,3,mode+' first check capped at three');
  const sent=mode==='universal'?store.get(P+'sent'):store.get(P+'state').sent;assert.equal(Object.keys(sent).length,3,'undispatched items are not reserved');
  await intervals[0]();await flush();assert.equal(calls.length,5,mode+' later check delivers remaining items');
  assert.equal(new Set(calls.map(d=>d.tag)).size,5,'unique tags do not replace each other');
  for(let i=0;i<5;i++){assert.equal(calls[i].url,'https://pintia.cn/problem-sets/'+(i+1)+'/exam');assert.match(calls[i].text,new RegExp('题集'+(i+1)));assert.doesNotMatch(calls[i].text,/evil/);}
  await intervals[0]();await flush();assert.equal(calls.length,5,'per-item dedupe');
 }
 console.log('PASS one-notification-one-target, fixed HTTPS PTA URL, malicious IDs/href rejected, five items across checks, unique tags and per-item dedupe in universal/background modules');
})().catch(e=>{console.error(e);process.exitCode=1});
