    // Universal Helper transport: signing only on PTA, no secret sent to a page.
    var reminderSigningQueue=Promise.resolve(),reminderSignedKey='pnc-reminder-signing-v1';
    async function reminderSigningState(){
        var saved=await Promise.resolve(GM_getValue(reminderSignedKey,null));
        if(saved){if(!saved.privateKey||!saved.publicKey||!Number.isSafeInteger(saved.sequence)||saved.sequence<0)throw Error('签名存储损坏，提醒暂停');return saved;}
        var pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
        saved={privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey:await crypto.subtle.exportKey('jwk',pair.publicKey),sequence:0};
        await Promise.resolve(GM_setValue(reminderSignedKey,saved));
        return saved;
    }
    async function withReminderSigningLock(fn){
        if(location.origin!=='https://pintia.cn'||!crypto.subtle||!navigator.locks)throw Error('当前浏览器缺少安全签名/同源写锁，提醒同步暂停');
        return navigator.locks.request('pnc-reminder-signing-v1',fn);
    }
    async function publishSignedDeadlineReminder(){
        return withReminderSigningLock(async function(){
            var keys=await reminderSigningState(),ctl=await reminderGet('control',null),rev=await reminderGet('revocation',''),snapshot=await reminderGet('snapshot',null);
            if(keys.sequence>=Number.MAX_SAFE_INTEGER-1)throw Error('签名序号已耗尽');
            keys.sequence++;
            // Persist sequence before publishing; a crashed send cannot reuse an old sequence.
            await Promise.resolve(GM_setValue(reminderSignedKey,keys));
            var envelope=await PNCReminderProtocol.sign(crypto,keys.privateKey,{version:1,sequence:keys.sequence,at:Date.now(),control:ctl,revocation:rev,snapshot:snapshot});
            // Both channels carry only the same signed public envelope. DOM string events
            // avoid userscript sandbox Window proxy identity differences.
            var sent=false;
            try{window.postMessage(envelope,'https://pintia.cn');sent=true;}catch(_){}
            try{if(typeof document.dispatchEvent==='function'&&typeof CustomEvent==='function'){
                document.dispatchEvent(new CustomEvent('pnc-helper-signed-sync-v1',{detail:JSON.stringify(envelope)}));sent=true;
            }}catch(_){}
            if(!sent)throw Error('签名消息发送不可用');
        });
    }
    function scheduleSignedDeadlineReminder(){
        reminderSigningQueue=reminderSigningQueue.catch(function(){}).then(publishSignedDeadlineReminder).then(function(){return true;}).catch(function(){
            var el=document.getElementById('pta-deadline-reminder-status');if(el)el.textContent='安全签名同步失败，Helper仍可能保留旧配置；请在扩展菜单暂停Helper';return false;
        });return reminderSigningQueue;
    }
    var reminderOriginalSet=reminderSet;
    reminderSet=async function(k,v){await reminderOriginalSet(k,v);await scheduleSignedDeadlineReminder();};
    var reminderOriginalSync=syncDeadlineReminderV2;
    syncDeadlineReminderV2=async function(){
        await reminderOriginalSync();
        var el=document.getElementById('pta-deadline-reminder-status');
        var previous=el&&el.textContent,ok=await scheduleSignedDeadlineReminder();
        if(ok&&el&&!/失败|不可用|超限|超过|账号已变化/.test(previous||''))el.textContent='签名配置已发送；需手动配对通用 Helper。是否接收请查看扩展菜单，不代表通知已送达。';
    };
    var helperCopyBusy=false,helperCopyResetTimer=null;
    function writeHelperPairingClipboard(value){
        return new Promise(function(resolve,reject){
            var done=false,timer=setTimeout(function(){finish(Error('未收到复制确认，请重试'));},5000);
            function finish(error,confirmed){if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve({confirmed:confirmed===true});}
            function requestManagerCopy(){
                if(done)return;
                try{
                    // ScriptCat invokes the callback on failure as well. Neither this
                    // callback nor GM.setClipboard's wrapper promise proves a write.
                    var result=GM_setClipboard(value,'text',function(){finish(null,false);});
                    if(result&&typeof result.then==='function')result.then(function(){finish(null,false);},function(){finish(Error('剪贴板写入失败，请重试'));});
                }catch(_){finish(Error('剪贴板写入失败，请检查脚本管理器权限'));}
            }
            try{
                if(typeof navigator!=='undefined'&&navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
                    var result=navigator.clipboard.writeText(value);
                    if(result&&typeof result.then==='function'){result.then(function(){finish(null,true);},requestManagerCopy);return;}
                }
            }catch(_){}
            requestManagerCopy();
        });
    }
    async function copyHelperPairingCode(){
        if(helperCopyBusy)return;
        helperCopyBusy=true;clearTimeout(helperCopyResetTimer);
        var button=document.getElementById('pta-helper-copy-pair'),el=document.getElementById('pta-helper-pair-status');
        if(button){button.disabled=true;button.textContent='复制中…';}
        if(el)el.textContent='正在复制配对码…';
        try{
            var value=await withReminderSigningLock(async function(){var keys=await reminderSigningState();return JSON.stringify(PNCReminderProtocol.publicKey(keys.publicKey));});
            var copied=await writeHelperPairingClipboard(value);
            if(!copied.confirmed){
                if(button)button.textContent='已请求复制';
                if(el)el.textContent='已请求复制，请粘贴检查；脚本管理器无法确认是否成功。';
                else alert('已请求复制，请粘贴检查；脚本管理器无法确认是否成功。');
                return;
            }
            if(button)button.textContent='已复制 ✓';
            if(el)el.textContent='配对码已复制，请在 Helper 菜单选择“配对”。';
            else alert('配对码已复制。');
            helperCopyResetTimer=setTimeout(function(){
                if(button)button.textContent='复制 Helper 配对码';
                if(el)el.textContent='仅复制验证公钥，不含私钥或 API Key。';
            },2500);
        }catch(_){
            if(button)button.textContent='重试复制';
            if(el)el.textContent='未确认复制成功，请重试并检查脚本管理器权限。';
            else alert('未确认复制成功，请重试并检查脚本管理器权限。');
        }finally{helperCopyBusy=false;if(button)button.disabled=false;}
    }
    // This request only republishes existing signed configuration; it cannot grant permissions,
    // alter settings or export key material. Host pages can request the same public broadcast.
    var helperSyncRequestAt=0;
    function handleHelperSyncRequest(){
        if(location.origin!=='https://pintia.cn'||Date.now()-helperSyncRequestAt<5000)return;
        helperSyncRequestAt=Date.now();syncDeadlineReminderV2();
    }
    if(typeof window.addEventListener==='function')window.addEventListener('message',function(event){
        // This untrusted request only republishes existing signed state. It never grants access.
        if(event.origin!=='https://pintia.cn'||!event.data||event.data.channel!=='pnc-helper-request-sync-v1')return;
        handleHelperSyncRequest();
    });
    if(typeof document.addEventListener==='function')document.addEventListener('pnc-helper-request-sync-v1',handleHelperSyncRequest);
