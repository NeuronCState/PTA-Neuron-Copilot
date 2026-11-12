import React,{useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';

const shots=[
 {id:'catalogue',label:'班级题集',file:'pnc-class-catalogue-beta20.png',alt:'PNC beta.20 的班级题集真实截图，显示分组、作答进度、分数和剩余天数',title:'下一份题集，心里有数。',copy:'班级、题集、进度与截止时间，放在同一个地方。',note:'真实截图 · beta.20。图中复习开关在正式版已隐藏。'},
 {id:'panel',label:'答题面板',file:'main-page.png',alt:'PNC 历史版本答题面板真实截图，包含状态、语言选择和运行记录',title:'处理到哪一步，看得见。',copy:'在当前题页操作，查看处理状态与运行记录。',note:'真实截图 · 历史版本。旧名称和部分控件与当前版本不同。'},
 {id:'model',label:'模型设置',file:'model-settings.png',alt:'PNC 历史版本模型设置真实截图，API Key 内容已隐藏',title:'模型和配置，自己选择。',copy:'使用自己的模型服务，按练习需要调整配置。',note:'真实截图 · 历史版本。供应商与控件以当前脚本为准，密钥未展示。'}
];

export function ProductHero(){
 const reduce=useReducedMotion();
 return <motion.figure className="product-hero" initial={reduce?false:{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:.75,delay:.12,ease:[.22,1,.36,1]}}>
  <div className="product-orbit" aria-hidden="true"><span/><span/></div>
  <div className="hero-product-label"><span className="dot"/> INSIDE YOUR WORKFLOW <span>01 / PNC</span></div>
  <a className="hero-screenshot" href="#experience" aria-label="查看 PNC 真实界面与版本说明"><img src="./product/pnc-class-catalogue-beta20.png" alt={shots[0].alt} width="786" height="1110" fetchPriority="high"/></a>
  <div className="hero-context context-progress"><span className="context-symbol" aria-hidden="true">✓</span><div><span>题集进度</span><b>完成多少，一眼看到。</b></div></div>
  <div className="hero-context context-deadline"><span className="context-symbol" aria-hidden="true">◷</span><div><span>截止时间</span><b>下一步，提前安排。</b></div></div>
  <figcaption>真实界面 · beta.20 截图 <a href="#experience">查看版本说明 ↗</a></figcaption>
 </motion.figure>;
}

export function ProductEvidence(){
 const [selected,setSelected]=useState(0),reduce=useReducedMotion(),shot=shots[selected];
 function choose(index){setSelected(index);}
 return <div className="product-evidence">
  <div className="evidence-copy"><p className="eyebrow">01 / THE PRODUCT</p><h2>工具长什么样，<br/>直接看。</h2><p className="evidence-intro">真实截图留下产品细节。下方的交互预览，可以放心点一点。</p>
   <div className="evidence-tabs" role="tablist" aria-label="真实界面截图">{shots.map((s,i)=><button key={s.id} id={'shot-tab-'+s.id} role="tab" aria-controls="shot-panel" aria-selected={selected===i} tabIndex={selected===i?0:-1} onClick={()=>choose(i)} onKeyDown={e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?shots.length-1:(i+(['ArrowDown','ArrowRight'].includes(e.key)?1:shots.length-1))%shots.length;choose(next);document.getElementById('shot-tab-'+shots[next].id)?.focus();}}><span className="evidence-tab-number">0{i+1}</span><span>{s.label}</span><span aria-hidden="true">↗</span></button>)}</div>
   <div className="evidence-description"><h3>{shot.title}</h3><p>{shot.copy}</p></div>
   <p className="evidence-note" id="screenshot-version-note">{shot.note}</p>
  </div>
  <div className="evidence-visual" role="tabpanel" id="shot-panel" aria-labelledby={'shot-tab-'+shot.id} aria-describedby="screenshot-version-note"><span className="evidence-caption">PNC / INTERFACE ARCHIVE</span><motion.a key={shot.id} href={'./product/'+shot.file} target="_blank" rel="noreferrer" className="evidence-image" aria-label={'打开'+shot.label+'原图（新标签页）'} initial={reduce?false:{opacity:.4,y:12}} animate={{opacity:1,y:0}} transition={{duration:.3}}><img src={'./product/'+shot.file} width={shot.id==='catalogue'?786:1560} height={shot.id==='catalogue'?1110:2188} alt={shot.alt} loading="lazy"/></motion.a><span className="evidence-image-hint">点击图片，查看完整原图 ↗</span></div>
 </div>;
}

const situations=[
 {id:'organize',label:'找题集',before:['进入班级页面','逐份查看题集','分别确认进度和截止时间'],after:['读取已核验的班级题集','在一个目录里查看进度、分数和截止时间','打开需要处理的那一份'],summary:'信息放在一起，少来回找。',detail:'班级题集与截止信息需要先在 PTA 中读取。'},
 {id:'understand',label:'看解析',before:['整理题面与选项','切换到模型工具提问','回到题页核对思路'],after:['从当前页面读取题目','用自己的模型配置请求解析','在题页核对，再决定如何作答'],summary:'思路留在题页，判断仍由你做。',detail:'模型可能出错，题目会发送给你选择的供应商。'},
 {id:'remember',label:'记截止',before:['逐份查看截止日期','自行记录和回看','再找到对应题集'],after:['配对可选的 Helper','按最近同步的截止时间检查','点击通知回到对应题集'],summary:'离开 PTA，也有一份提醒。',detail:'需要普通网页运行脚本和系统通知权限，请勿作为唯一提醒。'}
];
export function PracticeComparison(){
 const [selected,setSelected]=useState(0),reduce=useReducedMotion(),item=situations[selected];
 return <div className="practice-comparison">
  <div className="comparison-top"><div><p className="eyebrow">02 / LESS BACK AND FORTH</p><h2>同一件事，<br/>少几次来回。</h2></div><div className="comparison-picker" role="group" aria-label="选择对比场景">{situations.map((s,i)=><button key={s.id} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{s.label}</button>)}</div></div>
  <div className="comparison-grid"><article className="comparison-before"><p className="comparison-label"><span>WITHOUT PNC</span><b>原来的操作</b></p><ol>{item.before.map((s,i)=><li key={i}><span>0{i+1}</span><p>{s}</p></li>)}</ol></article><article className="comparison-after"><p className="comparison-label"><span>WITH PNC{selected===2?' + HELPER':''}</span><b>有了助手之后</b></p><motion.ol key={item.id} initial={reduce?false:{opacity:.3,y:10}} animate={{opacity:1,y:0}} transition={{duration:.32}}>{item.after.map((s,i)=><li key={i}><span aria-hidden="true">✓</span><p>{s}</p></li>)}</motion.ol><div className="comparison-result"><span aria-hidden="true">↗</span><b>{item.summary}</b></div></article></div>
  <p className="comparison-note" aria-live="polite">操作路径示意，不代表时间测量。{item.detail}</p>
 </div>;
}
