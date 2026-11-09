    // Only trusted script-side GM storage; no page-message bridge or storage migration.
    var reminderV2={last:'',pendingSnapshot:null,timer:null,bound:false},REMINDER_PREFIX='pnc-reminder-v2:';
    function reminderGet(k,d){return Promise.resolve(GM_getValue(REMINDER_PREFIX+k,d));}
    function reminderSet(k,v){return Promise.resolve(GM_setValue(REMINDER_PREFIX+k,v));}
    function reminderId(){return Array.from(crypto.getRandomValues(new Uint32Array(4))).map(function(n){return n.toString(16);}).join('-');}
    function revokeDeadlineReminders(reason){if(typeof GM_setValue==='function')return reminderSet('revocation',reason+':'+reminderId()).catch(function(){});}
    async function observeDeadlineReminderOwner(user){
        if(typeof user!=='string'||!/^\d{1,25}$/.test(user))return false;
        try{var ctl=await reminderGet('control',null),rev=await reminderGet('revocation','');
            if(ctl&&ctl.enabled&&ctl.revocation===rev&&ctl.owner!==user){await revokeDeadlineReminders('verified-account-changed');return true;}
        }catch(_){}return false;
    }
    async function syncDeadlineReminderV2(){
        var toggle=document.getElementById('pta-deadline-reminder-toggle'),status=document.getElementById('pta-deadline-reminder-status'),days=document.getElementById('pta-deadline-reminder-days');if(!toggle)return;
        try{
            var ctl=await reminderGet('control',null),rev=await reminderGet('revocation',''),backend=await reminderGet('status',null);
            toggle.checked=!!(ctl&&ctl.enabled&&ctl.revocation===rev);if(ctl&&Number.isInteger(ctl.days))days.value=String(ctl.days);
            status.textContent=backend&&Date.now()-backend.at<90000?backend.message:'未连接后台：请在脚本猫手动绑定并启用一个后台辅助脚本';
            if(reminderV2.pendingSnapshot){if(backend&&backend.snapshotId===reminderV2.pendingSnapshot)reminderV2.pendingSnapshot=null;else status.textContent='目录已写入，等待后台读取确认';}
            var proof=getVerifiedCatalogueIdentity(),snap=catalogueCache.snapshot;
            // Identity invalidation must precede directory completeness checks.
            if(proof&&await observeDeadlineReminderOwner(proof.userId)){toggle.checked=false;status.textContent='账号已变化，请在当前账号重新启用';return;}
            if(!toggle.checked||!proof||!snap||!snap.complete||catalogueCache.owner!==proof.userId)return;
            if(snap.rows.length>10000){status.textContent='题集超过10000条，已暂停同步；未静默截断';await reminderSet('snapshot',null);return;}
            var rows=snap.rows.map(function(r){return {id:r.id,title:String(r.title||'题集').slice(0,100),endTime:Number.isFinite(r.endTime)?r.endTime:r.deadlineOrder};});
            var key=JSON.stringify({owner:proof.userId,rows:rows});if(key===reminderV2.last)return;
            var value={version:1,id:reminderId(),owner:proof.userId,verifiedAt:proof.verifiedAt,capturedAt:Date.now(),rows:rows};
            await reminderSet('snapshot',value);reminderV2.last=key;reminderV2.pendingSnapshot=value.id;status.textContent='目录已写入，等待后台读取确认';
        }catch(_){status.textContent='提醒存储不可用，未完成同步';}
    }
    function bindDeadlineReminderUI(){
        var toggle=document.getElementById('pta-deadline-reminder-toggle'),days=document.getElementById('pta-deadline-reminder-days'),status=document.getElementById('pta-deadline-reminder-status');if(!toggle||reminderV2.bound)return;reminderV2.bound=true;
        async function change(e){
            if(!e.isTrusted)return;
            var enabled=toggle.checked,count=Number(days.value),proof=getVerifiedCatalogueIdentity();
            if(enabled&&(!proof||!Number.isInteger(count)||count<1||count>30)){toggle.checked=false;status.textContent='请先读取并验证当前账号题集目录';return;}
            try{var rev=await reminderGet('revocation','');await reminderSet('control',{id:reminderId(),enabled:enabled,days:count,owner:proof?proof.userId:null,revocation:rev});reminderV2.last='';await syncDeadlineReminderV2();}catch(_){status.textContent='设置未保存，提醒配置失败';}
        }
        toggle.addEventListener('change',change);days.addEventListener('change',change);
        syncDeadlineReminderV2();reminderV2.timer=setInterval(syncDeadlineReminderV2,30000);
    }

