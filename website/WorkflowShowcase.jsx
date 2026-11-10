import React,{useEffect,useState} from 'react';
import WorkflowJourney from './WorkflowJourney.jsx';
import {motion,useReducedMotion} from 'motion/react';
import './workflow-showcase.css';
// Local illustrations only. Sources: PNC.user.js 1918–2104, 4404–4456,
// 4496–4504; PNC Helper.user.js 238–253, 293–345, 41–44.
export const workflows={
 pnc:{id:'rhythm',name:'PNC 工作原理',stages:[
  {id:'read',label:'读取题目',title:'先读懂这一题。',subtitle:'题面、选项与上下文，一起准备。',heading:'从当前页面提取',copy:'PNC 读取题面、选项、图片和空位上下文，整理成当前题目的输入。',note:'这里以一道单选小题为例。编程题另有生成代码、提交与等待评分的流程。',tags:['当前题面','选项与空位','题目上下文']},
  {id:'model',label:'AI 处理',title:'把问题，交给你的模型。',subtitle:'先检查缓存，再按配置请求生成。',heading:'模型与节奏，由你设置',copy:'命中答案缓存时直接复用；未命中时，将题目发送给你选择的模型供应商。小题可配置 1–10 并发。',note:'作答辅助可只展示解析，不自动填入。AI 输出仍需要你核对。',tags:['本地答案缓存','自选模型','1–10 并发']},
  {id:'write',label:'填写与进度',title:'答案落位，进度跟上。',subtitle:'回填、更新进度，再统一保存本页。',heading:'每一步都有实际状态',copy:'写入前检查页面和原答案是否变化；成功回填后更新进度。本页目标任务全部成功后，再统一保存。',note:'进度表示已处理，不代表答案正确。保存失败会提示检查，不显示“已保存”。',tags:['检查页面变化','更新处理进度','本页统一保存']}
 ]},
 helper:{id:'helper',name:'Helper 工作原理',stages:[
  {id:'pair',label:'配对',title:'先认识，才能接收。',subtitle:'主脚本负责题集，Helper 负责提醒。',heading:'用公钥建立配对',copy:'在 PNC 核验当前账号题集后，开启提醒、设置提前天数并复制配对码。在 Helper 管理器菜单粘贴，确认来源并启用提醒。',note:'配对码只包含验证公钥，不是模型 API Key。这里不会读取剪贴板或修改真实配对。',tags:['PNC 配对码','手动确认','验证公钥']},
  {id:'sync',label:'同步',title:'把截止时间，带到下一页。',subtitle:'验证来源，保存最近一次题集快照。',heading:'同步的，是题集截止信息',copy:'PNC 发送已核验账号的完整题集目录，包括题集 ID、标题和截止时间。Helper 验证签名、时间与序号后保存。',note:'同步后可以离开 PTA。延期需重新同步；账号变化后需重新核验并启用提醒。',tags:['签名验证','题集与截止时间','本地缓存']},
  {id:'remind',label:'提醒',title:'到了提醒窗口，就轻轻提醒。',subtitle:'按最近同步的数据检查，避免重复请求。',heading:'从截止时间，到系统通知',copy:'Helper 每 30 秒检查最近同步的数据。在你设置的提前天数内，请求对应题集的系统通知，并进行去重。',note:'需有可运行脚本的普通网页。退出浏览器、页面冻结、系统休眠或通知权限都可能影响提醒。',tags:['提前天数','定时检查','通知去重']},
  {id:'jump',label:'跳转',title:'一条提醒，回到那份题集。',subtitle:'点击通知，打开对应的 PTA 题集。',heading:'不必重新翻找目录',copy:'每条通知对应一个题集，点击后打开它的 PTA 页面。试着点击示意通知，看看这一步如何衔接。',note:'这里只在本页演示跳转，不打开真实 PTA、不发送系统通知。“已请求”不等于系统一定送达。',tags:['一条通知一个题集','对应 PTA 页面','示意数据']}
 ]}
};
export function WorkflowTabs({kind}){
 const flow=workflows[kind],reduce=useReducedMotion(),[active,setActive]=useState(flow.stages[0].id);
 useEffect(()=>{const update=e=>{if(e.detail.kind===kind)setActive(e.detail.id)};window.addEventListener('pnc:workflow-state',update);return()=>window.removeEventListener('pnc:workflow-state',update)},[kind]);
 const choose=id=>{const screen=document.getElementById(flow.id);window.dispatchEvent(new CustomEvent('pnc:navigate',{detail:{index:[...document.querySelectorAll('main>.screen')].indexOf(screen),xIndex:0}}));window.dispatchEvent(new CustomEvent('pnc:workflow-select',{detail:{kind,id}}));setActive(id)};
 return <><div className="preview-heading"><span className="eyebrow">{flow.name}</span><span className="preview-disclaimer">同一空间 · 连续运镜 · 无真实请求</span></div><div className="tabs workflow-tabs" role="tablist" aria-label={flow.name+'步骤'}>{flow.stages.map((stage,i)=><button key={stage.id} id={`wf-tab-${stage.id}`} role="tab" aria-selected={active===stage.id} aria-controls={`wf-panel-${kind}`} tabIndex={active===stage.id?0:-1} onClick={()=>choose(stage.id)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const next=e.key==='Home'?0:e.key==='End'?flow.stages.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:flow.stages.length-1))%flow.stages.length;choose(flow.stages[next].id);document.getElementById(`wf-tab-${flow.stages[next].id}`)?.focus()}}>{active===stage.id&&<motion.span className="tab-selection" aria-hidden="true" layoutId={'wf-tabs-'+kind} transition={{duration:reduce?0:.3,ease:[.22,1,.36,1]}}/>}<span className="workflow-step-number" aria-hidden="true">0{i+1}</span>{stage.label}</button>)}</div></>;
}
export const WorkflowGraphic=WorkflowJourney;
export function workflowBlocks(kind,block){const flow=workflows[kind];return [block(`wf-journey-${kind}`,<WorkflowJourney kind={kind} stages={flow.stages}/>,true)];}
