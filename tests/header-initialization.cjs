const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8');
const css=src.slice(src.indexOf('var CSS = `')+11,src.indexOf('`;',src.indexOf('var CSS = `'))).replace(/\/\*[\s\S]*?\*\//g,'');
const selectors=['.pta-brand','.pta-brand-copy','.pta-pas-letter','.pta-pas-space'];
for(const selector of selectors){const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].split(',').map(s=>s.trim()).includes(selector));assert.ok(rules.length,selector);for(const rule of rules)assert.ok(!/transition:\s*all\b/.test(rule[2]),selector);}
const reset=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(m=>m[1].includes('#pta-root .pta-brand-copy')&&m[2].includes('border:0'));
assert.ok(reset);assert.ok(reset[1].includes('#pta-root .pta-brand-meta'));assert.ok(!reset[1].includes('button'));assert.ok(!reset[1].includes('input'));assert.ok(!reset[1].includes('*'));
assert.match(css,/#pta-root \.pta-dev-btn:focus-visible/);assert.match(css,/#pta-shell\{[^}]*transition:width/);assert.match(css,/\.pta-pas-rest\{[^}]*transition:max-width/);
console.log('PASS: decorative header owns borders, explicit transition properties, no global animation or interactive focus reset');
