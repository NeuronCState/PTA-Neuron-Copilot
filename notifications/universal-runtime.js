/* Universal top-frame helper. No credentials, DOM reads, or data messages on other sites. */
(function(){
'use strict';
var C=PNCDeadlineCore,V=PNCReminderProtocol,P='pnc-helper-universal-v1:',busy=false;
var disposed=false,tabRegistered=false;
function alive(){if(disposed)throw Error('page lifecycle ended; reload required');}
var get=async function(k,d){alive();var v=await Promise.resolve(GM_getValue(P+k,d));alive();return v;},set=async function(k,v){alive();await Promise.resolve(GM_setValue(P+k,v));alive();};
var hasDOM=typeof document!=='undefined',isPTA=hasDOM&&location.origin==='https://pintia.cn';
if(hasDOM&&window.top!==window.self)return;
// BFCache documents must never resume a prior critical section after a replacement document.
if(hasDOM)window.addEventListener('pagehide',function(){
 if(disposed)return;disposed=true;
 // This one synchronous teardown write bypasses alive(): no unload timer or async cleanup.
 // Manager IPC must preserve per-tab write order. Already-issued writes cannot be cancelled.
 if(tabRegistered&&typeof GM_saveTab==='function'){try{var end=GM_saveTab({pncReminderLock:{id:id,choosing:false,ticket:0}});if(end&&typeof end.catch==='function')end.catch(function(){});}catch(_){/* Manager teardown failure: closing the tab may be required. */}}
});
var id=Array.from(crypto.getRandomValues(new Uint32Array(4))).map(function(n){return n.toString(16);}).join('-');
var lock;
if(hasDOM){
 if(typeof GM_getTabs!=='function'||typeof GM_saveTab!=='function'){if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('PNC Helper：管理器缺少跨标签互斥接口，未启用',function(){alert('需要支持 GM_getTabs/GM_saveTab 的篡改猴或脚本猫版本。');});return;} // No unsafe lease-election fallback.
 lock=PNCReminderTabLock.create({tabs:function(){alive();return new Promise(function(resolve,reject){var t=setTimeout(function(){reject(Error('tab API timeout'));},5000);try{GM_getTabs(function(x){clearTimeout(t);try{alive();resolve(x||{});}catch(e){reject(e);}});}catch(e){clearTimeout(t);reject(e);}});},save:async function(v){alive();tabRegistered=true;await Promise.resolve(GM_saveTab(v));alive();},delay:function(ms){return new Promise(function(r){setTimeout(r,ms);});}},id);
}else{
 // Optional ScriptCat @background mode: exactly one installed Helper, no page workers.
 if(typeof GM_info==='undefined'||GM_info.scriptHandler!=='ScriptCat')return;
 var queue=Promise.resolve();lock={run:function(fn){var p=queue.catch(function(){}).then(fn);queue=p;return p;}};
}
var paired;
try{paired=V.publicKey(PNC_HELPER_PUBLIC_KEY);}catch(_){
 if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('PNC Helper：未配对，打开脚本编辑器填写公钥',function(){alert('请从PNC扩展菜单复制配对公钥，手动填入Helper的PNC_HELPER_PUBLIC_KEY。不要填私钥、Token或API Key。');});return;
}
var pairId=JSON.stringify(paired);
async function ensurePair(){var old=await get('pair',null);if(old!==pairId){await set('paused',true);await set('accepted',null);await set('sent',{});await set('pair',pairId);}}
async function status(message){await set('status',{at:Date.now(),message:message});}
if(typeof GM_registerMenuCommand==='function'){
 GM_registerMenuCommand('PNC Helper：授权当前配对并运行',async function(){
  try{await lock.run(async function(){await ensurePair();await set('paused',false);await status('已授权配对；需在PTA同步已签名配置');});tick();}catch(e){alert('Helper启动失败：'+e.message);}
 });
 GM_registerMenuCommand('PNC Helper：立即暂停所有标签通知',async function(){try{await set('paused',true);await status('已在扩展菜单暂停');}catch(e){alert('暂停写入失败，请在管理器禁用Helper');}});
 GM_registerMenuCommand('PNC Helper：查看状态',async function(){var s=await get('status',null);alert(s?s.message+'\n'+new Date(s.at).toLocaleString():'尚未同步。先授权配对，再打开PTA。');});
}
async function receive(event){
 if(disposed||!isPTA||event.source!==window||event.origin!=='https://pintia.cn')return;
 var packet;try{packet=await V.verify(crypto,paired,event.data,Date.now());}catch(_){return;}
 try{await lock.run(async function(){if(packet.at>Date.now()+5000||Date.now()-packet.at>90000)return;await ensurePair();var previous=await get('accepted',null);if(previous&&packet.sequence<=previous.sequence)return;
  var ctl=packet.control,rev=packet.revocation,snap=C.snapshot(packet.snapshot,Date.now(),true);
  if(typeof rev!=='string'||rev.length>512)return;
  if(ctl!==null&&(!ctl||typeof ctl.id!=='string'||ctl.id.length>128||typeof ctl.enabled!=='boolean'||!Number.isInteger(ctl.days)||ctl.days<1||ctl.days>30||typeof ctl.revocation!=='string'||ctl.revocation.length>512||ctl.enabled&&!/^\d{1,25}$/.test(ctl.owner||'')))return;
  // Store only normalized reminder data, never arbitrary object fields from the message.
  await set('accepted',{sequence:packet.sequence,at:packet.at,control:ctl?{id:ctl.id,enabled:ctl.enabled,days:ctl.days,owner:ctl.owner,revocation:ctl.revocation}:null,revocation:rev,snapshot:snap});
  await status('已验证并同步签名配置；通知按最后同步截止时间计算');
 });tick();}catch(_){/* Busy/frozen tab: next signed heartbeat will retry. */}
}
if(isPTA)window.addEventListener('message',receive);
function notification(details){
 alive();return new Promise(function(resolve){var finished=false;function done(state){if(!finished){finished=true;resolve(state);}}
  try{
   var result=GM_notification(Object.assign({},details,{oncreate:function(){done('created');}}));
   if(result&&typeof result.then==='function')result.then(function(){done('requested');},function(){done('failed');});
   // Tampermonkey provides no creation ACK. Do not interpret a missing ScriptCat callback as failure.
   setTimeout(function(){done('requested');},1000);
  }catch(_){done('failed');}
 });
}
async function tick(){if(disposed||busy)return;busy=true;try{
 var preview=await get('accepted',null),prior=await get('sent',{});
 if(await get('paused',true)||!preview||!preview.control||!preview.control.enabled||preview.control.revocation!==preview.revocation||!preview.snapshot||preview.snapshot.owner!==preview.control.owner)return;
 if(!C.due(preview.snapshot,preview.control,{},Date.now()).some(function(r){var e=prior&&prior[C.key(preview.snapshot.owner,r,preview.control.days)];return !e||e.state==='failed'&&e.attempts<5&&Date.now()>=e.retryAt;}))return;
 await lock.run(async function(){
 await ensurePair();if(await get('paused',true)){await status('Helper已暂停，请从扩展菜单授权运行');return;}
 var raw=await get('accepted',null),ctl=raw&&raw.control,snap=raw&&raw.snapshot,now=Date.now();
 if(!ctl||!ctl.enabled||ctl.revocation!==raw.revocation||!snap||snap.owner!==ctl.owner){await status('等待有效签名配置或提醒已关闭');return;}
 var sent=await get('sent',{});if(!sent||typeof sent!=='object')sent={};
 var due=C.due(snap,ctl,{},now).filter(function(r){var e=sent[C.key(snap.owner,r,ctl.days)];return !e||e.state==='failed'&&e.attempts<5&&now>=e.retryAt;}).slice(0,20);
 if(!due.length)return;
 var latest=await get('accepted',null);if(await get('paused',true)||!latest||latest.sequence!==raw.sequence)return;
 var batch=due.map(function(r){return C.key(snap.owner,r,ctl.days);});
 // Reserve before dispatch; unknown outcomes are not automatically retried.
 batch.forEach(function(k){var e=sent[k];sent[k]={state:'requested',attempts:(e&&e.attempts||0)+1,retryAt:now+60000};});await set('sent',sent);
 latest=await get('accepted',null);if(await get('paused',true)||!latest||latest.sequence!==raw.sequence){batch.forEach(function(k){delete sent[k];});await set('sent',sent);return;}
 var outcome=await notification({title:'PNC · '+due.length+' 个题集即将截止',text:due.slice(0,4).map(function(r){return r.title+'：剩余'+C.remaining(r.endTime-Date.now());}).join('\n'),tag:'pnc-helper-'+ctl.owner,url:'https://pintia.cn/problem-sets',timeout:0});
 batch.forEach(function(k){sent[k].state=outcome;sent[k].retryAt=Date.now()+Math.min(86400000,60000*Math.pow(2,sent[k].attempts-1));});await set('sent',sent);
 await status(outcome==='failed'?'通知调用明确失败，将有限退避重试':'已请求通知，系统权限/静音可能阻止显示；不重复请求未知结果');
 });}catch(_){/* Frozen holders delay reminders instead of stealing a lock. */}finally{busy=false;}}
tick();setInterval(tick,30000);
})();
