const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom');
const src=fs.readFileSync(process.env.PTA_TEST_SCRIPT || 'PTA Neuron Copilot-2.0.2.user.js','utf8');
const section=src.slice(src.indexOf('    // Panel UI state only.'),src.indexOf('    function render()'));
const {document}=parseHTML('<html><body><div id="pta-shell"><div class="pta-expanded"><input id="draft" value="keep"></div><div id="pta-drawer"></div></div></body></html>');
Object.defineProperty(document,'visibilityState',{value:'visible'});
let clock=0,id=0,refreshes=0,writes=0;const timers=new Map(),events={};
const ctx={document,location:{href:'https://pintia.cn/problem-sets/1/exam'},window:{addEventListener:(n,f)=>events[n]=f},localStorage:{getItem:()=>null,setItem(){}},setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:clock+ms});return id},clearTimeout:i=>timers.delete(i),refreshClassHome:()=>refreshes++};
vm.createContext(ctx);vm.runInContext(section,ctx);ctx.initPanelBehavior();
const shell=document.getElementById('pta-shell'),native=shell.setAttribute.bind(shell);shell.setAttribute=(...args)=>{writes++;return native(...args)};
function tick(ms){clock+=ms;for(const [i,j]of [...timers])if(j.at<=clock){timers.delete(i);j.fn()}}
for(let i=0;i<200;i++)ctx.panelScroll({target:document});
assert.equal(writes,1,'200 scroll events produce only one collapsed-state DOM write');
assert.equal(timers.size,2,'one motion completion and one idle reopen, no queued animation backlog');
assert.equal(ctx.panelCatalogueDeferred(),true);tick(500);assert.equal(shell.classList.contains('collapsed'),false);assert.equal(ctx.panelCatalogueDeferred(),true,'defer catalogue while expansion is moving');
for(let i=0;i<100;i++){ctx.setPanelCollapsed(true,'manual');ctx.setPanelCollapsed(false)}
assert.equal(timers.size,1);assert.equal(document.getElementById('draft').value,'keep');
tick(760);assert.equal(ctx.panelCatalogueDeferred(),false);assert.equal(refreshes,1,'flush only latest view after repeated reversals');
ctx.setPanelCollapsed(true,'manual');tick(760);assert.equal(refreshes,1,'no hidden DOM rendering');ctx.setPanelCollapsed(false);events.pagehide();assert.equal(timers.size,0);tick(1000);assert.equal(refreshes,1,'unload cancels pending flush');
assert.match(src,/#pta-root\{contain:layout style\}/);
assert.match(src,/width \.72s cubic-bezier\(\.16,1,\.3,1\),height \.72s/,'morph timing unchanged');
assert.match(src,/backdrop-filter:blur\(24px\) saturate\(105%\)/,'glass retained');
assert.match(src,/pta-orb-spin 6.5s linear infinite/,'aura animation retained');
assert.match(src,/if\(typeof panelCatalogueDeferred==='function'&&panelCatalogueDeferred\(\)\)return;/);
console.log('PASS 200 scrolls→1 DOM state write, 100 reversals→1 completion, hidden catalogue deferral, input retained, no timer leak; visual CSS retained (not FPS measurement)');
