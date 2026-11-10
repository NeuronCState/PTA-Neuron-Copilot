import React,{useState,useEffect,useRef} from 'react';
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
import NeuronBackground from './NeuronBackground.jsx';
import {observeSections} from './native-scroll.mjs';
import {WorkflowTabs,workflowBlocks} from './WorkflowShowcase.jsx';
const repo='https://github.com/NeuronCState/PTA-Neuron-Copilot';
const raw='https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/main/';
const Arrow=()=> <span aria-hidden="true">↗</span>;
function Mark(){return <span className="mark" aria-hidden="true"><i/><i/><i/><i/></span>}
const block=(id,node,wide=false)=>({id,node,wide});
const intro=(id,eyebrow,title,copy)=>block(id,<div className="section-intro"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{copy&&<p>{copy}</p>}</div>,true);
// Content remains in normal document flow. Visibility only controls rendering cost;
// it never intercepts wheel, touch, keyboard, focus, anchors or browser history.
function NaturalSections({groups,tab}){
 const host=useRef(null);
 useEffect(()=>observeSections(host.current),[]);
 return <main id="main" ref={host} tabIndex={-1}>{groups.map(group=><section className={'screen screen-'+group.id} key={group.id} id={group.id} aria-label={group.label}>
  {group.toolbar&&<div className="chapter-toolbar">{group.toolbar}</div>}
  <div className="chapter-slide">
   {group.id==='home'&&<div className="hero-art" aria-hidden="true"><Mark/></div>}
   <div className="screen-content">{group.blocks.map(item=><div className={'content-block'+(item.wide?' block-wide':'')} hidden={!!item.feature&&item.feature!==tab} data-block={item.id} key={item.id}>{item.node}</div>)}</div>
  </div>
 </section>)}</main>;
}

