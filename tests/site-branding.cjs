const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const fixed='https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/main/PTA%20Neuron%20Copilot-2.0.0.user.js';
for(const name of fs.readdirSync('docs').filter(x=>x.endsWith('.html'))){
 const file=path.join('docs',name),src=fs.readFileSync(file,'utf8'),{document}=parseHTML(src);
 assert.match(document.title,/PTA Neuron Copilot/);assert.ok(!src.includes('PTA Auto Solver'));
 assert.match(document.querySelector('.brand').textContent,/PTA Neuron Copilot/);
 assert.match(document.querySelector('.release-notice').textContent,/安装链接提供 2\.0\.0/);
 assert.match(document.querySelector('link[rel=canonical]').getAttribute('href'),/^https:\/\/neuroncstate.github.io\/PTA-Neuron-Copilot\//);
 for(const el of document.querySelectorAll('[href],[src]')){
  const value=el.getAttribute('href')||el.getAttribute('src');if(!value||/^(?:https?:|\/\/|#|data:)/.test(value))continue;
  const clean=decodeURIComponent(value.split(/[?#]/)[0]);const target=path.resolve('docs',clean);assert.ok(fs.existsSync(target),file+': '+value);
 }
 for(const a of document.querySelectorAll('a[href]'))if(a.getAttribute('href').includes('.user.js')){assert.equal(a.getAttribute('href'),fixed);assert.match(a.textContent,/2\.0\.0/,'download label must match its actual artifact');assert.ok(!/1\.6\.0|1\.8\.0/.test(a.textContent));}
 for(const script of document.querySelectorAll('script[type="application/ld+json"]')){const data=JSON.parse(script.textContent);if(data.downloadUrl){assert.equal(data.downloadUrl,fixed);assert.equal(data.softwareVersion,'2.0.0');}}
 for(const script of document.querySelectorAll('script:not([src]):not([type="application/ld+json"]):not([type="module"]):not([type="importmap"])'))new vm.Script(script.textContent);
}
const readme=fs.readFileSync('README.md','utf8');assert.match(readme,/^# PTA Neuron Copilot/);for(const word of ['2.0.0','复习功能暂隐藏','开发者选项暂隐藏','仓库已更名','不删除','未保存'])assert.ok(readme.includes(word));assert.ok(readme.includes(fixed));
for(const file of ['hero.svg','workflow.svg'])assert.match(fs.readFileSync(path.join('assets/readme',file),'utf8'),/PTA Neuron Copilot/);
const entry=fs.readFileSync('index.html','utf8');assert.ok(entry.includes('url=docs/'));assert.ok(entry.includes('PTA Neuron Copilot'));
console.log('PASS static PNC branding, candidate disclosure, fixed beta install identity, local links, JSON-LD and classic JS syntax');
