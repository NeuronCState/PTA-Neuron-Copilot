// Every gesture resolves to a whole viewport page, including reduced motion.
export const SNAP_MS=440;
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
export const directionLock=(x,y)=>Math.max(Math.abs(x),Math.abs(y))<INTENT_PX?null:Math.abs(x)>Math.abs(y)?'x':'y';
export function installSnap(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),html=document.documentElement;
 let screens=[],tops=[],keys=[],pages=[],tracks=[],xs=[],slideKeys=[],width=0,index=0,frame=0,timer=0,unlock=0,scrollTimer=0,gesture=null,touch=null,locked=false,tail=false,destination=null,pendingReset=null;
 const memory=new Map();
 const key=el=>el?.dataset.screenKey||el?.id;
 const clamp=(i,count=screens.length)=>Math.max(0,Math.min(count-1,Math.round(i)));
 const count=i=>Math.max(1,pages[i]?.length||0);
 const cancel=()=>{cancelAnimationFrame(frame);frame=0;html.classList.remove('snap-animating');};
 const move=y=>{html.classList.add('snap-animating');window.scrollTo(0,y);};
 const moveX=(i,px)=>{if(tracks[i]){tracks[i].style.transition='none';tracks[i].style.transform=`translate3d(${-px}px,0,0)`;}};
 const remember=()=>screens.forEach((s,i)=>memory.set(key(s)||s,{x:xs[i],slide:slideKeys[i]?.[xs[i]]}));
 const activate=()=>screens.forEach((screen,i)=>{
  screen.dataset.active=String(i===index);screen.style.setProperty('--slide-index',xs[i]);
  const toolbar=screen.querySelector('.chapter-toolbar');if(toolbar){toolbar.inert=i!==index;toolbar.toggleAttribute('inert',i!==index);toolbar.setAttribute('aria-hidden',String(i!==index));}
  pages[i].forEach((slide,x)=>{const active=i===index&&x===xs[i];slide.dataset.active=String(active);slide.inert=!active;slide.toggleAttribute('inert',!active);slide.setAttribute('aria-hidden',String(!active));});
 });
 const announce=()=>{activate();remember();const slide=pages[index]?.[xs[index]];window.dispatchEvent(new CustomEvent('pnc:page',{detail:{index,count:screens.length,xIndex:xs[index]||0,xCount:count(index),label:slide?.dataset.label||screens[index]?.getAttribute('aria-label')||slide?.getAttribute('aria-label')||''}}));};
 const reset=()=>{clearTimeout(timer);gesture=null;touch=null;cancel();locked=false;destination=null;};
 const settle=(next,instant=false,xNext)=>{
  if(!screens.length)return;
  const old=index,oldX=xs[old],fromX=tracks[old]?Number(tracks[old].dataset.offset??oldX*width):oldX*width;
  reset();index=clamp(next);if(Number.isFinite(xNext))xs[index]=clamp(xNext,count(index));destination=index;
  const from=scrollY,to=tops[index],toX=xs[index]*width,startX=index===old?fromX:toX;
  const horizontal=Math.abs(toX-startX)>.5;
  if(old!==index){moveX(old,oldX*width);if(tracks[old])tracks[old].dataset.offset=oldX*width;}
  const paint=t=>{move(from+(to-from)*t);moveX(index,startX+(toX-startX)*t);if(tracks[index])tracks[index].dataset.offset=startX+(toX-startX)*t;};
  announce();const done=()=>{paint(1);cancel();locked=false;destination=null;};
  if(instant||reduced.matches||(!horizontal&&Math.abs(to-from)<.5)){done();return;}
  locked=true;let began;
  const step=now=>{began??=now;const t=Math.min(1,(now-began)/SNAP_MS);paint(continuationEase(t));if(t<1)frame=requestAnimationFrame(step);else done();};
  frame=requestAnimationFrame(step);
 };
 const finish=()=>{clearTimeout(timer);if(gesture){const g=gesture;if(g.axis==='x')settle(g.index,false,pageIntent(g.x,g.total,count(g.index)));else settle(pageIntent(g.index,g.total,screens.length));}};
 const drag=(dx,dy)=>{
  if(!screens.length)return;gesture??={index,x:xs[index],dx:0,dy:0,total:0,axis:null};
  gesture.dx+=dx;gesture.dy+=dy;gesture.axis??=directionLock(gesture.dx,gesture.dy);
  if(!gesture.axis)return;gesture.total=gesture.axis==='x'?gesture.dx:gesture.dy;
  if(gesture.axis==='x'){const px=Math.max(0,Math.min((count(index)-1)*width,gesture.x*width+damp(gesture.total,width)));moveX(index,px);if(tracks[index])tracks[index].dataset.offset=px;}
  else move(Math.max(tops[0],Math.min(tops.at(-1),tops[gesture.index]+damp(gesture.total,innerHeight))));
 };
 const zoomed=()=>(window.visualViewport?.scale??1)>1;
 const releaseZoom=()=>{clearTimeout(timer);gesture=null;touch=null;if(locked){cancel();locked=false;destination=null;} };
 const excluded=e=>!!e.target?.closest?.('input,select,textarea,[role=slider],[contenteditable]:not([contenteditable=false])');
 const wheel=e=>{
  if(zoomed()){releaseZoom();return;}
  if(e.ctrlKey||excluded(e)||!e.cancelable)return;
  e.preventDefault();clearTimeout(unlock);unlock=setTimeout(()=>{tail=false;},160);
  if(locked||tail){tail=true;return;}
  const factor=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;
  drag((e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX||0)*factor,(e.shiftKey?0:e.deltaY||0)*factor);
  clearTimeout(timer);timer=setTimeout(()=>{tail=true;finish();},WHEEL_RELEASE_MS);
 };
 const touchStart=e=>{
  if(zoomed()){releaseZoom();return;}
  if(e.touches.length!==1){touch=null;if(gesture)settle(gesture.index,true);return;}
  if(excluded(e)){touch=null;return;}
  // A distinct finger-down is a new gesture, unlike a wheel momentum tail.
  if(locked||gesture)settle(destination??index,true);
  clearTimeout(unlock);tail=false;
  touch={x:e.touches[0].clientX,y:e.touches[0].clientY};
 };
 const touchMove=e=>{
  if(zoomed()){releaseZoom();return;}
  if(e.touches.length!==1){touch=null;if(gesture)settle(gesture.index,true);return;}
  if(!touch||!e.cancelable)return;
  const t=e.touches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX;
  e.preventDefault();touch={x:t.clientX,y:t.clientY};drag(dx,dy);
 };
 const touchEnd=e=>{if(e.touches?.length)return;touch=null;finish();};
 const keydown=e=>{
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||excluded(e))return;
  if(e.target?.closest?.('[role=tablist],[role=tab]')&&e.key.startsWith('Arrow'))return;
  if((e.key===' '||e.key==='Enter')&&e.target?.closest?.('button,a,[role=button]'))return;
  if(e.key==='Escape'||e.key==='Tab'){if(locked||gesture)settle(destination??gesture?.index??index,true);return;}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();settle(index,false,xs[index]+(e.key==='ArrowRight'?1:-1));return;}
  let next;switch(e.key){case 'ArrowDown':case 'PageDown':next=index+1;break;case 'ArrowUp':case 'PageUp':next=index-1;break;case ' ':next=index+(e.shiftKey?-1:1);break;case 'Home':next=0;break;case 'End':next=screens.length-1;break;default:return;}
  e.preventDefault();settle(next);
 };
 const targetPage=target=>{const i=screens.indexOf(target?.closest?.('main>section.screen'));return {index:i,xIndex:i>=0?pages[i].indexOf(target?.closest?.('.chapter-slide')):-1};};
 const targetHash=hash=>{let id;try{id=decodeURIComponent(hash.replace(/^#/,''));}catch{return {index:-1};}if(!id||id==='main')return {index:0};return targetPage(document.getElementById(id));};
 const goTarget=({index:i,xIndex:x},instant=false)=>{if(i>=0)settle(i,instant,x>=0?x:undefined);};
 const hashchange=()=>goTarget(targetHash(location.hash));
 const click=e=>{
  if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  const a=e.target?.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target&&a.target!=='_self')return;
  const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||!url.hash)return;
  const next=targetHash(url.hash);if(next.index<0)return;e.preventDefault();if(location.hash!==url.hash)history.pushState(null,'',url.hash);goTarget(next);
 };
 const focusin=e=>{const target=targetPage(e.target);if(target.index===index&&(target.xIndex<0||target.xIndex===xs[index])&&locked)return;goTarget(target,true);};
 const layout=()=>{
  const old=screens[index],identity=keys[index],next=[...document.querySelectorAll('main>section.screen')];
  const nextTops=next.map(el=>el.getBoundingClientRect().top+scrollY),nextKeys=next.map(key),nextPages=next.map(s=>[...s.querySelectorAll('.chapter-slide')]);
  const nextWidth=window.innerWidth||globalThis.innerWidth||1024;
  const unchanged=nextWidth===width&&next.length===screens.length&&next.every((el,i)=>el===screens[i]&&nextKeys[i]===keys[i]&&Math.abs(nextTops[i]-tops[i])<.5&&nextPages[i].length===pages[i].length&&nextPages[i].every((p,x)=>p===pages[i][x]&&p.dataset.slideKey===slideKeys[i][x]));
  if(unchanged){if(pendingReset!==null){pendingReset=null;settle(index,true,0);}return;}
  remember();screens=next;tops=nextTops;keys=nextKeys;pages=nextPages;width=nextWidth;tracks=screens.map(s=>s.querySelector('.chapter-track'));slideKeys=pages.map(p=>p.map(s=>s.dataset.slideKey));
  xs=screens.map((s,i)=>{const saved=memory.get(key(s)||s);if(pendingReset===(key(s)||s))return 0;const found=saved?.slide?slideKeys[i].indexOf(saved.slide):-1;return clamp(found>=0?found:saved?.x||0,count(i));});pendingReset=null;
  screens.forEach((s,i)=>{moveX(i,xs[i]*width);if(tracks[i])tracks[i].dataset.offset=xs[i]*width;});
  let found=screens.findIndex(el=>el===old||(identity&&key(el)===identity));
  if(found<0&&identity){const base=identity.split('.')[0];found=keys.findIndex(k=>k?.split('.')[0]===base);}
  settle(found<0?index:found,true);
 };
 const recoverScroll=()=>{
  clearTimeout(scrollTimer);if(locked||gesture||touch||!screens.length||(window.visualViewport?.scale??1)!==1)return;
  let nearest=0;for(let i=1;i<tops.length;i++)if(Math.abs(tops[i]-scrollY)<Math.abs(tops[nearest]-scrollY))nearest=i;
  if(Math.abs(tops[nearest]-scrollY)>.5)settle(nearest);else if(index!==nearest){index=nearest;announce();}
 };
 const scroll=()=>{clearTimeout(scrollTimer);if(!locked&&!gesture)scrollTimer=setTimeout(recoverScroll,160);};
 const navigate=e=>{if(Number.isFinite(e.detail?.index)||Number.isFinite(e.detail?.xIndex))settle(Number.isFinite(e.detail.index)?e.detail.index:index,e.detail.instant===true,e.detail.xIndex);};
 const horizontalReset=()=>{pendingReset=key(screens[index])||screens[index];settle(index,true,0);};
 const motion=()=>settle(destination??gesture?.index??index,true);
 const events={wheel,touchstart:touchStart,touchmove:touchMove,touchend:touchEnd,touchcancel:touchEnd,keydown,resize:layout,'pnc:layout':layout,'pnc:navigate':navigate,'pnc:horizontal-reset':horizontalReset,hashchange,popstate:hashchange,click,focusin,scroll,scrollend:recoverScroll};
 for(const [name,fn] of Object.entries(events))window.addEventListener(name,fn,{passive:!['wheel','touchmove','keydown','click'].includes(name)});
 reduced.addEventListener('change',motion);layout();goTarget(targetHash(location.hash),true);
 return ()=>{if(screens.length)settle(destination??gesture?.index??index,true);reset();clearTimeout(unlock);clearTimeout(scrollTimer);for(const [name,fn] of Object.entries(events))window.removeEventListener(name,fn);reduced.removeEventListener('change',motion);};
}
