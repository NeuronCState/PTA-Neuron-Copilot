import assert from 'node:assert/strict';
import {ease,continuationEase,damp,pageIntent,SNAP_MS,INTENT_PX,directionLock} from './scroll-snap.mjs';
assert.equal(SNAP_MS,440);assert.equal(INTENT_PX,8);assert(ease(.1)<.1);assert(ease(.9)>.9);
for(let i=1;i<=100;i++)assert(continuationEase(i/100)>=continuationEase((i-1)/100));
assert(damp(20,800)>0&&damp(20,800)<20);assert(damp(10000,800)<=110);assert.equal(damp(-20,800),-damp(20,800));
assert.equal(pageIntent(1,7,3),1);assert.equal(pageIntent(1,8,3),2);assert.equal(pageIntent(1,-8,3),0);assert.equal(pageIntent(1,10000,3),2);assert.equal(pageIntent(0,-8,3),0);assert.equal(pageIntent(2,8,3),2);
console.log('PASS: 440ms monotonic easing, light intent, bounded damping, exactly one adjacent screen');

assert.equal(directionLock(7,7),null);assert.equal(directionLock(9,8),"x");assert.equal(directionLock(8,9),"y");assert.equal(directionLock(-10,8),"x");