function App(){
 const reduce=useReducedMotion();
 const [theme,setTheme]=useState('system'),[tab,setTab]=useState('catalogue'),[answer,setAnswer]=useState(false),[open,setOpen]=useState(true),[provider,setProvider]=useState('DeepSeek'),[concurrency,setConcurrency]=useState(3);
 const tabs=[['catalogue','班级题集'],['assistance','解析辅助'],['settings','模型设置']];
 const chooseTab=id=>setTab(id);
 const previewToolbar=<><div className="preview-heading"><span className="eyebrow">ONE PANEL. LESS FRICTION.</span><span className="preview-disclaimer">交互示意 · 不请求模型，不提交答案</span></div><div className="tabs" role="tablist" aria-label="功能预览">{tabs.map(([id,label])=><button key={id} role="tab" id={'tab-'+id} aria-selected={tab===id} aria-controls={'panel-'+id} tabIndex={tab===id?0:-1} onKeyDown={e=>{if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const i=tabs.findIndex(t=>t[0]===id),n=e.key==='Home'?0:e.key==='End'?2:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:2))%3;chooseTab(tabs[n][0]);document.getElementById('tab-'+tabs[n][0])?.focus()}} onClick={()=>chooseTab(id)}>{tab===id&&<motion.span aria-hidden="true" className="tab-selection" layoutId="selected-preview-tab" transition={{duration:reduce?0:.34,ease:[.22,1,.36,1]}}/>}{label}</button>)}</div></>;
 const previewBlocks=[];
 const addPreview=(feature,...items)=>previewBlocks.push(...items.map(item=>({...item,feature})));
 addPreview('catalogue',

  block('preview-main-catalogue',<div className="demo-card" role="tabpanel" id="panel-catalogue" aria-labelledby="tab-catalogue"><div className="card-top"><span className="mini-label">YOUR CLASSES</span><Badge label="示例数据" variant="green"/></div><button className="class-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="class-sets"><b>Java 程序设计</b><span aria-hidden="true">{open?'−':'＋'}</span></button><div id="class-sets" hidden={!open}><div className="set-row"><div><h3>字符串与常用类</h3><p>已作答 18 / 24 · 得分 72</p></div><span className="days"><b>3</b>天</span></div><div className="set-row"><div><h3>异常处理</h3><p>已作答 6 / 20 · 得分 30</p></div><span className="days"><b>8</b>天</span></div></div></div>),
  block('preview-secondary-catalogue',<div className="demo-card"><p className="mini-label">PROGRESS, AT A GLANCE</p><h3>每一份进度，都有着落。</h3><div className="catalogue-progress"><ProgressBar label="本班示例作答进度" value={24} max={44} hasValueLabel formatValueLabel={(v,m)=>`${v} / ${m}`}/></div><p>按班级归类，按截止日期排列。进度与分数一起看，已结束的班级归档。</p></div>)
 );
 addPreview('assistance',
  block('preview-main-assistance',<div className="demo-card question" role="tabpanel" id="panel-assistance" aria-labelledby="tab-assistance"><div className="card-top"><span className="mini-label">R2-1 · 单选题</span><Badge label="示例" variant="green"/></div><h3>这行代码的输出结果是？</h3><pre><code>{'"中国China".indexOf("国")'}</code></pre><div className="options"><span>A：0</span><span>B：1</span><span>C：2</span><span>D：3</span></div></div>),
  block('preview-secondary-assistance',<div className="demo-card"><Button size="sm" label={answer?'收起解析':'查看解析'} onClick={()=>setAnswer(!answer)} aria-expanded={answer} aria-controls="sample-answer"/><div id="sample-answer" className="answer" hidden={!answer}><b>答案　B：1</b><p>字符串索引从 0 开始。“中”的索引是 0，“国”的索引是 1。</p><small>示例解析，非实时 AI 输出。</small></div>{!answer&&<p className="answer-prompt">先看思路，再动手。点击展开示例解析。</p>}</div>)
 );
 addPreview('settings',
  block('preview-main-settings',<div className="demo-card" role="tabpanel" id="panel-settings" aria-labelledby="tab-settings"><p className="mini-label">YOUR MODEL</p><h3>你的模型，你的选择。</h3><SegmentedControl label="模型供应商" value={provider} onChange={setProvider} layout="fill">{['DeepSeek','MiMo','OpenCode'].map(p=><SegmentedControlItem key={p} label={p} value={p}/>)}</SegmentedControl><div className="model-note"><b>{provider}</b><p>使用自己的 API 配置。模型能力与费用由对应服务决定。</p></div></div>),
  block('preview-secondary-settings',<div className="demo-card"><p className="mini-label">YOUR PACE</p><h3>按自己的节奏配置。</h3><Slider label="小题并发数量" min={1} max={10} step={1} value={concurrency} onChange={setConcurrency} valueDisplay="text"/><div className="range-ends"><span>1 · 顺序处理</span><span>10 · 并发上限</span></div><p>实际脚本还支持思考强度与上下文长度。这里的控件仅供演示。</p></div>)
 );
 const groups=[
  {id:'home',label:'首页',blocks:[
   block('hero-title',<div className="hero-title"><p className="eyebrow"><span className="dot"/>PNC 2.1.0 · 现已发布</p><h1>少一点重复，<br/>多一点理解。</h1></div>,true),
   block('hero-copy',<div className="hero-copy"><p>题集、解析、模型和截止时间。<br/>让 PTA 练习中的琐事，留在一个轻巧的面板里。</p></div>,true),
   block('hero-actions',<div className="hero-actions"><div className="actions"><Button href={raw+'PNC.user.js'} label="安装 PNC 2.1.0 ↗" variant="primary" size="lg"/><a className="text-link" href="https://scriptcat.org/zh-CN/script-show-page/7287" target="_blank" rel="noreferrer">脚本猫发布页 <Arrow/></a></div><p className="fine">需要脚本猫或 Tampermonkey · 自备模型 API 配置</p></div>,true),
   block('hero-models',<div className="provider-ribbon"><span>你的模型，你的选择</span><b>DeepSeek</b><b>MiMo</b><b>OpenCode</b></div>,true)
  ]},
  {id:'experience',label:'功能预览',toolbar:previewToolbar,blocks:previewBlocks},
  {id:'rhythm',label:'PNC 工作原理',toolbar:<WorkflowTabs kind="pnc"/>,blocks:workflowBlocks('pnc',block)},
  {id:'helper',label:'Helper 工作原理',toolbar:<WorkflowTabs kind="helper"/>,blocks:workflowBlocks('helper',block)},
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
 return <Theme theme={neutralTheme} mode={theme}><div className="page"><NeuronBackground/><a className="skip" href="#main">跳到正文</a><header className="header"><a className="brand" href="#home" aria-label="PTA Neuron Copilot 首页"><Mark/><span>PNC</span></a><nav aria-label="主导航"><a href="#experience">功能预览</a><a href="#rhythm">工作原理</a><a href="#helper">Helper</a><a href={repo} target="_blank" rel="noreferrer">GitHub <Arrow/></a></nav><select className="theme-select" aria-label="页面配色" value={theme} onChange={e=>setTheme(e.target.value)}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select><Button href="#install" label="获取脚本" variant="secondary" size="sm"/><a className="terminal-entry" href="./terminal/">3D 终端 <Arrow/></a></header><NaturalSections groups={groups} tab={tab}/></div></Theme>;
}
createRoot(document.getElementById('root')).render(<App/>);
