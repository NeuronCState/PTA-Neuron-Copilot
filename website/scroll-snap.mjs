// Every gesture resolves to a whole viewport screen, including reduced motion.
export const SNAP_MS=700;
export const WHEEL_RELEASE_MS=55;
export const INTENT_PX=8;
export function ease(t){
 let lo=0,hi=1,u=t;
 for(let i=0;i<16;i++){u=(lo+hi)/2;const x=3*(1-u)*(1-u)*u*.45+3*(1-u)*u*u*.55+u*u*u;if(x<t)lo=u;else hi=u;}
 return 3*(1-u)*u*u+u*u*u;
}
export const continuationEase=t=>Math.min(1,ease(t)+.45*t*(1-t)*(1-t));
export function damp(distance,viewport){const limit=Math.min(110,viewport*.14);return Math.sign(distance)*limit*(1-Math.exp(-Math.abs(distance)*.32/limit));}
export const pageIntent=(index,total,count)=>Math.max(0,Math.min(count-1,index+(Math.abs(total)>=INTENT_PX?Math.sign(total):0)));
export function installSnap(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),html=document.documentElement;
 let screens=[],tops=[],keys=[],index=0,frame=0,timer=0,unlock=0,scrollTimer=0,gesture=null,touch=null,locked=false,tail=false,destination=null;
 const key=el=>el?.dataset.screenKey||el?.id;
 const clamp=i=>Math.max(0,Math.min(screens.length-1,Math.round(i)));
 const cancel=()=>{cancelAnimationFrame(frame);frame=0;html.classList.remove('snap-animating');};
 const move=y=>{html.classList.add('snap-animating');window.scrollTo(0,y);};
 const announce=()=>window.dispatchEvent(new CustomEvent('pnc:page',{detail:{index,count:screens.length}}));
 const reset=()=>{clearTimeout(timer);gesture=null;touch=null;cancel();locked=false;destination=null;};
 const settle=(next,instant=false)=>{
  if(!screens.length)return;
  reset();index=clamp(next);destination=index;const from=scrollY,to=tops[index];announce();
  const done=()=>{move(to);cancel();locked=false;destination=null;};
  if(instant||reduced.matches||Math.abs(to-from)<.5){done();return;}
  locked=true;let began;
  const step=now=>{began??=now;const t=Math.min(1,(now-began)/SNAP_MS);move(from+(to-from)*continuationEase(t));if(t<1)frame=requestAnimationFrame(step);else done();};
  frame=requestAnimationFrame(step);
 };
 const finish=()=>{clearTimeout(timer);if(gesture)settle(pageIntent(gesture.index,gesture.total,screens.length));};
 const drag=delta=>{if(!delta||!screens.length)return;gesture??={index,total:0};gesture.total+=delta;move(Math.max(tops[0],Math.min(tops.at(-1),tops[gesture.index]+damp(gesture.total,innerHeight))));};
 const excluded=e=>!!e.target?.closest?.('input,select,textarea,[role=slider],[contenteditable]:not([contenteditable=false])');
 const wheel=e=>{
  if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||excluded(e)||!e.cancelable)return;
  e.preventDefault();clearTimeout(unlock);unlock=setTimeout(()=>{tail=false;},160);
  if(locked||tail){tail=true;return;}
  drag(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));
  clearTimeout(timer);timer=setTimeout(()=>{tail=true;finish();},WHEEL_RELEASE_MS);
 };
 const touchStart=e=>{
  if(e.touches.length!==1){touch=null;if(gesture)settle(gesture.index,true);return;}
  if(excluded(e)){touch=null;return;}
  touch={x:e.touches[0].clientX,y:e.touches[0].clientY,blocked:locked};
 };
 const touchMove=e=>{
  // Multi-touch is always left to the browser for pinch zoom.
  if(e.touches.length!==1){touch=null;if(gesture)settle(gesture.index,true);return;}
  if(!touch||!e.cancelable)return;
  const t=e.touches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX;
  if(!gesture&&Math.abs(dx)>Math.abs(dy)&&!touch.blocked){touch=null;return;}
  e.preventDefault();if(locked||touch.blocked)return;
  touch={x:t.clientX,y:t.clientY,blocked:false};drag(dy);
 };
 const touchEnd=e=>{if(e.touches?.length)return;touch=null;finish();};
 const keydown=e=>{
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||excluded(e))return;
  // Arrow navigation belongs to local tablists, not the page controller.
  if(e.target?.closest?.('[role=tablist],[role=tab]')&&e.key.startsWith('Arrow'))return;
  if((e.key===' '||e.key==='Enter')&&e.target?.closest?.('button,a,[role=button]'))return;
  if(e.key==='Escape'||e.key==='Tab'){if(locked||gesture)settle(destination??gesture?.index??index,true);return;}
  let next;switch(e.key){case 'ArrowDown':case 'PageDown':next=index+1;break;case 'ArrowUp':case 'PageUp':next=index-1;break;case ' ':next=index+(e.shiftKey?-1:1);break;case 'Home':next=0;break;case 'End':next=screens.length-1;break;default:return;}
  e.preventDefault();settle(next);
 };
 const targetIndex=hash=>{let id;try{id=decodeURIComponent(hash.replace(/^#/,''));}catch{return -1;}if(!id||id==='main')return 0;const target=document.getElementById(id);return screens.indexOf(target?.closest('main>section.screen'));};
 const hashchange=()=>{const next=targetIndex(location.hash);if(next>=0)settle(next);};
 const click=e=>{
  if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  const a=e.target?.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target&&a.target!=='_self')return;
  const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||!url.hash)return;
  const next=targetIndex(url.hash);if(next<0)return;e.preventDefault();if(location.hash!==url.hash)history.pushState(null,'',url.hash);settle(next);
 };
 const focusin=e=>{const next=screens.indexOf(e.target?.closest?.('main>section.screen'));if(next>=0)settle(next,true);};
 const layout=()=>{
  const old=screens[index],identity=keys[index],next=[...document.querySelectorAll('main>section.screen')];
  const nextTops=next.map(el=>el.getBoundingClientRect().top+scrollY),nextKeys=next.map(key);
  // React can announce a layout without changing pagination. Never interrupt a
  // running gesture/animation for an equivalent set of pages and coordinates.
  const unchanged=next.length===screens.length&&next.every((el,i)=>(nextKeys[i]?nextKeys[i]===keys[i]:el===screens[i])&&Math.abs(nextTops[i]-tops[i])<.5);
  screens=next;tops=nextTops;keys=nextKeys;if(unchanged)return;
  let found=screens.findIndex(el=>el===old||(identity&&key(el)===identity));
  if(found<0&&identity){const base=identity.split('.')[0];found=keys.findIndex(k=>k?.split('.')[0]===base);}
  settle(found<0?index:found,true);
 };
 // Controls retain their native wheel/keyboard behavior. If it scrolls the
 // document as a side effect, recover the nearest whole screen once it ends.
 const recoverScroll=()=>{
  clearTimeout(scrollTimer);if(locked||gesture||touch||!screens.length||(window.visualViewport?.scale??1)!==1)return;
  let nearest=0;for(let i=1;i<tops.length;i++)if(Math.abs(tops[i]-scrollY)<Math.abs(tops[nearest]-scrollY))nearest=i;
  if(Math.abs(tops[nearest]-scrollY)>.5)settle(nearest);else if(index!==nearest){index=nearest;announce();}
 };
 const scroll=()=>{clearTimeout(scrollTimer);if(!locked&&!gesture)scrollTimer=setTimeout(recoverScroll,160);};
 const navigate=e=>{if(Number.isFinite(e.detail?.index))settle(e.detail.index);};
 const motion=()=>settle(destination??gesture?.index??index,true);
 const events={wheel,touchstart:touchStart,touchmove:touchMove,touchend:touchEnd,touchcancel:touchEnd,keydown,resize:layout,'pnc:layout':layout,'pnc:navigate':navigate,hashchange,popstate:hashchange,click,focusin,scroll,scrollend:recoverScroll};
 for(const [name,fn] of Object.entries(events))window.addEventListener(name,fn,{passive:!['wheel','touchmove','keydown','click'].includes(name)});
 reduced.addEventListener('change',motion);layout();const initial=targetIndex(location.hash);if(initial>=0)settle(initial,true);
 return ()=>{if(screens.length)settle(destination??gesture?.index??index,true);reset();clearTimeout(unlock);clearTimeout(scrollTimer);for(const [name,fn] of Object.entries(events))window.removeEventListener(name,fn);reduced.removeEventListener('change',motion);};
}
