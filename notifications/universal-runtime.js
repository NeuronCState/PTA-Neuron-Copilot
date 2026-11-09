/* Universal top-frame helper. No credentials, DOM reads, or data messages on other sites. */
(function(){
'use strict';
var C=PNCDeadlineCore,V=PNCReminderProtocol,P='pnc-helper-universal-v1:',busy=false;
var disposed=false,tabRegistered=false;
var diagnostic={receivedAt:0,verifiedAt:0,transport:null,issue:null},diagnosticBusy=false;
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
function requestSync(){
 if(!isPTA)return;
 try{if(isPTA&&typeof window.postMessage==='function')window.postMessage({channel:'pnc-helper-request-sync-v1'},'https://pintia.cn');}catch(_){}
 try{if(typeof document.dispatchEvent==='function'&&typeof CustomEvent==='function')document.dispatchEvent(new CustomEvent('pnc-helper-request-sync-v1'));}catch(_){}
}
async function status(message){await set('status',{at:Date.now(),message:message});}
function samePair(a,b){return !!a&&a.key.x===b.x&&a.key.y===b.y&&a.key.crv===b.crv;}
function revision(p){return p?p.revision:null;}
function syncState(raw){
 if(!raw)return '等待 PTA 同步';
 if(!raw.control)return '已收签名，但缺少提醒设置';
 if(!raw.control.enabled)return 'PNC 倒计时提醒已关闭';
 if(raw.control.revocation!==raw.revocation)return '提醒授权已撤销或失效';
 if(!raw.snapshot)return '已收设置，但缺少题集数据';
 if(raw.snapshot.owner!==raw.control.owner)return '题集账号不匹配';
 return raw.snapshot.rows.length?'题集数据可用':'已同步，题集列表为空';
}
function diagnosticTime(value){return Number.isFinite(value)&&value>0?new Date(value).toLocaleString():'无';}
async function showDiagnostics(){
 if(diagnosticBusy)return;diagnosticBusy=true;
 try{
  var pair=await pairing(),paused=await get('paused',true),raw=await get('accepted',null);
  var snap=raw&&raw.snapshot,ready=raw&&raw.control&&raw.control.enabled&&raw.control.revocation===raw.revocation&&snap&&snap.owner===raw.control.owner;
  var due=ready?C.due(snap,raw.control,{},Date.now()).length:null;
  var lines=['PNC Helper · 测试诊断',
   '环境：'+(typeof GM_info!=='undefined'&&GM_info.scriptHandler==='ScriptCat'?'脚本猫':typeof GM_info!=='undefined'&&GM_info.scriptHandler==='Tampermonkey'?'篡改猴':'其他管理器')+' / '+(isPTA?'PTA 页面':'其他网页'),
   '配对：'+(pair?'已配对':'未配对')+'；Helper：'+(paused?'已暂停':'已启用'),
   '同步：'+(pair?syncState(raw):'请先配对'),
   '最近已验签数据：'+diagnosticTime(raw&&raw.at),
   '题集缓存更新时间：'+diagnosticTime(snap&&snap.capturedAt),
   '缓存题集：'+(snap?snap.rows.length:'无')+'；阈值内未截止：'+(due===null?'不可计算':due),
   '本页最近收到同步消息：'+diagnosticTime(diagnostic.receivedAt),
   '接收通道：'+(diagnostic.transport||'无'),
   '本页最近验签通过：'+diagnosticTime(diagnostic.verifiedAt),
   '本页最近诊断：'+(diagnostic.issue||'未发现错误（不代表通知已送达）'),
   '通知接口：'+(typeof GM_notification==='function'?'可调用，系统权限仍需测试':'不可用'),
   '', '1：请求 PTA 同步；2：发送一条测试通知。取消仅关闭。',
   '不会清除缓存或改变启停状态；不展示密钥、账号或题目内容。'];
  var action=inputDialog?inputDialog(lines.join('\n'),''):null;
  if(action===null||action==='')return;
  if(action.trim()==='1'){
   if(!pair){notifyDialog('请先配对。');return;}
   if(!isPTA){notifyDialog('请打开 PTA，在该页面的 Helper 菜单请求同步。');return;}
   requestSync();notifyDialog('已请求同步，请稍后重新打开测试诊断。若仍无消息，请确认当前 PTA 页面已启用 PNC；若验签失败，请重新复制配对码。请求不等于同步成功。');
  }else if(action.trim()==='2'){
   if(!confirmDialog||!confirmDialog('发送一条不包含题集信息的系统测试通知？不会开启已暂停的提醒或改变提醒去重记录。'))return;
   var outcome=await notification({title:'PNC Helper · 测试通知',text:'这是手动测试通知，不是题集截止提醒。',tag:'pnc-helper-manual-test',timeout:5000});
   notifyDialog(outcome==='failed'?'测试通知调用失败。请检查脚本管理器与浏览器的通知权限。':outcome==='created'?'管理器回报已创建通知；请自行确认系统是否实际显示。':'测试通知已请求，但管理器未确认创建。请自行确认系统是否显示，并检查通知权限和勿扰模式。');
  }else notifyDialog('请输入 1 或 2，或取消。');
 }catch(_){notifyDialog('诊断未完成：本地读取失败或页面已离开，请刷新后重试。');}
 finally{diagnosticBusy=false;}
}
if(typeof GM_registerMenuCommand==='function'){
 GM_registerMenuCommand('测试诊断',showDiagnostics);
 GM_registerMenuCommand('配对',async function(){
  try{
   if(!inputDialog||!confirmDialog)throw Error('请在普通网页的管理器菜单操作');
   var text=inputDialog('粘贴 PNC 设置 → 倒计时提醒下方复制的配对码。','');
   if(text===null)return;
   var key=await parsePair(text),before=await pairing(),same=samePair(before,key);
   if(!confirmDialog((before&&!same?'更换配对会清空原提醒缓存。\n':'')+'确认配对码来自你自己的 PNC，并启用系统提醒？'))return;
   await lock.run(async function(){
    if(revision(await pairing())!==revision(before))throw Error('其他标签已更改配对，请重试');
    await set('paused',true);
    if(!same){await set('accepted',null);await set('sent',{});}
    await set('pairing',{key:key,revision:id+':'+Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-')});
    await set('paused',false);await status('已配对并启用提醒');
   });
   requestSync();tick();
   notifyDialog(isPTA?'已配对，正在同步。':'已配对，请打开 PTA 同步题集。');
  }catch(e){notifyDialog('配对未完成：'+e.message);}
 });
 GM_registerMenuCommand('提醒状态',async function(){
  try{
   var before=await pairing();
   if(!before){notifyDialog('未配对。请先选择“配对”。');return;}
   var paused=await get('paused',true),accepted=await get('accepted',null);
   var summary=(paused?'提醒已暂停':'提醒已启用')+' · '+syncState(accepted);
   if(!confirmDialog||!confirmDialog(summary+'\n\n'+(paused?'恢复所有标签的提醒？':'暂停所有标签的提醒？')))return;
   await lock.run(async function(){
    if(revision(await pairing())!==revision(before)||(await get('paused',true))!==paused)throw Error('其他标签已更改状态，请重试');
    await set('paused',!paused);await status(paused?'提醒已恢复':'提醒已暂停');
   });
   if(paused){requestSync();tick();}
  }catch(e){notifyDialog('状态未更改：'+e.message);}
 });
 GM_registerMenuCommand('取消配对',async function(){
  try{
   var before=await pairing();if(!before){notifyDialog('尚未配对。');return;}
   if(!confirmDialog||!confirmDialog('取消配对并暂停所有标签的提醒？本地提醒缓存将清空，不影响 PNC 答题缓存。'))return;
   await lock.run(async function(){
    if(revision(await pairing())!==revision(before))throw Error('其他标签已更改配对，请重试');
    await set('paused',true);await set('pairing',null);await set('accepted',null);await set('sent',{});await status('配对已取消');
   });
   notifyDialog('已取消配对。');
  }catch(e){notifyDialog('取消配对失败：'+e.message);}
 });
}
async function receive(event){
 if(disposed||!isPTA||event.origin!=='https://pintia.cn')return;
 // Event.source can be a different Window wrapper across userscript sandboxes.
 // Origin is only a transport filter; the paired-key signature establishes trust.
 return receiveSigned(event.data,'窗口消息');
}
async function receiveDOM(event){
 if(disposed||!isPTA||typeof event.detail!=='string'||event.detail.length>8*1024*1024+1024)return;
 var envelope;try{envelope=JSON.parse(event.detail);}catch(_){return;}
 return receiveSigned(envelope,'DOM 字符串事件');
}
async function receiveSigned(envelope,transport){
 if(disposed||!isPTA||!envelope||envelope.channel!==V.CHANNEL)return;
 diagnostic.receivedAt=Date.now();diagnostic.transport=transport;
 var packet,pair;try{pair=await pairing();if(!pair){diagnostic.issue='收到同步消息，但尚未配对';return;}packet=await V.verify(crypto,pair.key,envelope,Date.now());diagnostic.verifiedAt=Date.now();diagnostic.issue=null;}catch(_){diagnostic.issue='签名或时效校验失败；请核对配对及系统时间';return;}
 try{await lock.run(async function(){if(packet.at>Date.now()+5000||Date.now()-packet.at>90000)return;var currentPair=await pairing();if(!currentPair||currentPair.revision!==pair.revision)return;var previous=await get('accepted',null);if(previous&&packet.sequence<=previous.sequence)return;
  var ctl=packet.control,rev=packet.revocation,snap=C.snapshot(packet.snapshot,Date.now(),true);
  if(typeof rev!=='string'||rev.length>512)return;
  if(ctl!==null&&(!ctl||typeof ctl.id!=='string'||ctl.id.length>128||typeof ctl.enabled!=='boolean'||!Number.isInteger(ctl.days)||ctl.days<1||ctl.days>30||typeof ctl.revocation!=='string'||ctl.revocation.length>512||ctl.enabled&&!/^\d{1,25}$/.test(ctl.owner||'')))return;
  // Store only normalized reminder data, never arbitrary object fields from the message.
  await set('accepted',{sequence:packet.sequence,at:packet.at,control:ctl?{id:ctl.id,enabled:ctl.enabled,days:ctl.days,owner:ctl.owner,revocation:ctl.revocation}:null,revocation:rev,snapshot:snap});
  await status('已验证并同步签名配置；通知按最后同步截止时间计算');
 });tick();}catch(_){diagnostic.issue='保存同步数据未完成；可能受其他标签锁或存储影响';/* Next signed heartbeat will retry. */}
}
if(isPTA)window.addEventListener('message',receive);
if(isPTA&&typeof document.addEventListener==='function')document.addEventListener('pnc-helper-signed-sync-v1',receiveDOM);
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
