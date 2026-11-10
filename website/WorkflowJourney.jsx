import React,{useEffect,useRef,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {camera,createSceneRenderer,project} from './workflow-3d-engine.mjs';
import {phases} from './workflow-3d-scenes.mjs';
import {buildJourney,cameraPose,travelPosition,DURATION,JOURNEYS} from './workflow-journey.mjs';
import './workflow-3d.css';
import './workflow-journey.css';

export default function WorkflowJourney({kind,stages}) {
 const root=useRef(null),canvas=useRef(null),labels=useRef(null),dialog=useRef(null),detailsButton=useRef(null);
 const reduce=useReducedMotion();
 const [selected,setSelected]=useState(0),[phase,setPhase]=useState(0),[paused,setPaused]=useState(false),[rendererType,setRendererType]=useState('idle'),[cacheHit,setCacheHit]=useState(false),[opened,setOpened]=useState(false),[details,setDetails]=useState(false),[finished,setFinished]=useState(false),[moving,setMoving]=useState(false);
 const state=useRef({}),actions=useRef({});state.current={paused,cacheHit,opened,details};
 const stage=stages[selected],staticMode=!!reduce||rendererType==='fallback';
 useEffect(()=>{
  const el=root.current,cv=canvas.current,viewport=cv.parentElement,screen=el.closest('.screen');
  let renderer=null,active=false,disposed=false,lost=false,frame=0,last=0,width=1,height=1,dark=false;
  let current=0,position=0,target=0,from=0,travel=0,travelling=false,hold=0;
  const times=stages.map(()=>reduce?DURATION:0),scheme=matchMedia('(prefers-color-scheme:dark)'),coarse=matchMedia('(pointer:coarse)');
  const select=index=>{
   index=Math.max(0,Math.min(stages.length-1,index));
   setSelected(index);setFinished(false);setPhase(reduce?2:0);
   window.dispatchEvent(new CustomEvent('pnc:workflow-state',{detail:{kind,id:stages[index].id}}));
  };
  const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0;el.dataset.running='false'};
  function palette(){const c=getComputedStyle(el).getPropertyValue('--pnc-ink').trim();dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&scheme.matches);if(c.startsWith('rgb'))dark=+(c.match(/[\d.]+/)?.[0]||0)>150;}
  function draw(){
   if(!renderer||!active||disposed||lost)return;
   const scene=buildJourney(kind,times,{dark,cacheHit:state.current.cacheHit,opened:state.current.opened});
   const pose=cameraPose(position,travelling?travel:0),vp=camera(width/height,pose.yaw,pose.pitch,pose.focus,pose.zoom);
   const pixelRatio=renderer.type==='software'?(travelling?1:1.5):Math.min(Math.max(devicePixelRatio||1,1.5),coarse.matches?1.75:2);
   const renderStart=performance.now();renderer.draw(scene.objects,vp,width,height,pixelRatio);el.dataset.renderMs=(performance.now()-renderStart).toFixed(1);
   scene.labels.forEach((l,i)=>{const n=labels.current?.children[i];if(!n)return;const [x,y,z]=project(l.pos,vp,width,height);n.textContent=l.text;const half=n.offsetWidth/2+4;const visible=z>0&&x>=half&&x<=width-half&&y>8&&y<height-8;n.style.visibility=visible?'visible':'hidden';n.style.left=x+'px';n.style.top=y+'px';n.style.opacity=String(Math.max(.3,1-Math.abs(l.stageIndex-position)*.4));});
   const p=stages[current].id==='jump'?(state.current.opened?2:0):Math.min(2,Math.floor(times[current]/3));
   setPhase(p);el.dataset.time=times[current].toFixed(2);el.dataset.camera=position.toFixed(3);el.dataset.models=String(stages.length);el.dataset.objectCount=String(scene.objects.length);el.dataset.stage=stages[target].id;
  }
  function go(index,manual=true){
   index=Math.max(0,Math.min(stages.length-1,index));
   if(manual){times[index]=reduce?DURATION:0;setPaused(false);state.current.paused=false;}
   target=index;from=position;travel=0;hold=0;travelling=!reduce&&Math.abs(position-index)>.001;
   if(!travelling){position=index;current=index;}
   select(index);setMoving(travelling);start();
  }
  function tick(now){
   frame=0;if(disposed||!active||document.hidden||lost)return;
   const dt=last?Math.min((now-last)/1000,renderer?.type==='software'?1:.08):0;
   if(last&&dt<1/(renderer?.type==='software'?12:coarse.matches?24:30)){frame=requestAnimationFrame(tick);return;}last=now;
   const stopped=state.current.paused||state.current.details;
   if(!stopped&&!reduce){
    if(travelling){const next=travelPosition(from,target,travel*1.8+dt);position=next.position;travel=next.progress;if(next.done){position=target;current=target;travelling=false;setMoving(false);travel=0;}}
    else if(times[current]<DURATION){times[current]=Math.min(DURATION,times[current]+dt);}
    else if(current<stages.length-1){hold+=dt;if(hold>.7){go(current+1,false);return;}}
    else setFinished(true);
   }
   draw();
   const running=!reduce&&!stopped&&(travelling||times[current]<DURATION||current<stages.length-1);
   el.dataset.running=String(running);el.dataset.travelling=String(travelling);
   if(running)frame=requestAnimationFrame(tick);
  }
  function start(){if(!active||document.hidden||!renderer||lost){stop();return;}if(frame)return;last=performance.now();if(reduce)draw();else frame=requestAnimationFrame(tick);}
  function resize(){
   const s=getComputedStyle(screen),available=screen.getBoundingClientRect().height-['--screen-top','--screen-bottom','--toolbar-space'].reduce((sum,key)=>sum+(parseFloat(s.getPropertyValue(key))||0),0);
   el.style.setProperty('--journey-available',Math.max(120,available-2)+'px');
   const rect=viewport.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);palette();start();
  }
  function activate(){const next=screen?.dataset.active==='true';if(next===active)return;active=next;if(!active){stop();renderer?.dispose();renderer=null;setRendererType('idle');return;}try{renderer=createSceneRenderer(cv);}catch{renderer=null;}setRendererType(renderer?.type||'fallback');resize();}
  function change(e){if(e.detail.kind===kind){const index=stages.findIndex(s=>s.id===e.detail.id);if(index>=0)go(index);}}
  function contextLost(e){e.preventDefault();lost=true;stop();renderer?.dispose();renderer=null;setRendererType('fallback');}
  function contextRestored(){lost=false;active=false;activate();}
  const observer=new MutationObserver(activate);if(screen)observer.observe(screen,{attributes:true,attributeFilter:['data-active']});
  const ro=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);ro?.observe(viewport);ro?.observe(el);
  const themeObserver=new MutationObserver(resize);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class','style']});
  const visibility=()=>document.hidden?stop():start();
  window.addEventListener('pnc:workflow-select',change);window.addEventListener('pnc:page',activate);window.addEventListener('pnc:layout',activate);document.addEventListener('visibilitychange',visibility);scheme.addEventListener('change',resize);cv.addEventListener('webglcontextlost',contextLost);cv.addEventListener('webglcontextrestored',contextRestored);
  actions.current={refresh:start,replay:()=>{times.fill(reduce?DURATION:0);go(0);},restartStage:()=>{times[target]=reduce?DURATION:0;start();}};
  resize();activate();
  return()=>{disposed=true;stop();renderer?.dispose();ro?.disconnect();observer.disconnect();themeObserver.disconnect();window.removeEventListener('pnc:workflow-select',change);window.removeEventListener('pnc:page',activate);window.removeEventListener('pnc:layout',activate);document.removeEventListener('visibilitychange',visibility);scheme.removeEventListener('change',resize);cv.removeEventListener('webglcontextlost',contextLost);cv.removeEventListener('webglcontextrestored',contextRestored);actions.current={};};
 },[kind,reduce]);
 useEffect(()=>{actions.current.refresh?.();},[paused,cacheHit,opened,details]);
 useEffect(()=>{if(details){dialog.current?.showModal();}else if(dialog.current?.open){dialog.current.close();detailsButton.current?.focus();}},[details]);
 let status=phases[stage.id][phase];if(stage.id==='model'&&cacheHit)status=phase===0?'先检查本地答案缓存':phase===1?'缓存命中，绕过模型请求':'复用候选答案，仍需核对';
 const closeDetails=()=>setDetails(false);
 return <div className="workflow-graphic wf3d workflow-journey" ref={root} data-renderer={rendererType} data-paused={paused||undefined} data-static={staticMode||undefined} data-kind={kind} data-stage={stage.id} role="tabpanel" id={`wf-panel-${kind}`} aria-labelledby={`wf-tab-${stage.id}`}>
  <div className="journey-body">
   <div className="journey-visual">
    <div className="wf3d-heading"><span><i/>{staticMode?'静态总览':'CONTINUOUS / 3D'}</span><span>0{selected+1} / 0{stages.length}</span></div>
    <div className="wf3d-viewport" aria-hidden="true"><canvas ref={canvas}/><div className="wf3d-labels" ref={labels}>{JOURNEYS[kind].flatMap(id=>[0,1,2].map(i=><span key={`${id}-${i}`}/>))}</div>{rendererType==='fallback'&&<div className="wf3d-fallback">{stages.map((s,i)=><div key={s.id}><i/><span>0{i+1} {s.label}</span></div>)}</div>}</div>
    <div className="wf3d-caption"><span className="wf3d-phase">{moving?'→':staticMode?'静态':`0${phase+1}`}</span><p>{moving?`镜头前往：${stage.label}`:status}</p></div>
   </div>
   <div className="journey-copy"><p className="eyebrow">{kind==='pnc'?'PNC':'PNC HELPER'} · 0{selected+1}</p><h2>{stage.title}</h2><p className="journey-subtitle">{stage.subtitle}</p><div className="journey-explanation"><h3>{stage.heading}</h3><p>{stage.copy}</p><p className="workflow-note">{stage.note}</p></div></div>
  </div>
  <div className="journey-action-slot">{stage.id==='model'?<div className="wf3d-branch"><span>演示路径</span>{[false,true].map(hit=><button key={String(hit)} aria-pressed={cacheHit===hit} onClick={()=>{setCacheHit(hit);state.current.cacheHit=hit;actions.current.restartStage?.();}}>{hit?'缓存命中':'缓存未命中'}</button>)}</div>:stage.id==='jump'?<button className="wf3d-jump" aria-pressed={opened} onClick={()=>setOpened(v=>!v)}>{opened?'返回示意通知 ↶':'点击示意通知，查看对应题集 ↗'}</button>:<span className="journey-sequence">{staticMode?'使用上方步骤查看静态模型':'模型始终在同一空间 · 镜头连续演示'}</span>}</div>
  <div className="wf-controls"><span>{finished?'演示结束 · 可重播':staticMode?'已减少动态效果':'三维原理示意 · 无真实请求'}</span><div><button ref={detailsButton} onClick={()=>setDetails(true)}>详细说明</button><button disabled={staticMode} aria-label={(paused?'继续':'暂停')+`${kind==='pnc'?'PNC':'Helper'}连续演示`} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'继续':'暂停'}</button><button disabled={staticMode} onClick={()=>actions.current.replay?.()}>从头重播 ↻</button></div></div>
  {stage.id==='jump'&&<span className="visually-hidden" role="status">{opened?'已在示意画面中打开：Java 程序设计，字符串与常用类题集。':'示意通知：字符串与常用类即将截止。'}</span>}
  <dialog ref={dialog} className="journey-details" onCancel={e=>{e.preventDefault();closeDetails();}} onClose={()=>setDetails(false)}><button className="journey-close" onClick={closeDetails} aria-label="关闭详细说明">关闭 ×</button><h2>{stage.title}</h2><h3>{stage.heading}</h3><p>{stage.copy}</p><p>{stage.note}</p></dialog>
 </div>;
}
