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
