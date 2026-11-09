import assert from 'node:assert/strict';
import {ease,continuationEase,snapDestination,SNAP_MS,WHEEL_RELEASE_MS} from './scroll-snap.mjs';
assert.equal(SNAP_MS,700);assert(ease(.1)<.1);assert(ease(.9)>.9);assert(Math.abs(ease(.5)-.5)<.001);
const tops=[0,800,2000,2800],heights=[800,1200,800,800];
assert.equal(snapDestination(tops,heights,0,500,800,2800),800);
assert.equal(snapDestination(tops,heights,800,900,800,2800),null);
assert.equal(snapDestination(tops,heights,800,1300,800,2800),2000);
assert.equal(snapDestination(tops,heights,2000,1500,800,2800),800);
assert.equal(snapDestination(tops,heights,0,20,800,2800),null);
console.log('PASS: 700 ms symmetric easing, forward/back snap, long section traversal, small-gesture guard');

assert.equal(WHEEL_RELEASE_MS,40);assert(continuationEase(.02)>ease(.02));for(let i=1;i<=100;i++)assert(continuationEase(i/100)>=continuationEase((i-1)/100));assert(Math.abs(continuationEase(1)-1)<.001);console.log("PASS: immediate touch release, 40ms wheel release budget, monotonic velocity-continuous easing");

assert.equal(snapDestination(tops,heights,0,160,800,2800),null);assert.equal(snapDestination(tops,heights,0,430,800,2800),null);
