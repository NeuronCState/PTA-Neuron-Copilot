const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8');
assert.match(src,/\/\/ @name\s+PTA Auto Solver Beta\n/);assert.match(src,/\/\/ @namespace\s+https:\/\/pintia.cn\//);
for(const value of ['pta-auto-solver-v1','pta-ai-answer-cache-v2','pta-catalogue-cache-v1'])assert.ok(src.includes("'"+value+"'"));
const header=src.slice(0,src.indexOf('// ==/UserScript=='));
for(const line of header.split('\n').filter(l=>/@(updateURL|downloadURL)/.test(l)))assert.ok(line.endsWith('https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/main/PTA%20Neuron%20Copilot-2.0.0.user.js'));
assert.ok(src.includes('aria-label="PTA Neuron Copilot"'));for(const fragment of ['pta-pas-p">P','pta-pas-a">N','pta-pas-s">C','>TA</span>','>euron</span>','>opilot</span>'])assert.ok(src.includes(fragment));
let warning='',loaded=0;const boot=src.slice(src.indexOf('    function boot()'),src.indexOf('    resumeApiDiagnostics();'));
const ctx={document:{getElementById:()=>({})},console:{warn:x=>warning=x},loadState:()=>loaded++};
vm.createContext(ctx);vm.runInContext(boot+';boot();',ctx);assert.equal(loaded,0);assert.match(warning,/本副本不启动/);
console.log('PASS PTA Neuron Copilot / PNC display rename, unchanged metadata identity/storage keys and migrated update URL and duplicate boot guard; manager upgrade not simulated');

assert.equal(fs.readFileSync('PTA Neuron Copilot-2.0.0.user.js','utf8'),src);
