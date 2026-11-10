import assert from 'node:assert/strict';
import {JOURNEYS,buildJourney,anchorFor,cameraPose,travelPosition,DURATION} from './workflow-journey.mjs';
import {camera,project} from './workflow-3d-engine.mjs';
for(const kind of Object.keys(JOURNEYS)){
 const zero=buildJourney(kind,JOURNEYS[kind].map(()=>0));
 const done=buildJourney(kind,JOURNEYS[kind].map(()=>DURATION));
 assert.deepEqual([...new Set(zero.objects.map(o=>o.stageIndex))],JOURNEYS[kind].map((_,i)=>i));
 assert.deepEqual([...new Set(done.objects.map(o=>o.stageIndex))],JOURNEYS[kind].map((_,i)=>i));
 assert.equal(zero.labels.length,JOURNEYS[kind].length*3);
 assert(zero.objects.length>100);
 for(const o of done.objects)assert(o.p.every(Number.isFinite));
}
assert.equal(travelPosition(0,2,0).position,0);
assert.equal(travelPosition(0,2,1.8).position,2);
assert(travelPosition(0,2,.9).position>0&&travelPosition(0,2,.9).position<2);
assert.equal(travelPosition(0,2,.9).done,false);
const a=cameraPose(0),b=cameraPose(1),mid=cameraPose(.5,.5);
assert(mid.zoom>a.zoom&&mid.zoom>b.zoom,'camera pulls back between models');
assert.notEqual(a.yaw,b.yaw,'camera direction changes, not a 2D slide');
const before=project([0,.4,0],camera(1.8,a.yaw,a.pitch,a.focus,a.zoom),600,330);
const after=project([0,.4,0],camera(1.8,b.yaw,b.pitch,b.focus,b.zoom),600,330);
assert.notEqual(before[0],after[0]);
const focus=[3,2,-4],p=[.5,.7,.2];
const moved=project(p.map((v,i)=>v+focus[i]),camera(1.8,-.1,.2,focus),600,330);
const origin=project(p,camera(1.8,-.1,.2),600,330);
for(let i=0;i<3;i++)assert(Math.abs(moved[i]-origin[i])<1e-9);
console.log('PASS: all model groups persist, world coordinates, camera translation, continuous dolly and pull-back');

const nearCamera = camera(1.8, -.1, .2, [0,0,0], 1);
const farCamera = camera(1.8, -.1, .2, [0,0,0], 1.4);
const span = vp => Math.abs(project([1,0,0],vp,600,330)[0]-project([-1,0,0],vp,600,330)[0]);
assert(span(farCamera) < span(nearCamera), "camera pull-back changes the actual projection, not only pose metadata");
