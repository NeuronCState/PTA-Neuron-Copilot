const fs=require('node:fs'),assert=require('node:assert/strict');
const main=fs.readFileSync('PNC.user.js','utf8'),helper=fs.readFileSync('PNC Helper.user.js','utf8'),guide=fs.readFileSync('notifications/README.md','utf8');
assert.match(main,/@name\s+PTA-Neuron-Copilot\n/);assert.match(main,/@namespace\s+https:\/\/pintia.cn\//);assert.match(main,/@version\s+2\.1\.0\n/);assert.doesNotMatch(main,/^\/\/ @storageName/m);
assert.match(helper,/@name\s+PNC Helper\n/);assert.match(helper,/@version\s+1\.0\.0\n/);
assert.doesNotMatch(helper,/^\/\/ @(storageName|background|connect|grant\s+unsafeWindow)/m);
assert.match(helper,/@match\s+https:\/\/\*\/\*/);assert.match(helper,/@noframes/);assert.match(helper,/粘贴 PNC 设置/);assert.doesNotMatch(helper,/PNC_HELPER_PUBLIC_KEY/);
for(const f of ['background-runtime.js','core.js','secure-protocol.js','tab-lock.js','universal-runtime.js'])assert.ok(helper.includes(fs.readFileSync('notifications/'+f,'utf8')),f);
assert.ok(main.includes(fs.readFileSync('notifications/secure-main.js','utf8')));
assert.match(guide,/GM/);assert.match(guide,/手动/);
console.log('PASS universal 2.1.0/1.0.0 release metadata, preserved main identity, no default shared storage, generated source');

assert.match(main, /@updateURL\s+https:\/\/raw\.githubusercontent\.com\/NeuronCState\/PTA-Neuron-Copilot\/main\/PNC\.user\.js/);
assert.doesNotMatch(main, /@(?:update|download)URL[^\n]*beta\//);
