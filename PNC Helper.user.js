// ==UserScript==
// @name         PNC Helper
// @namespace    https://pintia.cn/pnc-reminders/
// @version      1.0.0-beta.3
// @description  通用倒计时提醒；需手动公钥配对并在扩展菜单授权
// @match        http://*/*
// @match        https://*/*
// @noframes
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_getTabs
// @grant        GM_saveTab
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function(){
"use strict";
var PNCDeadlineCore=(function(){var module={exports:{}};
/* PNC deadline reminders: pure, offline-only input validation and due selection. */
(function(root){
'use strict';
var DAY=86400000;
function config(x){return {enabled:!!x&&x.enabled===true,days:x&&Number.isInteger(x.days)&&x.days>=1&&x.days<=30?x.days:3};}
function snapshot(x,now,stored){
 if(stored&&(!x||!Number.isFinite(x.capturedAt)||x.capturedAt>now+5000))return null;
 if(!x||x.version!==1||typeof x.id!=='string'||!x.id||x.id.length>128||!/^\d{1,25}$/.test(x.owner||'')||!Number.isFinite(x.verifiedAt)||x.verifiedAt>now+5000||(!stored&&now-x.verifiedAt>120000)||!Array.isArray(x.rows)||x.rows.length>10000)return null;
 var rows=[],seen=new Set();
 x.rows.forEach(function(r){if(!r||!/^\d{1,25}$/.test(r.id||'')||seen.has(r.id)||!Number.isFinite(r.endTime)||r.endTime<0||r.endTime>now+5*366*DAY)return;seen.add(r.id);rows.push({id:r.id,title:typeof r.title==='string'?r.title.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,100):'题集',endTime:r.endTime});});
 return {version:1,id:typeof x.id==='string'?x.id:null,owner:x.owner,verifiedAt:x.verifiedAt,capturedAt:stored&&Number.isFinite(x.capturedAt)&&x.capturedAt<=now?x.capturedAt:now,rows:rows};
}
function key(owner,row,days){return owner+':'+row.id+':'+row.endTime+':'+days;}
function due(s,c,sent,now){
 c=config(c);if(!c.enabled||!s||!Array.isArray(s.rows))return [];
 return s.rows.filter(function(r){var left=r.endTime-now;return left>0&&left<c.days*DAY&&!sent[key(s.owner,r,c.days)];}).sort(function(a,b){return a.endTime-b.endTime;});
}
function remaining(ms){if(ms<=0)return '已截止';if(ms<3600000)return Math.max(1,Math.ceil(ms/60000))+'分钟';if(ms<DAY)return Math.floor(ms/3600000)+'小时';return Math.floor(ms/DAY)+'天';}
var api={config:config,snapshot:snapshot,key:key,due:due,remaining:remaining};
if(typeof module==='object'&&module.exports)module.exports=api;else root.PNCDeadlineCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);

return module.exports;})();
var PNCReminderProtocol=(function(){var module={exports:{}};
/* Authenticated reminders. Private keys never leave the main userscript GM store. */
(function(root){
'use strict';
var CHANNEL='pnc-deadline-signed-v1',MAX=4*1024*1024;
function encode(bytes){return btoa(String.fromCharCode.apply(null,new Uint8Array(bytes)));}
function decode(s){if(typeof s!=='string'||s.length>256)throw Error('signature');return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0);});}
function publicKey(j){if(!j||j.kty!=='EC'||j.crv!=='P-256'||typeof j.x!=='string'||typeof j.y!=='string'||j.d)throw Error('public key');return {kty:'EC',crv:'P-256',x:j.x,y:j.y,ext:true};}
async function sign(crypto,key,payload){var raw=JSON.stringify(payload);if(raw.length>MAX)throw Error('payload too large');var k=await crypto.subtle.importKey('jwk',key,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);var sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},k,new TextEncoder().encode(raw));return {channel:CHANNEL,raw:raw,signature:encode(sig)};}
async function verify(crypto,jwk,envelope,now){if(!envelope||envelope.channel!==CHANNEL||typeof envelope.raw!=='string'||envelope.raw.length>MAX)throw Error('envelope');var key=await crypto.subtle.importKey('jwk',publicKey(jwk),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,decode(envelope.signature),new TextEncoder().encode(envelope.raw)))throw Error('signature');var p=JSON.parse(envelope.raw);if(!p||p.version!==1||!Number.isSafeInteger(p.sequence)||p.sequence<1||!Number.isFinite(p.at)||p.at>now+5000||now-p.at>90000)throw Error('expired/sequence');return p;}
var api={CHANNEL:CHANNEL,publicKey:publicKey,sign:sign,verify:verify};if(typeof module==='object'&&module.exports)module.exports=api;else root.PNCReminderProtocol=api;
})(typeof globalThis!=='undefined'?globalThis:this);

