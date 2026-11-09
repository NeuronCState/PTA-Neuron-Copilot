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
