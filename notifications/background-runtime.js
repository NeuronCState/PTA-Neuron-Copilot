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
  var due=C.due(snapshot,config,{},now).filter(function(row){var e=s.sent[C.key(snapshot.owner,row,config.days)];return !e||e.status!=='created'&&e.attempts<5&&now>=e.retryAt;}).slice(0,3);
  for(var row of due){
   var details=C.notificationDetails(row,snapshot.owner,config.days,Date.now());if(!details)continue;
   var current=await get('control',null),revNow=await get('revocation','');
   if(!current||current.id!==ctl.id||revNow!==rev)break;
   var k=C.key(snapshot.owner,row,config.days),old=s.sent[k];
   s.sent[k]={status:'pending',attempts:(old&&old.attempts||0)+1,retryAt:Date.now()+60000,endTime:row.endTime};
   await set('state',s);
   current=await get('control',null);revNow=await get('revocation','');
   var latestSnapshot=C.snapshot(await get('snapshot',null),Date.now(),true);
   if(current&&current.id===ctl.id&&revNow===rev&&latestSnapshot&&latestSnapshot.owner===ctl.owner&&latestSnapshot.id===snapshot.id&&row.endTime>Date.now()){
    var created=await send(details),e=s.sent[k];e.status=created?'created':'failed';e.retryAt=Date.now()+Math.min(86400000,60000*Math.pow(2,e.attempts-1));
    await set('state',s);
    message=created?'已请求系统通知；系统静音仍可能不显示':'通知创建失败，将有限重试（最多5次）';
   }else{
    if(old)s.sent[k]=old;else delete s.sent[k];
    message='配置或目录已更新，旧通知已取消';break;
   }
  }

 }else if(config.enabled)message=ctl&&ctl.revocation!==rev?'账号校验已撤销，请重新读取后手动开启':!snapshot?'目录未同步或数据超限，请重新读取':'等待有效账号配置';
 Object.keys(s.sent).forEach(function(k){var e=s.sent[k];if(!e||!Number.isFinite(e.endTime)||now-e.endTime>30*86400000)delete s.sent[k];});
 await set('state',s);await set('status',{at:Date.now(),enabled:!!(active()&&snapshot&&snapshot.owner===ctl.owner),command:ctl&&ctl.id,message:message,snapshotId:snapshot&&snapshot.id});
}catch(_){try{await set('status',{at:Date.now(),enabled:false,message:'后台存储或数据错误，提醒暂停'});}catch(__){}}finally{busy=false;}}
tick();setInterval(tick,30000);
if(typeof GM_addValueChangeListener==='function')for(var k of ['control','snapshot','revocation'])GM_addValueChangeListener(P+k,function(){tick();});
})();
