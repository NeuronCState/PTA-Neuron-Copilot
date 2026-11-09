const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const moduleCode=fs.readFileSync('notifications/secure-main.js','utf8');
assert.ok(fs.readFileSync('PNC.user.js','utf8').includes(moduleCode),'published artifact must contain current module');
const code='var helperCopyBusy'+moduleCode.split('    var helperCopyBusy')[1].split('    // This request')[0];
async function test(mode){
 const button={textContent:'复制 Helper 配对码'},status={textContent:''},timers=new Map();let serial=0,callback,written='',calls=0,nativeCalls=0,clipboard='UNCHANGED',resolveNative;
 const ctx={document:{getElementById:id=>id==='pta-helper-copy-pair'?button:status},withReminderSigningLock:fn=>fn(),reminderSigningState:async()=>({publicKey:{kty:'EC',x:'public'},privateKey:{d:'SECRET'}}),PNCReminderProtocol:{publicKey:k=>k},setTimeout:(f,ms)=>{timers.set(++serial,{f,ms});return serial;},clearTimeout:id=>timers.delete(id),alert:()=>assert.fail('unexpected alert'),
 GM_setClipboard:(v,t,cb)=>{calls++;written=v;callback=cb;if(mode==='throw')throw Error('SECRET');if(mode==='promise')return Promise.resolve();if(mode==='reject')return Promise.reject(Error('SECRET'));
  // ScriptCat 4bc187a gm_api.ts L1535-1555 calls callback on BOTH resolve
  // and reject. Its GM.setClipboard wrapper consequently resolves on failure.
  if(mode==='scriptcat-failure'||mode==='native-reject'||mode==='native-throw')Promise.reject(Error('denied')).then(cb).catch(cb);
 }};
 if(mode.startsWith('native-'))ctx.navigator={clipboard:{writeText:v=>{nativeCalls++;written=v;if(mode==='native-reject')return Promise.reject(Error('SECRET'));if(mode==='native-throw')throw Error('SECRET');if(mode==='native-timeout')return new Promise(r=>resolveNative=r);clipboard=v;return Promise.resolve();}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const task=ctx.copyHelperPairingCode();for(let i=0;i<15;i++)await Promise.resolve();
 assert.ok(!written.includes('SECRET'));
 if(['callback','timeout','native-timeout'].includes(mode)){
  assert.equal(button.textContent,'复制中…');await ctx.copyHelperPairingCode();assert.equal(calls+nativeCalls,1);
  if(mode==='callback')callback();else [...timers.values()].find(t=>t.ms===5000).f();
 }
 await task;assert.equal(button.disabled,false);
 if(mode==='native-success'){
  assert.equal(calls,0);assert.equal(button.textContent,'已复制 ✓');assert.match(status.textContent,/已复制/);assert.equal(clipboard,written);
  [...timers.values()].find(t=>t.ms===2500).f();assert.equal(button.textContent,'复制 Helper 配对码');
 }else if(['callback','promise','scriptcat-failure','native-reject','native-throw'].includes(mode)){
  assert.equal(button.textContent,'已请求复制');assert.match(status.textContent,/无法确认是否成功/);assert.equal(clipboard,'UNCHANGED');assert.doesNotMatch(status.textContent,/配对码已复制/);
 }else{
  assert.equal(button.textContent,'重试复制');assert.match(status.textContent,/未确认复制成功/);
  if(resolveNative){resolveNative();for(let i=0;i<10;i++)await Promise.resolve();assert.equal(button.textContent,'重试复制','late resolution must not overwrite timeout');}
 }
 assert.ok(!status.textContent.includes('SECRET'));
}
(async()=>{for(const mode of ['callback','promise','scriptcat-failure','native-success','native-reject','native-throw','throw','reject','timeout','native-timeout'])await test(mode);console.log('PASS honest clipboard feedback: native confirmation, ambiguous manager callback/promise, ScriptCat failure callback, fallback, dedupe, timeout/late resolution, reset and no private material');})().catch(e=>{console.error(e);process.exitCode=1;});
