const assert=require('node:assert/strict'),{harness}=require('./class-home-api.cjs');
(async()=>{
 const h=harness({total:10,delay:700});
 const row=(id,classes,deadline,lifecycle='active')=>({id,groups:classes.map(([id,name])=>({id,name})),group:classes[0][1],title:'Set '+id,deadlineOrder:Number.isFinite(deadline)&&deadline<100?Date.UTC(2026,10,8)+deadline:deadline,lifecycle});
 const now=h.ctx.Date.now();
 const mixed=[row('old',[['1','A']],now-1000,'ended'),row('far',[['1','A']],now+100000),row('unknown',[['1','A']],Infinity,'unknown'),row('near',[['1','A']],now+1000),row('boundary',[['1','A']],now,'unknown'),row('upcoming',[['1','A']],now+50000,'upcoming')];
 assert.equal(h.api.groupCatalogueRows(mixed).groups[0].items.map(r=>r.id).join(','),'near,upcoming,far,unknown,old,boundary');
 assert.equal(h.api.catalogueProgressQueue(mixed).map(r=>r.id).join(','),'near,far');
 assert.equal(mixed[2].lifecycle,'unknown','ordering must not mutate unknown state');
 const rows=[row('1',[['2','B']],10),row('2',[['1','A']],20),row('3',[['2','B'],['1','A']],5),row('4',[['1','A']],1,'ended'),row('5',[['3','C']],2,'unknown'),row('6',[['1','A']],Infinity)];
 assert.equal(h.api.catalogueProgressQueue(rows).map(r=>r.id).join(','),'3,2,6,1');assert.equal(rows.map(r=>r.id).join(','),'1,2,3,4,5,6','do not reorder source catalogue');
 await h.flush(h.api.loadClassCatalogue());
 const displayOrder=h.api.groupCatalogueRows(h.api.catalogueState.rows).groups.flatMap(g=>g.items.map(r=>r.id));
 const expected=[...new Set(displayOrder)],started=h.calls.filter(c=>c.url.pathname.endsWith('/exams')).map(c=>c.url.pathname.split('/')[3]);
 assert.deepEqual(started,expected);assert.notDeepEqual(started,['1','2','3','4','5','6','7','8','9','10'],'network now follows class layout, not source API ordering');
 console.log('PASS: displayed class/deadline ordering, repeated memberships deduplicated at first occurrence, active-only queue, actual concurrent exam starts follow UI order');
})().catch(e=>{console.error(e);process.exitCode=1;});
