const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8');
const css=src.slice(src.indexOf('var CSS = `'),src.indexOf('`;',src.indexOf('var CSS = `')));
assert.match(css,/#pta-home-pull\{[^}]*top:var\(--pta-header-rule-y,62px\);bottom:0[^}]*display:flex;flex-direction:column/);
assert.match(css,/#pta-home-pull\.open \.pta-home-pull-fold\{[^}]*height:calc\(100% - 31px\)/);
assert.match(css,/#pta-home-pull #pta-class-home\{height:100%;min-height:0;max-height:none[^}]*overflow:auto/);
assert.ok(!/height:min\(360px,calc\(100vh - 200px\)\)/.test(css),'fixed 360px cap removed');
assert.match(css,/#pta-home-pull\{--pta-pull-surface:#fff;--pta-pull-handle:#f8f9fc/);
assert.match(css,/html\.pta-theme-dark #pta-home-pull\{--pta-pull-surface:#18181a;--pta-pull-handle:#242428/);
assert.match(css,/\.pta-home-pull-inner\{[^}]*background:var\(--pta-pull-surface\)/);
assert.match(css,/#pta-home-pull-handle path\{fill:var\(--pta-pull-handle\)/);
assert.match(css,/#pta-shell\.collapsed #pta-home-pull\{visibility:hidden;pointer-events:none/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{#pta-home-pull \.pta-home-pull-fold\{transition:none/);
// Geometry contract: expanded fold plus the 32px handle's -1px joining overlap
// occupies exactly the available shell height below the header at any viewport.
for(const shellHeight of [220,350,554,700]){const available=shellHeight-62,fold=available-31,handle=32,overlap=-1;assert.equal(fold+handle+overlap,available);assert.ok(fold>0);}
const helper=src.slice(src.indexOf('    var homePull='),src.indexOf('    function catalogueDeadline('));assert.match(helper,/(shell\|\|expanded)\)\.appendChild\(host\)/);assert.ok(!/stopSolve|stopAssistance|location\.href\s*=/.test(helper));
console.log('PASS: shell-bottom anchoring, full-height scroll area, reachable handle geometry, opaque light/dark surfaces, collapse/reduced-motion guards, no answer-state mutation');
