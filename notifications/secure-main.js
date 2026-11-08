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
            window.postMessage(envelope,'https://pintia.cn');
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
    async function copyHelperPairingCode(){
        try{var value=await withReminderSigningLock(async function(){var keys=await reminderSigningState();return JSON.stringify(PNCReminderProtocol.publicKey(keys.publicKey));});
            await Promise.resolve(GM_setClipboard(value,'text'));
            var el=document.getElementById('pta-helper-pair-status');if(el)el.textContent='公钥已复制，请在 Helper 扩展菜单选择“粘贴配对公钥”。';
        }catch(e){var el=document.getElementById('pta-helper-pair-status');if(el)el.textContent='复制失败：'+e.message;else alert('无法生成配对公钥：'+e.message);}
    }
    if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('PNC：复制 Helper 配对公钥（不含私钥）',copyHelperPairingCode);
    // This request only republishes existing signed configuration; it cannot grant permissions,
    // alter settings or export key material. Host pages can request the same public broadcast.
    var helperSyncRequestAt=0;
    if(typeof window.addEventListener==='function')window.addEventListener('message',function(event){
        if(event.source!==window||event.origin!=='https://pintia.cn'||!event.data||event.data.channel!=='pnc-helper-request-sync-v1')return;
        if(Date.now()-helperSyncRequestAt<5000)return;helperSyncRequestAt=Date.now();
        syncDeadlineReminderV2();
    });
