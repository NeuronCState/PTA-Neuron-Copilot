const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('notifications/secure-main.js','utf8').split('    var helperCopyBusy')[1].split('    // This request')[0];
async function test(mode){
 const button={textContent:'复制 Helper 配对码'},status={textContent:''},timers=new Map();let serial=0,callback,written,calls=0;
 const ctx={document:{getElementById:id=>id==='pta-helper-copy-pair'?button:status},withReminderSigningLock:fn=>fn(),reminderSigningState:async()=>({publicKey:{kty:'EC',x:'public'},privateKey:{d:'SECRET'}}),PNCReminderProtocol:{publicKey:k=>k},setTimeout:(f,ms)=>{timers.set(++serial,{f,ms});return serial;},clearTimeout:id=>timers.delete(id),alert:()=>assert.fail('unexpected alert'),
 GM_setClipboard:(v,t,cb)=>{calls++;written=v;callback=cb;if(mode==='throw')throw Error('SECRET');if(mode==='promise')return Promise.resolve();if(mode==='reject')return Promise.reject(Error('SECRET'));}};
 vm.createContext(ctx);vm.runInContext('var helperCopyBusy'+code,ctx);
 const task=ctx.copyHelperPairingCode();for(let i=0;i<8;i++)await Promise.resolve();
 assert.ok(!written.includes('SECRET'));
 if(mode==='callback'||mode==='timeout'){
  assert.equal(button.textContent,'复制中…');await ctx.copyHelperPairingCode();assert.equal(calls,1);
  if(mode==='callback')callback();else [...timers.values()].find(t=>t.ms===5000).f();
 }
 await task;assert.equal(button.disabled,false);
 if(mode==='callback'||mode==='promise'){assert.equal(button.textContent,'已复制 ✓');assert.match(status.textContent,/已复制/);[...timers.values()].find(t=>t.ms===2500).f();assert.equal(button.textContent,'复制 Helper 配对码');}
 else{assert.equal(button.textContent,'重试复制');assert.match(status.textContent,/未确认复制成功/);assert.ok(!status.textContent.includes('SECRET'));}
}
(async()=>{for(const mode of ['callback','promise','throw','reject','timeout'])await test(mode);console.log('PASS copy callback/promise confirmation, pending dedupe, rejection/throw/timeout feedback, reset and no private material');})().catch(e=>{console.error(e);process.exitCode=1;});
