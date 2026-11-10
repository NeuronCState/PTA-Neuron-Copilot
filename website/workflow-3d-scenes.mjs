import { clamp, mix, smooth } from './workflow-3d-engine.mjs';
export const DURATION = 9;
export const segmentRotation = v => [Math.atan2(v[2], Math.hypot(v[0], v[1])), 0, Math.atan2(-v[0], v[1])];
export const sceneLabels = {
  read: ['PTA 当前题目', '结构化输入', '题面 · 选项 · 上下文'],
  model: ['本地缓存', '你的 AI 模型', '候选答案'],
  write: ['页面变化检查', '填写选项 B', '本页统一保存'],
  pair: ['PNC', '验证公钥', 'Helper'],
  sync: ['PNC 题集目录', '验签 · 时间 · 序号', 'Helper 快照'],
  remind: ['最近同步的快照', '少于 3 天', '通知请求'],
  jump: ['示意通知', '用户点击', '对应 PTA 题集']
};
export const phases = {
  read: ['读取当前页面', '提取题面、选项和上下文', '整理成模型输入'],
  model: ['先检查本地答案缓存', '未命中，按你的模型配置生成', '返回候选答案 B，仍需核对'],
  write: ['先检查页面与原答案是否变化', '回填后更新处理进度', '本页目标全部成功，再统一保存'],
  pair: ['PNC 保留私钥，只导出公钥', '用户复制、粘贴并确认来源', 'Helper 保存用于验证的公钥'],
  sync: ['PNC 生成完整题集快照并签名', 'Helper 检查签名、时间与序号', '通过验证，保存最近快照'],
  remind: ['每 30 秒检查最近同步的数据', '进入提前 3 天的示例窗口', '去重后请求通知，不代表送达'],
  jump: ['提醒对应一个具体题集', '点击下方按钮演示通知跳转', '在本页展示对应题集，未打开 PTA']
};
export function phaseFor(stage, t, options = {}) {
  if (stage === 'jump') return options.opened ? 2 : 0;
  return Math.min(2, Math.floor(t / 3));
}
// Original floating product models. No room, ground, grid, plinth or stage.
// Every small detail shares its parent object's transform, including in orbit view.
export function buildScene(stage, t, { dark = false, cacheHit = false, opened = false } = {}) {
  const p = {
    shell: dark ? [.57, .68, .62] : [.91, .94, .90],
    paper: dark ? [.80, .88, .81] : [.985, .99, .965],
    edge: dark ? [.28, .41, .35] : [.58, .70, .62],
    ink: dark ? [.16, .25, .21] : [.20, .32, .27],
    faint: dark ? [.48, .61, .53] : [.72, .80, .73],
    green: dark ? [.48, .85, .64] : [.29, .57, .41],
    mint: dark ? [.43, .65, .54] : [.65, .82, .70],
    gold: dark ? [.89, .72, .43] : [.77, .58, .27],
  };
  const objects = [], labels = [], phase = phaseFor(stage, t, { opened });
  let origin = [0, 0, 0], rotation = [0, 0, 0];
  const rotate = (v, r) => {
    let [x,y,z] = v; const [a,b,c] = r;
    [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
    [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
    return [x*Math.cos(c)-y*Math.sin(c), x*Math.sin(c)+y*Math.cos(c), z];
  };
  // Rotation composition is supplied to the engine as an optional parent matrix.
  const add = (shape, pos, size, color=p.paper, r=[0,0,0], extra={}) => {
    const local = {shape,p:pos,s:size,color,r,...extra};
    if (origin.some(Boolean) || rotation.some(Boolean)) {
      const world=rotate(pos,rotation).map((v,i)=>v+origin[i]);
      objects.push({...local,p:world,parentRotation:rotation.slice(),localRotation:r.slice(),r:r.map((v,i)=>v+rotation[i])});
    } else objects.push(local);
  };
  const group = (pos,r,fn) => {origin=pos;rotation=r;fn();origin=[0,0,0];rotation=[0,0,0];};
  const box = (pos,size,color=p.paper,r=[0,0,0]) => add('roundedBox',pos,size,color,r);
  const ball = (pos,r,color=p.green) => add('sphere',pos,[r,r,r],color);
  const tube = (a,b,w=.025,color=p.edge) => {
    const v=b.map((x,i)=>x-a[i]);add('cylinder',a.map((x,i)=>(x+b[i])/2),[w,Math.hypot(...v),w],color,segmentRotation(v));
  };
  const ring = (pos,r,color=p.edge,rotation=[Math.PI/2,0,0]) => add('torus',pos,[r,r,r],color,rotation);
  const tick = (x,y,z,s=.2,color=p.green) => {tube([x-s*.55,y,z],[x-s*.12,y-s*.4,z],s*.22,color);tube([x-s*.12,y-s*.4,z],[x+s*.7,y+s*.5,z],s*.22,color);};
  const lines = (x,y,z,width=1,count=3) => {for(let i=0;i<count;i++)box([x-(i%2)*width*.08,y-i*.2,z],[width*(i%2?.76:1),.047,.019],p.faint);};
  const page = (x,y,z,scale=1,r=[-.07,-.2,.06],selected=false) => group([x,y,z],r,()=>{
    box([0,0,0],[1.72*scale,2.05*scale,.13],p.edge);
    box([0,.015,.075],[1.65*scale,1.98*scale,.08],p.paper);
    box([0,.82*scale,.124],[1.49*scale,.18*scale,.02],p.mint);
    for(let i=0;i<3;i++)ball([(-.61+i*.09)*scale,.82*scale,.147],.021*scale,i? p.paper:p.green);
    lines(-.08*scale,.54*scale,.129,1.12*scale,2);
    for(let i=0;i<3;i++){
      box([0,(-.05-i*.29)*scale,.133],[1.34*scale,.22*scale,.024],selected&&i===1?p.mint:p.shell);
      ring([-.48*scale,(-.05-i*.29)*scale,.162],.043*scale,selected&&i===1?p.green:p.edge);
      box([.05*scale,(-.05-i*.29)*scale,.16],[.69*scale,.035,.018],selected&&i===1?p.green:p.faint);
      if(selected&&i===1)ball([-.48*scale,(-.05-i*.29)*scale,.169],.025*scale);
    }
  });
  const sheet = (x,y,z,scale=1,r=[-.08,-.22,.08],seal=false) => group([x,y,z],r,()=>{
    box([0,0,0],[1.38*scale,1.66*scale,.085],p.paper);
    box([-.43*scale,.54*scale,.052],[.22*scale,.18*scale,.025],p.mint);
    lines(.02*scale,.23*scale,.055,.95*scale,3);
    if(seal){ball([.38*scale,-.49*scale,.07],.19*scale,p.green);tick(.38*scale,-.49*scale,.085+.19*scale,.14*scale,p.paper);}
  });
  const track = (a,b,u,{active=true,arc=.25}={}) => {
    const at=v=>[mix(a[0],b[0],v),mix(a[1],b[1],v)+Math.sin(v*Math.PI)*arc,mix(a[2],b[2],v)];
    for(let i=0;i<15;i++)ball(at(i/14),.019,active?p.faint:p.edge);
    if(active){const pos=at(clamp(u));ball(pos,.08,p.green);ball([pos[0]-.035,pos[1]+.025,pos[2]+.045],.027,p.paper);}
  };
  const label=(text,pos,tone='')=>labels.push({text,pos,tone});
  const u=smooth((t-1)/6);
  if(stage==='read'){
    page(-1.7,.32,-.08,1.05,[-.09,.19,-.08]);
    // Three extracted fields separate and settle into one structured input.
    for(let i=0;i<3;i++){
      const k=smooth((t-1-i*.55)/4);
      sheet(mix(-1.3,1.38+i*.23,k),mix(.2,.2+i*.20,k)+Math.sin(k*Math.PI)*.24,mix(.1,-.2+i*.19,k),.76,[-.12,-.34,-.08+i*.04]);
    }
    track([-.67,-.85,.1],[1.08,-.85,.24],u,{arc:-.20});
    label('PTA 当前题目',[-1.7,1.75,0]);
    label('结构化输入',[1.68,1.72,0]);
    label('题面 · 选项 · 上下文',[.1,-1.34,.1]);
  }else if(stage==='model'){
    // A compact memory stack, a processing core, and a single answer leaf.
    group([-2.18,.18,0],[.22,0,-.08],()=>{
      for(let i=0;i<4;i++){
        add('cylinder',[0,-.45+i*.28,0],[1.08,.20,1.08],i===3?p.mint:p.shell);
        box([.12,-.45+i*.28,.52],[.38,.035,.018],p.green);
      }
    });
    const spin=cacheHit?-.18: -.18+Math.sin(Math.PI*smooth((t-3)/3))*.18;
    group([0,.35,-.10],[-.12,spin,.08],()=>{
      box([0,0,0],[1.37,1.37,.34],p.edge);
      box([0,0,.20],[1.25,1.25,.11],cacheHit?p.shell:p.mint);
      box([0,0,.28],[.95,.95,.12],p.ink);
      for(let k=0;k<4;k++)for(let i=0;i<5;i++){
        const x=-.47+i*.235, y=.79, z=.02;
        const angle=k*Math.PI/2, q=rotate([x,y,z],[0,0,angle]);
        box(q,[k%2?.22:.085,k%2?.085:.22,.08],p.shell);
      }
      const nodes=[[-.28,.20,.37],[.24,.29,.37],[-.05,-.04,.40],[-.28,-.28,.37],[.28,-.24,.37]];
      for(const [a,b] of [[0,1],[0,2],[1,2],[2,3],[2,4],[3,4]])tube(nodes[a],nodes[b],.025,cacheHit?p.faint:p.mint);
      nodes.forEach((n,i)=>ball(n,.075,cacheHit?p.faint:(phase===1&&i===Math.floor(t*2)%5?p.paper:p.green)));
    });
    sheet(2.17,.19,.04,.75,[-.08,-.3,.1],phase===2);
    if(cacheHit)track([-1.6,-.55,.18],[1.61,-.55,.2],u,{arc:-.52});
    else {track([-1.57,.32,.12],[-.85,.32,.12],smooth((t-1)/2),{arc:.08});track([.83,.32,.12],[1.65,.32,.12],smooth((t-4)/2.5),{arc:.08,active:t>=3});}
    label('本地缓存',[-2.15,1.40,0]);
    label(cacheHit?'缓存命中 · 跳过模型':'你的 AI 模型',[0,1.65,0]);
    label(phase===2?'候选答案 B':'候选答案',[2.15,1.4,0]);
  }else if(stage==='write'){
    page(0,.3,0,1.03,[-.05,-.16,-.035],t>=3);
    group([-2.08,.35,.05],[0,.12,-.13],()=>{
      box([0,0,0],[.94,1.18,.18],p.mint);ring([0,.06,.13],.29,p.green);tick(0,.06,.18,.24);
      box([0,-.46,.11],[.32,.04,.02],p.green);
    });
    group([2.04,.28,.1],[-.1,-.27,.06],()=>{
      box([0,0,0],[1.12,1.34,.20],p.edge);box([0,.06,.13],[1.02,1.15,.08],p.paper);
      for(let i=0;i<3;i++){const on=t>3.2+i*1.1;ball([-.3,.4-i*.3,.22],.065,on?p.green:p.faint);box([.13,.4-i*.3,.2],[.42,.055,.022],on?p.green:p.faint);}
      box([0,-.43,.2],[.67,.17,.05],t>7.8?p.green:p.shell);
    });
    track([-1.49,-.55,.15],[-.96,-.55,.15],smooth((t-1)/2),{arc:.1});
    track([.97,-.55,.15],[1.46,-.55,.15],smooth((t-5)/2),{arc:.1,active:t>=3});
    label('页面变化检查',[-2.07,1.40,0]);label('填写选项 B',[0,1.75,0]);label(t>7.8?'目标题目 3/3 · 本页已保存':'全部目标成功后保存',[2.05,-.86,0]);
  }else if(stage==='pair'){
    page(-1.92,.23,-.08,.85,[-.06,.22,-.07]);
    page(1.92,.23,-.08,.85,[-.06,-.25,.07]);
    // Public key passes through open air. No private key or API credential moves.
    group([mix(-.35,.35,u),.35,.65],[0,-.13,-.42],()=>{
      ring([-.19,0,0],.28,p.gold);
      box([.27,0,0],[.66,.12,.11],p.gold);
      box([.44,-.13,0],[.11,.24,.11],p.gold);box([.23,-.1,0],[.10,.19,.11],p.gold);
    });
    track([-.96,-.52,.15],[.95,-.52,.15],u,{arc:-.24});
    label('PNC',[-1.92,1.53,0]);label('仅验证公钥',[0,1.31,.2]);label('Helper',[1.92,1.53,0]);
  }else if(stage==='sync'){
    for(let i=0;i<3;i++)sheet(-2.13+i*.13,.13+i*.13,-.3+i*.16,.72,[-.06,.18,-.07],true);
    group([0,.40,.15],[0,-.17,.08],()=>{
      ring([0,0,0],.68,p.edge);ring([0,0,.04],.56,p.mint);
      tick(0,0,.08,.42,t>=4?p.green:p.faint);
      for(let i=0;i<3;i++)ball([-.30+i*.30,-.88,.06],.07,t>=2+i*1.4?p.green:p.faint);
    });
    sheet(2.05,.24,.04,.86,[-.07,-.27,.07],t>=6);
    track([-1.32,.34,.1],[-.76,.34,.1],smooth((t-1)/2),{arc:.08});track([.76,.34,.1],[1.39,.34,.1],smooth((t-5)/2),{arc:.08,active:t>=4});
    label('PNC 签名快照',[-1.94,1.52,0]);label('验签 · 时间 · 序号',[0,1.52,0]);label('Helper 本地快照',[2.05,1.52,0]);
  }else if(stage==='remind'){
    sheet(-2.10,.13,-.1,.71,[-.06,.23,-.08]);
    group([0,.35,.03],[0,-.18,-.08],()=>{
      add('cylinder',[0,0,0],[1.91,.20,1.91],p.edge,[Math.PI/2,0,0]);
      add('cylinder',[0,0,.12],[1.78,.05,1.78],p.paper,[Math.PI/2,0,0]);
      ring([0,0,.16],.81,p.mint);
      for(let i=0;i<12;i++){const a=i*Math.PI/6;box([Math.sin(a)*.69,Math.cos(a)*.69,.18],[.025,i%3===0?.13:.07,.02],p.edge,[0,0,-a]);}
      const a=-.9+smooth((t-1)/4)*.8; tube([0,0,.21],[Math.sin(a)*.52,Math.cos(a)*.52,.21],.055,p.green);tube([0,0,.22],[.30,-.16,.22],.065,p.ink);ball([0,0,.24],.075,p.green);
    });
    group([2.1,.25,.12],[-.09,-.27,.08],()=>{
      box([0,0,0],[1.25,1.01,.17],p.paper);
      box([0,.29,.10],[1.09,.20,.03],p.mint);lines(.08,.02,.1,.73,2);
      ball([.47,.44,.14],.11,t>=6?p.green:p.faint);
    });
    track([.95,-.53,.1],[1.47,-.35,.1],smooth((t-5)/2),{arc:.03,active:t>=5});
    label('最近同步的截止时间',[-2.1,1.37,0]);label('少于 3 天',[0,1.66,0]);label('请求通知 · 不保证送达',[2.1,-.71,0]);
  }else if(stage==='jump'){
    const n=opened?smooth(t/2):0;
    group([-1.58,.39,.16],[-.09,.17,-.08],()=>{
      box([0,0,0],[2.05,1.31,.20],p.edge);box([0,.02,.12],[1.95,1.22,.07],p.paper);
      box([-.68,.24,.18],[.36,.36,.07],p.mint);ball([-.68,.24,.23],.10,p.green);lines(.30,.27,.17,.89,2);box([.02,-.31,.17],[1.48,.06,.018],p.faint);
    });
    page(1.61,.27,-.10,.94,[-.05,-.25,.075],opened);
    track([-.44,-.6,.14],[.63,-.6,.14],n,{arc:-.18,active:opened});
    label('示意通知',[-1.58,1.57,0]);label(opened?'已打开示意题集':'由你点击打开',[0,-1.13,.1]);label(opened?'字符串与常用类':'对应 PTA 题集',[1.61,1.70,0]);
  }
  return { objects, labels, phase };
}
