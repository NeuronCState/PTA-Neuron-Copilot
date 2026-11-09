const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('PNC.user.js','utf8');
const rule=source.match(/#pta-root \.pta-reminder-row>\.pta-check\{([^}]+)\}/)[1];
for(const property of ['display:flex','align-items:center','justify-content:center','margin:0','height:auto','min-height:36px','box-sizing:border-box','padding:8px 6px','line-height:1.35','text-align:center'])assert.ok(rule.split(';').includes(property),property);
assert.match(source,/role="switch"><span class="pta-reminder-label">倒计时提醒（Beta）<\/span><\/label>/);
assert.match(source,/#pta-root \.pta-reminder-row>\.pta-check>\.pta-reminder-label\{[^}]+line-height:inherit/);
assert.match(source,/#pta-root \.pta-ai-cache-row\{display:flex;align-items:center/);
assert.ok(source.includes("if(event.isTrusted)copyHelperPairingCode()"));assert.ok(source.indexOf('id="pta-helper-copy-pair"')>source.indexOf('id="pta-deadline-reminder-toggle"'));
console.log('PASS static CSS centering/specificity contract, symmetric padding, flexible font height, explicit text wrapper and trusted copy entry (not computed layout or visual test)');
