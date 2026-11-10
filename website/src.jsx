import React,{useState,useEffect,useLayoutEffect,useRef} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core/theme';
import {Button} from '@astryxdesign/core/Button';
import {Slider} from '@astryxdesign/core/Slider';
import {SegmentedControl,SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Badge} from '@astryxdesign/core/Badge';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './style.css';
import {installSnap} from './scroll-snap.mjs';
const repo='https://github.com/NeuronCState/PTA-Neuron-Copilot';
const raw='https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/main/';
const Arrow=()=> <span aria-hidden="true">↗</span>;
function Mark(){return <span className="mark" aria-hidden="true"><i/><i/><i/><i/></span>}
const block=(id,node,wide=false)=>({id,node,wide});
const intro=(id,eyebrow,title,copy)=>block(id,<div className="section-intro"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{copy&&<p>{copy}</p>}</div>,true);
// Break an oversized card at real content boundaries, preserving text size.
function splitNode(node){
 if(!React.isValidElement(node)||typeof node.type!=='string')return [];
 let children=React.Children.toArray(node.props.children).filter(c=>!(React.isValidElement(c)&&c.type==='br'));
 if(children.length===1&&typeof children[0]==='string')children=children[0].match(/[^。！？；]+[。！？；]?/g)||children;
 if(children.length>1)return children.map((child,i)=>React.cloneElement(node,{id:i?undefined:node.props.id},child));
 if(children.length===1){const parts=splitNode(children[0]);return parts.map((child,i)=>React.cloneElement(node,{id:i?undefined:node.props.id},child));}
 return [];
}
// Pack measured content rows, never scale text or turn a chapter into a scroll area.
// Smaller viewports and larger type get more complete, viewport-sized pages.
function ViewportPages({groups}){
 const [splits,setSplits]=useState({});
 const expand=item=>{const parts=splits[item.id]?splitNode(item.node):[];return parts.length>1?parts.flatMap((node,i)=>expand({...item,id:item.id+'.'+i,node})):[item];};
 const effectiveGroups=groups.map(g=>({...g,blocks:g.blocks.flatMap(expand)}));
 const [pages,setPages]=useState(()=>groups.map(g=>({group:g.id,ids:g.blocks.map(b=>b.id)})));
 const pendingFocus=useRef(null),signature=useRef(null),host=useRef(null),latest=useRef(effectiveGroups);latest.current=effectiveGroups;
 const rememberFocus=()=>{
  const active=document.activeElement,block=active?.closest?.('.content-block');if(!block)return;
  const origin=block.dataset.originBlock,controls=[...host.current.querySelectorAll('[data-origin-block="'+origin+'"] a,[data-origin-block="'+origin+'"] button,[data-origin-block="'+origin+'"] input,[data-origin-block="'+origin+'"] select,[data-origin-block="'+origin+'"] [role=slider]')];
  pendingFocus.current={id:active.id,origin,index:controls.indexOf(active)};
 };
 useLayoutEffect(()=>{
  let raf=0,disposed=false;
  const pack=()=>{
   if(disposed)return;
   const root=document.documentElement,header=document.querySelector('.header'),pager=document.querySelector('.page-nav');
   root.classList.toggle('large-type',parseFloat(getComputedStyle(root).fontSize)>20);
   root.classList.toggle('compact-header',innerWidth<400&&parseFloat(getComputedStyle(root).fontSize)>20);
   const nextSignature=[innerWidth,innerHeight,getComputedStyle(root).fontSize].join('|');
   if(signature.current!==nextSignature){
    const previous=signature.current;signature.current=nextSignature;
    if(previous&&Object.keys(splits).length){rememberFocus();setSplits({});setPages(groups.map(g=>({group:g.id,ids:g.blocks.map(b=>b.id)})));return;}
   }
   const top=header.getBoundingClientRect().bottom+18,bottom=innerHeight-pager.getBoundingClientRect().top+18;
   root.style.setProperty('--screen-top',`${top}px`);root.style.setProperty('--screen-bottom',`${bottom}px`);
   const available=Math.max(80,innerHeight-top-bottom),grid=host.current.querySelector('.screen-content');
   const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length,gap=parseFloat(getComputedStyle(grid).rowGap)||18;
   const heights=new Map([...host.current.querySelectorAll('.content-block')].map(el=>[el.dataset.block,el.getBoundingClientRect().height]));
   const oversized=latest.current.flatMap(g=>g.blocks).filter(item=>(heights.get(item.id)||0)>available&&splitNode(item.node).length>1);
   if(oversized.length){rememberFocus();setSplits(old=>({...old,...Object.fromEntries(oversized.map(item=>[item.id,true]))}));return;}
   const result=[];
   for(const group of latest.current){
    const rows=[];let row=[],used=0;
    for(const item of group.blocks){
     const span=item.wide?columns:1;
     if(row.length&&used+span>columns){rows.push(row);row=[];used=0;}
     row.push(item);used+=span;
     if(used===columns){rows.push(row);row=[];used=0;}
    }
    if(row.length)rows.push(row);
    let ids=[],height=0;
    for(const row of rows){
     const h=Math.max(...row.map(item=>heights.get(item.id)||0));
     if(ids.length&&height+gap+h>available){result.push({group:group.id,ids});ids=[];height=0;}
     height+=(ids.length?gap:0)+h;ids.push(...row.map(item=>item.id));
    }
    if(ids.length)result.push({group:group.id,ids});
   }
   if(JSON.stringify(pages)!==JSON.stringify(result)){rememberFocus();setPages(result);}
  };
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(pack);};
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
  for(const el of [...host.current.querySelectorAll('.content-block'),document.querySelector('.header'),document.querySelector('.page-nav')])observer?.observe(el);
  window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule();
  return()=>{disposed=true;cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',schedule);};
 },[groups,pages,splits]);
 useLayoutEffect(()=>{
  window.dispatchEvent(new CustomEvent('pnc:layout'));
  const saved=pendingFocus.current;if(!saved)return;pendingFocus.current=null;
  const controls=[...host.current.querySelectorAll('[data-origin-block="'+saved.origin+'"] a,[data-origin-block="'+saved.origin+'"] button,[data-origin-block="'+saved.origin+'"] input,[data-origin-block="'+saved.origin+'"] select,[data-origin-block="'+saved.origin+'"] [role=slider]')];
  const target=(saved.id&&document.getElementById(saved.id))||controls[saved.index];target?.focus({preventScroll:true});
 },[pages,splits]);
 const seen=new Set();
 return <main id="main" ref={host}>{pages.map(page=>{
  const group=effectiveGroups.find(g=>g.id===page.group),first=!seen.has(group.id);seen.add(group.id);
  return <section className={'screen screen-'+group.id} key={page.group+'-'+page.ids[0]} id={first?group.id:undefined} data-screen-key={page.group+'-'+page.ids[0]} aria-label={group.label}>
   <>{group.id==='home'&&first&&<div className="hero-art" aria-hidden="true"><Mark/></div>}<div className="screen-content">{page.ids.flatMap(id=>group.blocks.filter(b=>b.id===id||b.id.startsWith(id+'.'))).map(item=>{const id=item.id;return item&&<div className={'content-block'+(item.wide?' block-wide':'')} data-block={id} data-origin-block={id.split('.')[0]} key={id}>{item.node}</div>})}</div></>
  </section>;
 })}</main>;
}
function App(){
 const reduce=useReducedMotion();
 const [theme,setTheme]=useState('system'),[tab,setTab]=useState('catalogue'),[answer,setAnswer]=useState(false),[open,setOpen]=useState(true),[provider,setProvider]=useState('DeepSeek'),[concurrency,setConcurrency]=useState(3),[page,setPage]=useState({index:0,count:1});
 useEffect(()=>{const update=e=>setPage(old=>old.index===e.detail.index&&old.count===e.detail.count?old:e.detail);window.addEventListener('pnc:page',update);return()=>window.removeEventListener('pnc:page',update)},[]);
 useEffect(installSnap,[]);
 const tabs=[['catalogue','班级题集'],['assistance','解析辅助'],['settings','模型设置']];
 const previewBlocks=[
  intro('experience-intro','ONE PANEL. LESS FRICTION.','从题集到思路，不用来回切换。','PNC 就在 PTA 页面上。以下是交互示意，不读取题目、不请求模型、不提交答案。'),
  block('preview-tabs',<div className="tabs" role="tablist" aria-label="功能预览">{tabs.map(([id,label])=><button key={id} role="tab" id={'tab-'+id} aria-selected={tab===id} aria-controls={'panel-'+id} tabIndex={tab===id?0:-1} onKeyDown={e=>{if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const i=tabs.findIndex(t=>t[0]===id),n=e.key==='Home'?0:e.key==='End'?2:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:2))%3;setTab(tabs[n][0]);document.getElementById('tab-'+tabs[n][0])?.focus()}} onClick={()=>setTab(id)}>{tab===id&&<motion.span aria-hidden="true" className="tab-selection" layoutId="selected-preview-tab" transition={{duration:reduce?0:.34,ease:[.22,1,.36,1]}}/>}{label}</button>)}</div>,true),
 ];
 if(tab==='catalogue')previewBlocks.push(
  block('preview-main-'+tab,<div className="demo-card" role="tabpanel" id="panel-catalogue" aria-labelledby="tab-catalogue"><div className="card-top"><span className="mini-label">YOUR CLASSES</span><Badge label="示例数据" variant="green"/></div><button className="class-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="class-sets"><b>Java 程序设计</b><span aria-hidden="true">{open?'−':'＋'}</span></button><div id="class-sets" hidden={!open}><div className="set-row"><div><h3>字符串与常用类</h3><p>已作答 18 / 24 · 得分 72</p></div><span className="days"><b>3</b>天</span></div><div className="set-row"><div><h3>异常处理</h3><p>已作答 6 / 20 · 得分 30</p></div><span className="days"><b>8</b>天</span></div></div></div>),
  block('preview-secondary-'+tab,<div className="demo-card"><p className="mini-label">PROGRESS, AT A GLANCE</p><h3>每一份进度，都有着落。</h3><div className="catalogue-progress"><ProgressBar label="本班示例作答进度" value={24} max={44} hasValueLabel formatValueLabel={(v,m)=>`${v} / ${m}`}/></div><p>按班级归类，按截止日期排列。进度与分数一起看，已结束的班级归档。</p></div>)
 );
 if(tab==='assistance')previewBlocks.push(
  block('preview-main-'+tab,<div className="demo-card question" role="tabpanel" id="panel-assistance" aria-labelledby="tab-assistance"><div className="card-top"><span className="mini-label">R2-1 · 单选题</span><Badge label="示例" variant="green"/></div><h3>这行代码的输出结果是？</h3><pre><code>{'"中国China".indexOf("国")'}</code></pre><div className="options"><span>A：0</span><span>B：1</span><span>C：2</span><span>D：3</span></div></div>),
  block('preview-secondary-'+tab,<div className="demo-card"><Button size="sm" label={answer?'收起解析':'查看解析'} onClick={()=>setAnswer(!answer)} aria-expanded={answer} aria-controls="sample-answer"/><div id="sample-answer" className="answer" hidden={!answer}><b>答案　B：1</b><p>字符串索引从 0 开始。“中”的索引是 0，“国”的索引是 1。</p><small>示例解析，非实时 AI 输出。</small></div>{!answer&&<p className="answer-prompt">先看思路，再动手。点击展开示例解析。</p>}</div>)
 );
 if(tab==='settings')previewBlocks.push(
  block('preview-main-'+tab,<div className="demo-card" role="tabpanel" id="panel-settings" aria-labelledby="tab-settings"><p className="mini-label">YOUR MODEL</p><h3>你的模型，你的选择。</h3><SegmentedControl label="模型供应商" value={provider} onChange={setProvider} layout="fill">{['DeepSeek','MiMo','OpenCode'].map(p=><SegmentedControlItem key={p} label={p} value={p}/>)}</SegmentedControl><div className="model-note"><b>{provider}</b><p>使用自己的 API 配置。模型能力与费用由对应服务决定。</p></div></div>),
  block('preview-secondary-'+tab,<div className="demo-card"><p className="mini-label">YOUR PACE</p><h3>按自己的节奏配置。</h3><Slider label="小题并发数量" min={1} max={10} step={1} value={concurrency} onChange={setConcurrency} valueDisplay="text"/><div className="range-ends"><span>1 · 顺序处理</span><span>10 · 并发上限</span></div><p>实际脚本还支持思考强度与上下文长度。这里的控件仅供演示。</p></div>)
 );
 const groups=[
  {id:'home',label:'首页',blocks:[
   block('hero-title',<div className="hero-title"><p className="eyebrow"><span className="dot"/>PNC 2.1.0 · 现已发布</p><h1>少一点重复，<br/>多一点理解。</h1></div>,true),
   block('hero-copy',<div className="hero-copy"><p>题集、解析、模型和截止时间。<br/>让 PTA 练习中的琐事，留在一个轻巧的面板里。</p></div>,true),
   block('hero-actions',<div className="hero-actions"><div className="actions"><Button href={raw+'PNC.user.js'} label="安装 PNC 2.1.0 ↗" variant="primary" size="lg"/><a className="text-link" href="https://scriptcat.org/zh-CN/script-show-page/7287" target="_blank" rel="noreferrer">脚本猫发布页 <Arrow/></a></div><p className="fine">需要脚本猫或 Tampermonkey · 自备模型 API 配置</p></div>,true),
   block('hero-models',<div className="provider-ribbon"><span>你的模型，你的选择</span><b>DeepSeek</b><b>MiMo</b><b>OpenCode</b></div>,true)
  ]},
  {id:'experience',label:'功能预览',blocks:previewBlocks},
  {id:'rhythm',label:'工作节奏',blocks:[
   intro('rhythm-intro','LESS BUSYWORK. MORE CONTROL.','不同的任务，用不同的节奏。','自动化处理重复步骤。是否填入、如何理解，由你决定。'),
   block('prepare',<article className="detail-card"><span className="mini-label">01 / PREPARE</span><h3>先准备，后查看。</h3><p>作答辅助在后台准备，不自动填入。小题给出答案与解析，大题提供中文思路和需要用到的语句。</p></article>),
   block('configure',<article className="detail-card"><span className="mini-label">02 / CONFIGURE</span><h3>速度之外，也有控制。</h3><p>小题支持 1–10 并发。连续答题、跳过已答与独立模型配置，让流程适应当前题集。</p></article>),
   block('remember',<article className="detail-card"><span className="mini-label">03 / REMEMBER</span><h3>返回时，不从头开始。</h3><p>目录、进度与 AI 解答持久保存在本地。先显示缓存，再更新需要读取的题集。</p></article>),
   block('verify',<article className="detail-card"><span className="mini-label">04 / VERIFY</span><h3>判断，始终留给你。</h3><p>模型输出需要核对。平台上的保存与提交会产生真实记录，请遵守课程和平台规则。</p></article>)
  ]},
  {id:'helper',label:'截止提醒',blocks:[
   intro('helper-intro','PNC HELPER · 1.0.0','别让截止时间，成为最后的提醒。','可选的独立脚本，根据已同步的题集截止时间，在设定的提前天数内请求系统通知。'),
   block('notification',<div className="notification-demo"><p className="mini-label">通知效果示意</p><div className="notification"><div className="notification-icon"><Mark/></div><div><span className="notice-app">PNC HELPER · 现在</span><h3>字符串与常用类即将截止</h3><p>距离截止还有 3 天</p><small>一条提醒，一个题集。点击直达。</small></div></div></div>),
   block('helper-steps',<div className="detail-card"><p className="mini-label">THREE SMALL STEPS</p><ol className="helper-steps"><li>在 PNC 中开启提醒，设置提前天数。</li><li>配对 Helper，同步题集截止时间。</li><li>允许系统通知，点击提醒直达题集。</li></ol><a className="text-link" href={raw+'PNC%20Helper.user.js'}>安装 Helper 1.0.0 <Arrow/></a></div>)
  ]},
  {id:'reminder-notes',label:'提醒边界',blocks:[
   intro('limits-intro','A REMINDER, WITH LIMITS.','提前知道，也要留一手。','请勿将 Helper 作为唯一提醒渠道。'),
   block('helper-limits-page',<article className="detail-card"><span className="mini-label">BROWSER</span><h3>需要一个普通网页。</h3><p>通用 Helper 需要至少一个可运行脚本的普通网页。默认新标签页不能运行。</p></article>),
   block('helper-limits-system',<article className="detail-card"><span className="mini-label">SYSTEM</span><h3>通知依赖系统权限。</h3><p>浏览器退出、页面冻结或系统休眠，都可能延迟提醒。同步后不必一直停留在 PTA。</p></article>)
  ]},
  {id:'install',label:'获取脚本',blocks:[
   intro('install-intro','READY WHEN YOU ARE','给下一次练习，留一个好帮手。','主脚本负责练习辅助，Helper 按需安装。'),
   block('install-main',<div className="install-card"><p className="mini-label">MAIN SCRIPT</p><h3>PNC <span>2.1.0</span></h3><p>题集管理 · AI 辅助 · 解析与缓存</p><Button label="安装主脚本 ↗" href={raw+'PNC.user.js'} variant="primary"/></div>),
   block('install-helper',<div className="install-card"><p className="mini-label">OPTIONAL COMPANION</p><h3>PNC Helper <span>1.0.0</span></h3><p>可选组件 · 题集截止提醒</p><Button label="安装 Helper ↗" href={raw+'PNC%20Helper.user.js'}/></div>),
   block('install-note',<p className="install-note">先安装 <a href="https://docs.scriptcat.org/" target="_blank" rel="noreferrer">脚本猫</a> 或 <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer">Tampermonkey</a>。升级无需卸载，更新后刷新 PTA。已有测试版请手动更新，每个脚本只保留一份启用。</p>,true)
  ]},
  {id:'about',label:'使用须知',blocks:[
   intro('about-intro','A LITTLE LESS REPETITION.','把工具用好，把判断留给自己。'),
   block('privacy',<article className="detail-card"><h3>关于数据与记录</h3><p>模型请求会将题目及必要凭据发送给你选择的供应商。自动提交会留下真实 PTA 记录。</p></article>),
   block('local-input',<article className="detail-card"><h3>关于未保存的输入</h3><p>未保存的网页输入不保证刷新恢复。请先保存重要内容，再刷新或离开页面。</p></article>),
   block('links',<div className="resource-links"><a href={repo+'/blob/main/README.md'}>查看 README <Arrow/></a><a href={repo+'/tree/main/legacy'}>历史版本 <Arrow/></a><a href={repo+'/issues'}>反馈问题 <Arrow/></a></div>,true),
   block('footer',<footer className="footer"><span>© 2026 NeuronCState</span><span>界面基于 <a href="https://github.com/meta/astryx">Astryx</a> · <a href="THIRD-PARTY-NOTICES.txt">第三方许可</a></span></footer>,true)
  ]}
 ];
 return <Theme theme={neutralTheme} mode={theme}><div className="page"><a className="skip" href="#main">跳到正文</a><header className="header"><a className="brand" href="#home" aria-label="PTA Neuron Copilot 首页"><Mark/><span>PNC</span></a><nav aria-label="主导航"><a href="#experience">功能预览</a><a href="#helper">截止提醒</a><a href={repo} target="_blank" rel="noreferrer">GitHub <Arrow/></a></nav><select className="theme-select" aria-label="页面配色" value={theme} onChange={e=>setTheme(e.target.value)}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select><Button href="#install" label="获取脚本" variant="secondary" size="sm"/></header><ViewportPages groups={groups}/><div className="page-nav" aria-label="整屏导航"><button className="page-arrow" aria-label="上一页" disabled={page.index===0} onClick={()=>window.dispatchEvent(new CustomEvent('pnc:navigate',{detail:{index:page.index-1}}))}>↑</button><span className="page-count" aria-live="polite">{String(page.index+1).padStart(2,'0')} <span>/ {String(page.count).padStart(2,'0')}</span></span><span className="page-hint">轻滑翻页</span><button className="page-arrow" aria-label="下一页" disabled={page.index>=page.count-1} onClick={()=>window.dispatchEvent(new CustomEvent('pnc:navigate',{detail:{index:page.index+1}}))}>↓</button></div></div></Theme>;
}
createRoot(document.getElementById('root')).render(<App/>);
