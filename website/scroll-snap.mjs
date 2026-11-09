// One light, deliberate gesture moves one page. Long sections remain readable.
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
// Within an oversized section return its reading boundary, not the next page.
export function routeGesture(tops,y,viewport,max,direction){
 let i=0;for(let n=0;n<tops.length;n++)if(tops[n]<=y+2)i=n;
 const top=tops[i],bottom=Math.max(top,Math.min(max,(tops[i+1]??max+viewport)-viewport));
 if(direction>0&&y<bottom-2)return {reading:true,edge:bottom};
 if(direction<0&&y>top+2)return {reading:true,edge:top};
 const target=direction>0?Math.min(max,tops[i+1]??max):Math.max(0,i?Math.max(tops[i-1],top-viewport):0);
 return {reading:false,target,origin:y};
}
export function installSnap(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let timer=0,frame=0,gesture=null,touch=null,locked=false,unlock=0,tail=false;
 const html=document.documentElement;
 const cancel=()=>{cancelAnimationFrame(frame);frame=0;html.classList.remove('snap-animating');};
 const move=y=>{html.classList.add('snap-animating');window.scrollTo(0,y);};
 const metrics=()=>{const tops=[...document.querySelectorAll('main>section')].map(el=>el.getBoundingClientRect().top+scrollY);tops[0]=0;return {tops,max:Math.max(0,html.scrollHeight-innerHeight)};};
 const excluded=e=>{
  if(e.target.closest('input,select,textarea,[role=slider],[contenteditable=true]'))return true;
  for(let el=e.target;el&&el!==document.body;el=el.parentElement){if(/auto|scroll/.test(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+2)return true;}
  return false;
 };
 const finish=()=>{
  clearTimeout(timer);timer=0;if(!gesture)return;
  const g=gesture;gesture=null;const to=Math.abs(g.total)>=INTENT_PX?g.target:g.origin;
  const y=scrollY;locked=true;let began;
  const step=now=>{began??=now;const t=Math.min(1,(now-began)/SNAP_MS);move(y+(to-y)*continuationEase(t));if(t<1)frame=requestAnimationFrame(step);else{cancel();locked=false;}};
  if(reduced.matches||Math.abs(to-y)<.5){move(to);cancel();locked=false;return;}
  frame=requestAnimationFrame(step);
 };
 const drag=delta=>{
  if(!delta)return;
  if(!gesture){const m=metrics(),route=routeGesture(m.tops,scrollY,innerHeight,m.max,Math.sign(delta));
   if(route.reading){move(Math.sign(delta)>0?Math.min(route.edge,scrollY+delta):Math.max(route.edge,scrollY+delta));html.classList.remove('snap-animating');return;}
   gesture={origin:scrollY,target:route.target,total:0};
  }
  gesture.total+=delta;
  // Reversal before release cancels the intent without exposing another page.
  const intended=Math.sign(gesture.target-gesture.origin);
  if(intended&&Math.sign(gesture.total)!==intended)gesture.total=0;
  const m=metrics();move(Math.max(0,Math.min(m.max,gesture.origin+damp(gesture.total,innerHeight))));
 };
 const wheel=e=>{
  if(reduced.matches||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||excluded(e)||!e.cancelable)return;
  e.preventDefault();clearTimeout(unlock);
  if(locked||tail){tail=true;unlock=setTimeout(()=>{tail=false;},120);return;}
  drag(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));
  clearTimeout(timer);timer=setTimeout(finish,WHEEL_RELEASE_MS);
 };
 const touchStart=e=>{
  if(reduced.matches||e.touches.length!==1||excluded(e)||locked){touch=null;return;}
  touch={x:e.touches[0].clientX,y:e.touches[0].clientY};
 };
 const touchMove=e=>{
  if(!touch||e.touches.length!==1||!e.cancelable)return;
  const t=e.touches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX;
  if(!gesture&&Math.abs(dx)>Math.abs(dy)){touch=null;return;}
  e.preventDefault();touch={x:t.clientX,y:t.clientY};drag(dy);
 };
 const touchEnd=()=>{touch=null;finish();};
 const reset=()=>{clearTimeout(timer);clearTimeout(unlock);touch=null;const g=gesture;gesture=null;cancel();locked=false;tail=false;if(g){move(g.origin);cancel();}};
 window.addEventListener('wheel',wheel,{passive:false});window.addEventListener('touchstart',touchStart,{passive:true});window.addEventListener('touchmove',touchMove,{passive:false});window.addEventListener('touchend',touchEnd,{passive:true});window.addEventListener('touchcancel',touchEnd,{passive:true});window.addEventListener('keydown',reset);window.addEventListener('resize',reset);reduced.addEventListener('change',reset);
 return ()=>{reset();window.removeEventListener('wheel',wheel);window.removeEventListener('touchstart',touchStart);window.removeEventListener('touchmove',touchMove);window.removeEventListener('touchend',touchEnd);window.removeEventListener('touchcancel',touchEnd);window.removeEventListener('keydown',reset);window.removeEventListener('resize',reset);reduced.removeEventListener('change',reset);};
}
