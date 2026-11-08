const assert=require('node:assert/strict'),fs=require('fs'),{webcrypto}=require('node:crypto'),protocol=require('../notifications/secure-protocol'),bakery=require('../notifications/tab-lock');
(async()=>{
 const keys=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const priv=await webcrypto.subtle.exportKey('jwk',keys.privateKey),pub=await webcrypto.subtle.exportKey('jwk',keys.publicKey),now=Date.now();
 const p={version:1,sequence:1,at:now,control:{enabled:true},snapshot:{title:'only PTA'}};const env=await protocol.sign(webcrypto,priv,p);
 assert.deepEqual(await protocol.verify(webcrypto,pub,env,now),p);
 await assert.rejects(protocol.verify(webcrypto,pub,{...env,raw:env.raw.replace('true','false')},now));
 await assert.rejects(protocol.verify(webcrypto,priv,env,now));
 await assert.rejects(protocol.verify(webcrypto,pub,env,now+90001));
 await assert.rejects(protocol.verify(webcrypto,pub,{...env,raw:'x'.repeat(4*1024*1024+1)},now));
 const other=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);await assert.rejects(protocol.verify(webcrypto,await webcrypto.subtle.exportKey('jwk',other.publicKey),env,now));
 // Manager tab-store model: three origins, randomized IPC completion, three queued tasks each.
 const table={},delay=ms=>new Promise(r=>setTimeout(r,Math.min(ms,2)));let active=0,max=0,completed=0;
 const locks=['origin-a','origin-b','origin-c'].map((id,i)=>bakery.create({tabs:async()=>{await delay(Math.random()*2);return structuredClone(table);},save:async(v)=>{await delay(Math.random()*2);table[i]=structuredClone(v);},delay},id));
 await Promise.all(locks.flatMap(l=>Array.from({length:3},()=>l.run(async()=>{active++;max=Math.max(max,active);await delay(2);completed++;active--;}))));assert.equal(max,1);assert.equal(completed,9);
 // Frozen holder is NOT stolen. That prevents silent split-brain, at the cost of delay.
 table.frozen={pncReminderLock:{id:'aaa',ticket:1,choosing:false}};await assert.rejects(locks[0].run(()=>assert.fail('must wait')),/frozen|busy/);delete table.frozen;await locks[0].run(()=>{});
 const main=fs.readFileSync('PNC.user.js','utf8'),helper=fs.readFileSync('PNC Helper.user.js','utf8');
 assert.ok(main.includes(fs.readFileSync('notifications/secure-main.js','utf8')));assert.ok(helper.includes(fs.readFileSync('notifications/universal-runtime.js','utf8')));
 assert.doesNotMatch(helper,/^\/\/ @storageName|^\/\/ @connect|^\/\/ @grant\s+unsafeWindow/m);
 assert.match(helper,/if\(isPTA\)window.addEventListener\('message',receive\)/);
 assert.doesNotMatch(helper,/window\.postMessage|document\.querySelector|localStorage|fetch\(/);
 console.log('PASS signed transport tamper/wrong-key/expiry/size, cross-origin tab bakery mutual exclusion/frozen fail-closed, generated source and no arbitrary-site data access');
})().catch(e=>{console.error(e);process.exitCode=1;});
