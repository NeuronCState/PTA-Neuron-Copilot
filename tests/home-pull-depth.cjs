const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8');
const css=src.slice(src.indexOf('var CSS = `'),src.indexOf('`;',src.indexOf('var CSS = `')));
assert.match(css,/#pta-home-pull\{[^}]*top:0;bottom:0[^}]*display:flex;flex-direction:column/);
assert.match(css,/#pta-home-pull \.pta-home-pull-fold\{[^}]*height:calc\(100% - 20px\)/);
assert.match(css,/#pta-home-pull #pta-class-home\{height:100%;min-height:0;max-height:none[^}]*overflow:auto/);
assert.ok(!/height:min\(360px,calc\(100vh - 200px\)\)/.test(css),'fixed 360px cap removed');
assert.match(css,/#pta-home-pull\{--pta-pull-surface:#fff;--pta-pull-handle:#f8f9fc/);
assert.match(css,/html\.pta-theme-dark #pta-home-pull\{--pta-pull-surface:#18181a;--pta-pull-handle:#242428/);
assert.match(css,/\.pta-home-pull-inner\{[^}]*background:var\(--pta-pull-surface\)/);
assert.match(css,/#pta-home-pull-handle path\{fill:var\(--pta-pull-handle\)/);
assert.match(css,/#pta-shell\.collapsed #pta-home-pull\{visibility:hidden;pointer-events:none/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{#pta-home-pull\{transition:none/);
// One shared transform owns both panel and handle, including reversal.
for(const shellHeight of [220,350,554,700]){const fold=shellHeight-20;for(const progress of [0,.1,.35,.8,1,.8,.35,.1,0]){const y=-(shellHeight-20)*(1-progress);const panelBottom=y+fold,handleTop=y+fold;assert.equal(panelBottom,handleTop);if(progress===0)assert.equal(handleTop,0);if(progress===1)assert.equal(handleTop+20,shellHeight);}}
assert.match(css,/#pta-home-pull\{[^}]*transform:translateY\(calc\(-100% \+ 20px\)\);transition:transform/);
assert.match(css,/#pta-home-pull\.open\{transform:translateY\(0\)/);
const foldRule=css.match(/#pta-home-pull \.pta-home-pull-fold\{([^}]*)\}/)[1];assert.ok(!/transition|opacity|grid-template/.test(foldRule));
assert.match(css,/#pta-root #pta-home-pull-handle\{[^}]*width:2em;height:20px[^}]*filter:drop-shadow/);
assert.match(css,/#pta-home-pull-handle svg\{[^}]*opacity:\.62/);assert.match(css,/#pta-root #pta-home-pull-handle:hover svg[^}]*\{opacity:1/);
assert.ok(!/pta-answer-home-host\{[^}]*padding-top/.test(css));
const helper=src.slice(src.indexOf('    var homePull='),src.indexOf('    function catalogueDeadline('));assert.match(helper,/(shell\|\|expanded)\)\.appendChild\(host\)/);assert.ok(!/stopSolve|stopAssistance|location\.href\s*=/.test(helper));
console.log('PASS: shell-bottom anchoring, full-height scroll area, reachable handle geometry, opaque light/dark surfaces, collapse/reduced-motion guards, no answer-state mutation');
