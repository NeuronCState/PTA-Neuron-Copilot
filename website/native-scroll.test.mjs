import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {observeSections} from './native-scroll.mjs';
import fs from 'node:fs';
const {window:w}=new JSDOM('<main><section class="screen" id="a"></section><section class="screen" id="b"></section></main>');
let callback,disconnected=false;const observed=[];
class Observer{constructor(cb){callback=cb}observe(el){observed.push(el)}disconnect(){disconnected=true}}
const host=w.document.querySelector('main'),cleanup=observeSections(host,Observer);
assert.equal(observed.length,2);callback([{target:observed[0],isIntersecting:true},{target:observed[1],isIntersecting:false}]);
assert.equal(observed[0].dataset.active,'true');assert.equal(observed[1].dataset.active,'false');
for(const type of ['wheel','touchstart','touchmove','keydown']){const e=new w.Event(type,{cancelable:true,bubbles:true});host.dispatchEvent(e);assert.equal(e.defaultPrevented,false)}
cleanup();assert(disconnected);
const fallback=observeSections(host,null);assert(observed.every(el=>el.dataset.active==='true'));fallback();assert(observed.every(el=>!el.hasAttribute('data-active')));
const source=fs.readFileSync('src.jsx','utf8');assert(!source.includes('installSnap'));assert(!source.includes('ViewportPages'));assert(!source.includes('pnc:navigate'));assert(source.includes('href="./terminal/"'));assert(!fs.readFileSync('WorkflowShowcase.jsx','utf8').includes('pnc:navigate'));
console.log('PASS: native scroll owns no input/history; visibility lifecycle and fallback; no page packer/controller in homepage');w.close();
