const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Neuron Copilot-2.0.0.user.js','utf8'),ctx={};
vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('    function catalogueTimeRing('),src.indexOf('    function renderCatalogueTimeRing('))+src.slice(src.indexOf('    function catalogueVisibleMetricNote('),src.indexOf('    function catalogueArchiveGroups(')),ctx);
const now=1000000000,day=86400000;
let v=ctx.catalogueTimeRing({startTime:now-day,endTime:now+day,metrics:{answered:3,total:4}},now);assert.equal(v.days,'1天');assert.equal(v.ratio,.75,'completion, not half elapsed time');
v=ctx.catalogueTimeRing({endTime:now+day,metrics:{answered:55,total:66}},now);assert.equal(v.ratio,55/66);assert.equal(v.days,'1天','no start time needed');
v=ctx.catalogueTimeRing({startTime:now+day,endTime:now+2*day,metrics:{answered:0,total:10}},now);assert.equal(v.caption,'未开始');assert.equal(v.ratio,0);
v=ctx.catalogueTimeRing({endTime:now+1},now);assert.equal(v.days,'1分钟');assert.equal(v.ratio,null);
for(const end of [now,now-1]){v=ctx.catalogueTimeRing({endTime:end,metrics:{answered:10,total:10}},now);assert.equal(v.days,'已截止');assert.equal(v.ratio,1,'deadline must not reset completion');assert.equal(v.caption,'');}
for(const metrics of [null,{}, {answered:null,total:10},{answered:0,total:0},{answered:11,total:10},{answered:-1,total:10},{answered:2.5,total:10},{answered:2,total:Infinity}]){v=ctx.catalogueTimeRing({metrics,endTime:now+day},now);assert.equal(v.ratio,null);assert.equal(v.days,'1天');}
v=ctx.catalogueTimeRing({metrics:{answered:5,total:10},metricsCached:true},now);assert.equal(v.days,'—');assert.equal(v.ratio,.5,'unknown time must not hide known completion');assert.match(v.label,/缓存/);
v=ctx.catalogueTimeRing({deadlineOrder:now+day},now);assert.equal(v.days,'—');assert.equal(v.ratio,null);
assert.equal(ctx.catalogueVisibleMetricNote('更新于 2026/11/7'),'');
assert.equal(ctx.catalogueVisibleMetricNote('进度缓存于 2026/11/7；分数本次更新'),'进度来自缓存');
assert.equal(ctx.catalogueVisibleMetricNote('缓存于 2026/11/7'),'历史缓存');
assert.equal(ctx.catalogueVisibleMetricNote('没有读取权限'),'没有读取权限');
assert.ok(src.includes("ring.setAttribute('aria-label',value.label)"));
assert.ok(src.includes('grid-template-columns:minmax(0,1fr)64px'));
console.log('PASS saved-completion ring independent of remaining days, unknown/zero-total/invalid counts, full completion after deadline and cached provenance');