return module.exports;})();
var PNCReminderTabLock=(function(){var module={exports:{}};
/* Per-script, cross-origin Lamport bakery lock using manager-owned tab records.
 * No lease stealing: a frozen participant delays work instead of creating split-brain.
 * The manager removes closed-tab records. Only one top-frame instance per tab is supported.
 */
(function(root){
'use strict';
function create(api,id){
 var queue=Promise.resolve();
 async function tables(){return await api.tabs();}
 async function own(record){await api.save({pncReminderLock:{id:id,choosing:!!record.choosing,ticket:record.ticket||0}});
  for(var n=0;n<20;n++){var t=await tables();if(Object.values(t).some(function(v){var r=v&&v.pncReminderLock;return r&&r.id===id&&r.choosing===!!record.choosing&&r.ticket===(record.ticket||0);}))return;await api.delay(25);}throw Error('tab record acknowledgement timeout');}
 async function release(){var t=await tables();if(Object.values(t).some(function(v){return v&&v.pncReminderLock&&v.pncReminderLock.id===id;}))await own({ticket:0});}
 async function run(fn){
  try{await own({choosing:true});var t=await tables(),max=0;
  Object.values(t).forEach(function(v){var r=v&&v.pncReminderLock;if(r&&Number.isSafeInteger(r.ticket))max=Math.max(max,r.ticket);});
  if(max>=Number.MAX_SAFE_INTEGER-1)throw Error('ticket overflow');
  var ticket=max+1;await own({ticket:ticket});
  for(var n=0;n<40;n++){t=await tables();var mine=false,blocked=false;
    Object.values(t).forEach(function(v){var r=v&&v.pncReminderLock;if(!r)return;if(r.id===id){mine=r.ticket===ticket&&!r.choosing;return;}if(r.choosing||(r.ticket>0&&(r.ticket<ticket||(r.ticket===ticket&&r.id<id))))blocked=true;});
    if(!mine)throw Error('tab instance replaced');
    if(!blocked)return await fn();await api.delay(100);
   }throw Error('another tab is frozen or busy');
  }finally{await release();}
 }
 return {run:function(fn){var task=queue.catch(function(){}).then(function(){return run(fn);});queue=task;return task;}};
}
var api={create:create};if(typeof module==='object'&&module.exports)module.exports=api;else root.PNCReminderTabLock=api;
})(typeof globalThis!=='undefined'?globalThis:this);

return module.exports;})();
if(typeof document==="undefined"){
/* Manual ScriptCat UUID binding; reads only the five pnc-reminder-v2:* keys. */
(function(){
'use strict';
if(typeof GM_info==='undefined'||GM_info.scriptHandler!=='ScriptCat')return;
var P='pnc-reminder-v2:',busy=false,C=PNCDeadlineCore;
var get=function(k,d){return GM.getValue(P+k,d);},set=function(k,v){return GM.setValue(P+k,v);};
function send(d){return new Promise(function(resolve){var done=false,t=setTimeout(function(){if(!done){done=true;resolve(false);}},10000);try{GM_notification(Object.assign({},d,{oncreate:function(){if(!done){done=true;clearTimeout(t);resolve(true);}}}));}catch(_){done=true;clearTimeout(t);resolve(false);}});}
async function tick(){if(busy)return;busy=true;try{
 var now=Date.now(),ctl=await get('control',null),rev=await get('revocation',''),raw=await get('snapshot',null),s=await get('state',{sent:{}});
 if(!s||!s.sent||typeof s.sent!=='object')s={sent:{}};
 var config=C.config(ctl),snapshot=C.snapshot(raw,now,true),message='已关闭';
 if(ctl&&s.command!==ctl.id){Object.keys(s.sent).forEach(function(k){if(s.sent[k]&&s.sent[k].status==='failed')delete s.sent[k];});s.command=ctl.id;}
 function active(){return ctl&&typeof ctl.id==='string'&&config.enabled&&ctl.revocation===rev&&/^\d{1,25}$/.test(ctl.owner||'');}
 if(active()&&snapshot&&snapshot.owner!==ctl.owner){await set('revocation','account:'+now+':'+snapshot.owner);message='账号已变化，请在当前账号重新启用';}
 else if(active()&&snapshot){
  message=Object.keys(s.sent).some(function(k){return s.sent[k].status==='failed'&&s.sent[k].attempts>=5;})?'部分通知已失败5次停止重试，可关闭后重新开启':'后台运行中：使用最后同步的截止时间';
  var due=C.due(snapshot,config,{},now).filter(function(row){var e=s.sent[C.key(snapshot.owner,row,config.days)];return !e||e.status!=='created'&&e.attempts<5&&now>=e.retryAt;}).slice(0,20);
  if(due.length){
   var current=await get('control',null),revNow=await get('revocation','');
   if(current&&current.id===ctl.id&&revNow===rev){
    var reserved={};
    due.forEach(function(row){var k=C.key(snapshot.owner,row,config.days),old=s.sent[k];reserved[k]=old||null;s.sent[k]={status:'pending',attempts:(old&&old.attempts||0)+1,retryAt:now+60000,endTime:row.endTime};});
    await set('state',s);
    current=await get('control',null);revNow=await get('revocation','');
    var latestSnapshot=C.snapshot(await get('snapshot',null),Date.now(),true);
    if(current&&current.id===ctl.id&&revNow===rev&&latestSnapshot&&latestSnapshot.owner===ctl.owner&&latestSnapshot.id===snapshot.id){
     var created=await send({title:'PNC · '+due.length+' 个题集即将截止',text:due.slice(0,4).map(function(r){return r.title+'：剩余'+C.remaining(r.endTime-Date.now());}).join('\n')+(due.length>4?'\n另有 '+(due.length-4)+' 个题集':''),tag:'pnc-reminder-'+ctl.owner,url:'https://pintia.cn/problem-sets',timeout:0});
     due.forEach(function(row){var e=s.sent[C.key(snapshot.owner,row,config.days)];e.status=created?'created':'failed';e.retryAt=Date.now()+Math.min(86400000,60000*Math.pow(2,e.attempts-1));});
     message=created?'已请求系统通知；系统静音仍可能不显示':'通知创建失败，将有限重试（最多5次）';
    }else{
     // No API request happened: do not consume retries or suppress the next valid snapshot.
     Object.keys(reserved).forEach(function(k){if(reserved[k])s.sent[k]=reserved[k];else delete s.sent[k];});
     message='配置或目录已更新，旧批次已取消';
    }
   }
  }
 }else if(config.enabled)message=ctl&&ctl.revocation!==rev?'账号校验已撤销，请重新读取后手动开启':!snapshot?'目录未同步或数据超限，请重新读取':'等待有效账号配置';
 Object.keys(s.sent).forEach(function(k){var e=s.sent[k];if(!e||!Number.isFinite(e.endTime)||now-e.endTime>30*86400000)delete s.sent[k];});
 await set('state',s);await set('status',{at:Date.now(),enabled:!!(active()&&snapshot&&snapshot.owner===ctl.owner),command:ctl&&ctl.id,message:message,snapshotId:snapshot&&snapshot.id});
}catch(_){try{await set('status',{at:Date.now(),enabled:false,message:'后台存储或数据错误，提醒暂停'});}catch(__){}}finally{busy=false;}}
tick();setInterval(tick,30000);
if(typeof GM_addValueChangeListener==='function')for(var k of ['control','snapshot','revocation'])GM_addValueChangeListener(P+k,function(){tick();});
})();

return;
}
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

})();
