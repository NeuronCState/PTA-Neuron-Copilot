// ==UserScript==
// @name         PNC Helper
// @namespace    https://pintia.cn/pnc-reminders/
// @version      1.0.0-beta.1
// @description  脚本猫专用；用户手动绑定主脚本UUID后使用提醒专用GM键
// @author       NeuronCState
// @homepageURL  https://github.com/NeuronCState/PTA-Neuron-Copilot/blob/beta/pnc-2.1.0-beta.1/notifications/README.md
// @supportURL   https://github.com/NeuronCState/PTA-Neuron-Copilot/issues
// @background
// @storageName  REPLACE_WITH_MAIN_SCRIPT_UUID
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_notification
// ==/UserScript==

// PNC main: https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/beta/pnc-2.1.0-beta.1/PNC.user.js
// Manual UUID binding grants access to the entire main GM storage. This code limits itself to reminder keys.
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
