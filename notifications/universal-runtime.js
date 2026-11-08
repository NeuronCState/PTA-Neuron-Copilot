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
// Only extension-menu callbacks may establish trust. Never accept keys from page events.
// Capture dialogs from the userscript sandbox, not unsafeWindow or page DOM.
var inputDialog=typeof prompt==='function'?prompt.bind(globalThis):null;
var confirmDialog=typeof confirm==='function'?confirm.bind(globalThis):null;
var notifyDialog=typeof alert==='function'?alert.bind(globalThis):function(){};
async function parsePair(text){
 if(typeof text!=='string'||text.length>4096)throw Error('请粘贴完整的公钥 JSON');
 var j;try{j=JSON.parse(text);}catch(_){throw Error('不是有效的公钥 JSON');}
 var allowed=['kty','crv','x','y','ext','key_ops'];
 if(!j||Array.isArray(j)||Object.keys(j).some(function(k){return allowed.indexOf(k)<0;})||!/^[-_A-Za-z0-9]{43}$/.test(j.x||'')||!/^[-_A-Za-z0-9]{43}$/.test(j.y||''))throw Error('仅接受 PNC 公钥，不可包含私钥、令牌或其他字段');
 if(j.ext!==undefined&&j.ext!==true||j.key_ops!==undefined&&(!Array.isArray(j.key_ops)||j.key_ops.length!==1||j.key_ops[0]!=='verify'))throw Error('公钥权限不正确');
 var key=V.publicKey(j);await crypto.subtle.importKey('jwk',key,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);return key;
}
async function pairing(){var p=await get('pairing',null);return p&&typeof p.revision==='string'&&p.key?p:null;}
function requestSync(){if(isPTA&&typeof window.postMessage==='function')window.postMessage({channel:'pnc-helper-request-sync-v1'},'https://pintia.cn');}
async function status(message){await set('status',{at:Date.now(),message:message});}
if(typeof GM_registerMenuCommand==='function'){
 GM_registerMenuCommand('PNC Helper：粘贴配对公钥 / 更换配对',async function(){
  try{
   if(!inputDialog||!confirmDialog)throw Error('当前环境不支持安全输入框，请在普通网页的管理器菜单操作');
   var text=inputDialog('PNC Helper 配对：粘贴从 PNC 扩展菜单复制的公钥 JSON。不要粘贴私钥、Cookie、Token 或 API Key。','');
   if(text===null)return;
   var key=await parsePair(text);
   if(!confirmDialog('保存此公钥并替换现有配对？原提醒缓存将清空并暂停通知。请确认公钥来自你自己的 PNC。'))return;
   await lock.run(async function(){await set('paused',true);await set('accepted',null);await set('sent',{});await set('pairing',{key:key,revision:id+':'+Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-')});await status('配对已保存；请从扩展菜单授权运行，再打开 PTA 同步');});
   requestSync();
   notifyDialog('配对已保存并已更新运行状态，无需刷新页面。请点击“授权当前配对并运行”，再打开 PTA 同步。');
  }catch(e){notifyDialog('配对未保存：'+e.message);}
 });
 GM_registerMenuCommand('PNC Helper：授权当前配对并运行',async function(){
  try{await lock.run(async function(){if(!await pairing())throw Error('请先粘贴并保存配对公钥');await set('paused',false);await status('已授权配对；需在PTA同步已签名配置');});requestSync();tick();}catch(e){notifyDialog('Helper启动失败：'+e.message);}
 });
 GM_registerMenuCommand('PNC Helper：撤销配对并清空提醒缓存',async function(){
  try{if(!confirmDialog||!confirmDialog('撤销 Helper 配对、暂停通知并清空本地提醒缓存？已发出的通知无法撤回。'))return;
   await lock.run(async function(){await set('paused',true);await set('pairing',null);await set('accepted',null);await set('sent',{});await status('配对已撤销，通知已暂停');});notifyDialog('配对已撤销。');
  }catch(e){notifyDialog('撤销失败，请在管理器禁用 Helper：'+e.message);}
 });
 GM_registerMenuCommand('PNC Helper：立即暂停所有标签通知',async function(){try{await set('paused',true);await status('已在扩展菜单暂停');}catch(e){notifyDialog('暂停写入失败，请在管理器禁用Helper');}});
 GM_registerMenuCommand('PNC Helper：查看状态',async function(){var s=await get('status',null);notifyDialog(s?s.message+'\n'+new Date(s.at).toLocaleString():'尚未配对。先粘贴公钥并授权，再打开PTA。');});
}
async function receive(event){
 if(disposed||!isPTA||event.source!==window||event.origin!=='https://pintia.cn')return;
 var packet,pair;try{pair=await pairing();if(!pair)return;packet=await V.verify(crypto,pair.key,event.data,Date.now());}catch(_){return;}
 try{await lock.run(async function(){if(packet.at>Date.now()+5000||Date.now()-packet.at>90000)return;var currentPair=await pairing();if(!currentPair||currentPair.revision!==pair.revision)return;var previous=await get('accepted',null);if(previous&&packet.sequence<=previous.sequence)return;
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
 if(!await pairing())return;if(await get('paused',true)){await status('Helper已暂停，请从扩展菜单授权运行');return;}
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
