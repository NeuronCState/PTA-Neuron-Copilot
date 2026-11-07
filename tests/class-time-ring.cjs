const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8'),ctx={};
vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('    function catalogueTimeRing('),src.indexOf('    function renderCatalogueTimeRing('))+src.slice(src.indexOf('    function catalogueVisibleMetricNote('),src.indexOf('    function catalogueArchiveGroups(')),ctx);
const now=1000000000,day=86400000;
let v=ctx.catalogueTimeRing({startTime:now-day,endTime:now+day},now);assert.equal(v.days,'1天');assert.equal(v.ratio,.5);
v=ctx.catalogueTimeRing({startTime:now+day,endTime:now+2*day},now);assert.equal(v.caption,'未开始');assert.equal(v.ratio,1);
v=ctx.catalogueTimeRing({startTime:now-day,endTime:now+1},now);assert.equal(v.days,'1天');
for(const end of [now,now-1]){v=ctx.catalogueTimeRing({endTime:end},now);assert.equal(v.days,'0天');assert.equal(v.ratio,0);assert.equal(v.caption,'已截止');}
for(const start of [null,undefined,NaN,now+2*day]){v=ctx.catalogueTimeRing({startTime:start,endTime:now+day},now);assert.equal(v.days,'1天');assert.equal(v.ratio,null);}
v=ctx.catalogueTimeRing({deadlineOrder:now+day},now);assert.equal(v.days,'—');assert.equal(v.ratio,null,'do not invent timezone from display-only fallback');
assert.equal(ctx.catalogueVisibleMetricNote('更新于 2026/11/7'),'');
assert.equal(ctx.catalogueVisibleMetricNote('进度缓存于 2026/11/7；分数本次更新'),'进度来自缓存');
assert.equal(ctx.catalogueVisibleMetricNote('缓存于 2026/11/7'),'历史缓存');
assert.equal(ctx.catalogueVisibleMetricNote('没有读取权限'),'没有读取权限');
assert.ok(src.includes("ring.setAttribute('aria-label',value.label)"));
assert.ok(src.includes('grid-template-columns:minmax(0,1fr)64px'));
console.log('PASS time ring: remaining fraction/day rounding, upcoming/expired/unknown, no fabricated start, timestamp removal with cache/error meaning preserved');
