// Gesture-end snapping. Native scrolling remains untouched while a gesture is active.
export const SNAP_MS=700;
export const WHEEL_RELEASE_MS=40;
// Carry a little velocity into the snap, rather than visually stopping and restarting.
export const continuationEase=t=>Math.min(1,ease(t)+.45*t*(1-t)*(1-t));
export function ease(t){
 // cubic-bezier(.45,0,.55,1), solve x(t) for time with bounded bisection.
 let lo=0,hi=1,u=t;
 for(let i=0;i<16;i++){u=(lo+hi)/2;const x=3*(1-u)*(1-u)*u*.45+3*(1-u)*u*u*.55+u*u*u;if(x<t)lo=u;else hi=u;}
 return 3*(1-u)*u*u+u*u*u;
}
export function snapDestination(tops,heights,start,end,viewport,max){
 const direction=Math.sign(end-start); if(Math.abs(end-start)<Math.max(120,viewport*.55)||!direction)return null;
 let index=0;for(let i=0;i<tops.length;i++)if(tops[i]<=start+32)index=i;
 // Let oversized sections scroll normally until their edge is reached.
 if(direction>0&&heights[index]>viewport+40&&end+viewport<tops[index]+heights[index]-40)return null;
 if(direction<0&&start>tops[index]+40&&end>tops[index]+24)return null;
 const target=direction>0?Math.min(index+1,tops.length-1):(start>tops[index]+40?index:Math.max(0,index-1));
 return Math.max(0,Math.min(max,tops[target]));
}
export function installSnap(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let timer=0,frame=0,releaseFrame=0,start=null,touching=false;
 const cancel=()=>{cancelAnimationFrame(frame);frame=0;document.documentElement.classList.remove('snap-animating');};
 const finish=()=>{
  timer=0;if(touching||start===null)return;
  const from=start;start=null;if(reduced.matches)return;
  const sections=[...document.querySelectorAll('main>section')];
  const tops=sections.map(el=>el.getBoundingClientRect().top+scrollY);
  // Include header in first screen.
  tops[0]=0;
  const heights=tops.map((t,i)=>(tops[i+1]??document.documentElement.scrollHeight)-t);
  const to=snapDestination(tops,heights,from,scrollY,innerHeight,document.documentElement.scrollHeight-innerHeight);
  if(to===null||Math.abs(to-scrollY)<2)return;
  const y=scrollY;let began;
  document.documentElement.classList.add('snap-animating');
  const step=now=>{began??=now;const t=Math.min(1,(now-began)/SNAP_MS);window.scrollTo(0,y+(to-y)*continuationEase(t));if(t<1)frame=requestAnimationFrame(step);else cancel();};
  frame=requestAnimationFrame(step);
 };
 const activity=()=>{if(start!==null&&!touching){clearTimeout(timer);timer=setTimeout(finish,WHEEL_RELEASE_MS);}};
 const begin=e=>{
  if(e.type==='wheel'&&(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)))return;
  if(e.target.closest('input,select,textarea,[contenteditable=true]'))return;
  // Don't hijack a locally scrollable panel.
  for(let el=e.target;el&&el!==document.body;el=el.parentElement){const cs=getComputedStyle(el);if(/auto|scroll/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+2)return;}
  cancelAnimationFrame(releaseFrame);cancel();if(start===null)start=scrollY;activity();
 };
 const touchStart=e=>{touching=true;begin(e);};
 const touchEnd=()=>{touching=false;clearTimeout(timer);cancelAnimationFrame(releaseFrame);releaseFrame=requestAnimationFrame(finish);};
 const key=()=>{clearTimeout(timer);cancelAnimationFrame(releaseFrame);start=null;cancel();};
 window.addEventListener('wheel',begin,{passive:true});window.addEventListener('touchstart',touchStart,{passive:true});window.addEventListener('touchend',touchEnd,{passive:true});window.addEventListener('touchcancel',touchEnd,{passive:true});window.addEventListener('keydown',key);window.addEventListener('resize',key);reduced.addEventListener('change',key);
 return ()=>{key();window.removeEventListener('wheel',begin);window.removeEventListener('touchstart',touchStart);window.removeEventListener('touchend',touchEnd);window.removeEventListener('touchcancel',touchEnd);window.removeEventListener('keydown',key);window.removeEventListener('resize',key);reduced.removeEventListener('change',key);};
}
