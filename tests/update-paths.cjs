const fs=require('node:fs'),assert=require('node:assert/strict');
const files=['PTA Neuron Copilot-2.0.2.user.js','PTA Neuron Copilot-2.0.0.user.js','PTA Auto Solver Pro-1.8.1-beta.1.user.js'];
const src=files.map(p=>fs.readFileSync(p,'utf8'));
assert.equal(src[0],src[1]);
for(let i=0;i<src.length;i++){
 assert.match(src[i],/@version\s+2\.0\.2\n/);
 assert.equal(src[i].split('// ==/UserScript==')[1],src[0].split('// ==/UserScript==')[1]);
 const target=i===2?files[2]:files[0];
 for(const tag of ['updateURL','downloadURL'])assert.equal(src[i].match(new RegExp('@'+tag+'\\s+(\\S+)'))[1],'https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/main/'+encodeURIComponent(target));
}
assert.match(src[0],/@name\s+PTA-Neuron-Copilot\n/);
assert.match(src[0],/@description\s+面向拼题 A 的 AI 辅助答题脚本/);
assert.match(src[2],/@name\s+PTA Auto Solver Beta\n/);
console.log('PASS 2.0.2 upgrade paths, exact canonical alias and preserved user identities');
