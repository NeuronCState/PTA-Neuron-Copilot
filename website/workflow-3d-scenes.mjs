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
export function buildScene(stage, t, {
  dark = false,
  cacheHit = false,
  opened = false
} = {}) {
  const p = {
    white: dark ? [.46, .55, .5] : [.91, .94, .88],
    side: dark ? [.28, .37, .31] : [.7, .79, .66],
    base: dark ? [.2, .27, .23] : [.79, .84, .75],
    ink: dark ? [.72, .83, .65] : [.28, .4, .26],
    green: dark ? [.64, .83, .48] : [.47, .65, .34],
    mint: dark ? [.4, .65, .57] : [.61, .8, .66],
    gold: dark ? [.85, .7, .38] : [.8, .65, .34],
    dark: dark ? [.15, .21, .18] : [.35, .45, .35]
  };
  const objects = [],
    labels = [],
    phase = phaseFor(stage, t, {
      opened
    }),
    q = t / 9;
  const add = (shape, pos, size, color = p.white, r = [0, 0, 0], extra = {}) => objects.push({
    shape,
    p: pos,
    s: size,
    color,
    r,
    ...extra
  });
  const box = (pos, size, color, r) => add('box', pos, size, color, r),
    sphere = (pos, r, color) => add('sphere', pos, [r, r, r], color),
    ring = (pos, r, color, rotation) => add('torus', pos, [r, r, r], color, rotation);
  const tube = (a, b, width = .035, color = p.side) => {
    const v = b.map((x, i) => x - a[i]),
      len = Math.hypot(...v);
    add('cylinder', a.map((x, i) => (x + b[i]) / 2), [width, len, width], color, segmentRotation(v));
  };
  const route = (points, color = p.side) => {
    for (let i = 1; i < points.length; i++) tube(points[i - 1], points[i], .035, color);
  };
  const travel = (points, u, size = .09, color = p.green) => {
    u = clamp(u);
    const piece = Math.min(points.length - 2, Math.floor(u * (points.length - 1))),
      a = points[piece],
      b = points[piece + 1],
      f = u === 1 ? 1 : u * (points.length - 1) - piece;
    sphere(a.map((v, i) => mix(v, b[i], f)), size, color);
  };
  const stack = (x, z, count = 3) => {
    for (let i = 0; i < count; i++) add('cylinder', [x, -.17 + i * .18, z], [.95, .13, .95], i === count - 1 ? p.mint : p.white);
  };
  const pedestal = (x, z, w = 1.5) => {
    box([x, -.43, z], [w, .18, 1.35], p.side);
    box([x, -.32, z], [w - .08, .05, 1.27], p.white);
  };
  const sheet = (x, y, z, w = 1.2, h = .9, rotation = [0, 0, 0]) => {
    box([x, y, z], [w, .07, h], p.white, rotation);
    for (let j = 0; j < 3; j++) box([x - .05, y + .045, z - .22 + j * .18], [w * .66, .014, .04], j === 0 ? p.green : p.side, rotation);
  };
  const browser = (x, z) => {
    pedestal(x, z, 1.8);
    box([x, .48, z - .25], [1.7, 1.25, .13], p.side);
    box([x, .51, z - .16], [1.53, 1.05, .04], p.white);
    box([x, .91, z - .128], [1.39, .09, .015], p.green);
    for (let j = 0; j < 3; j++) box([x - .12, .65 - j * .21, z - .128], [1.04 - j * .13, .045, .018], p.side);
    box([x, -.14, z + .1], [1.75, .08, .8], p.white);
  };
  const label = (text, pos, tone = '') => labels.push({
    text,
    pos,
    tone
  });
  // A shared physical stage makes depth and each object's role legible.
  box([0, -.61, 0], [6.65, .12, 3.35], p.base);
  box([0, -.53, 0], [6.55, .035, 3.25], p.white);
  for (let i = -6; i <= 6; i++) box([i * .5, -.508, 0], [.008, .004, 3.1], p.base);
  for (let i = -3; i <= 3; i++) box([0, -.508, i * .5], [6.4, .004, .008], p.base);
  if (stage === 'read') {
    browser(-2, -.15);
    const progress = smooth((t - 1) / 5);
    for (let i = 0; i < 3; i++) {
      const u = smooth((t - 1 - i * .65) / 3.5);
      sheet(mix(-1.4, .7 + i * .34, u), mix(.35 + i * .15, .1 + i * .27, u) + Math.sin(u * Math.PI) * .8, mix(-.15, .3 - i * .34, u), .9, .65, [0, -.15 + i * .12, 0]);
    }
    pedestal(1.7, .1);
    box([1.7, -.12, .1], [1.2, .35, .95], p.side);
    box([1.7, .09, .1], [1.25, .07, 1], p.mint);
    // Scan bar moves over the real depth of the question model.
    box([-2, .88 - progress * .65, -.105], [1.4, .045, .04], p.green);
    route([[-1.1, -.12, .7], [0, -.12, 1], [1.7, -.12, .7]]);
    travel([[-1.1, -.12, .7], [0, -.12, 1], [1.7, -.12, .7]], progress);
    label(sceneLabels.read[0], [-2, 1.48, -.15]);
    label(sceneLabels.read[1], [1.75, .85, .1]);
    label(sceneLabels.read[2], [.1, -.4, 1.45]);
  } else if (stage === 'model') {
    pedestal(-2, 0);
    stack(-2, 0);
    pedestal(2, 0);
    sheet(2, .1, 0, 1.1, 1);
    box([2, .17, 0], [.5, .05, .45], phase === 2 ? p.green : p.side);
    const rotate = cacheHit ? 1.95 : phase === 1 ? t * .65 : 1.95;
    add('octahedron', [0, .65, 0], [.55, .67, .55], cacheHit ? p.side : p.green, [.2, rotate, .1]);
    ring([0, .65, 0], .92, p.side, [.55, rotate * .2, .25]);
    ring([0, .65, 0], 1.03, cacheHit ? p.side : p.mint, [1.1, -rotate * .2, -.55]);
    const path = cacheHit ? [[-2, .32, 0], [-1, .3, 1.05], [1, .3, 1.05], [2, .32, 0]] : [[-2, .32, 0], [-1, .32, 0], [0, .65, 0], [1, .32, 0], [2, .32, 0]];
    route(path, cacheHit ? p.green : p.side);
    travel(path, smooth((t - 1) / 6), .12);
    label('本地缓存', [-2, .85, 0]);
    label(cacheHit ? '缓存命中 · 跳过模型' : '你的 AI 模型', [0, 1.8, 0]);
    label(phase === 2 ? '候选答案 B' : '候选答案', [2, .9, 0]);
  } else if (stage === 'write') {
    pedestal(-2, -.1, 1.3);
    ring([-2, .55, -.1], .62, p.mint, [Math.PI / 2, 0, 0]);
    box([-2, .55, -.1], [.55, .7, .14], p.green, [0, t < 3 ? t * .4 : 1.2, 0]);
    pedestal(0, 0, 1.5);
    for (let i = 0; i < 3; i++) {
      box([0, -.13, -.48 + i * .46], [1.1, .18, .32], i === 1 && t > 3 ? p.mint : p.white);
      sphere([-.32, -.01, -.48 + i * .46], .065, i === 1 && t > 3 ? p.green : p.side);
    }
    const u = smooth((t - 1) / 4);
    add('octahedron', [mix(-2, 0, u), .55 + Math.sin(u * Math.PI) * .55, mix(-.1, 0, u)], [.16, .16, .16], p.green, [0, t, 0]);
    pedestal(2, 0);
    box([2, -.07, 0], [1.1, .5, .9], p.side);
    const lid = 1 - smooth((t - 6.5) / 1.3);
    box([2, .22 + lid * .55, -lid * .15], [1.18, .09, .98], p.white, [lid * -.3, 0, 0]);
    for (let i = 0; i < 3; i++) {
      const h = .08 + .24 * smooth((t - 3.2 - i * .9) / .8);
      box([1.68 + i * .32, .3 + h / 2, .15], [.21, h, .4], p.green);
    }
    route([[-1.4, .2, -.1], [-.8, .2, -.1]]);
    route([[.7, -.1, .7], [1.4, -.1, .7]]);
    label('页面变化检查', [-2, 1.48, -.1]);
    label('填写选项 B', [0, .65, .2]);
    label(t > 7.8 ? '目标题目 3/3 · 本页已保存' : '全部目标成功后保存', [2, 1.25, 0]);
  } else if (stage === 'pair') {
    pedestal(-2, 0);
    pedestal(2, 0);
    box([-2, .2, 0], [1.1, 1.05, .9], p.side);
    box([-2, .77, 0], [1.18, .12, .98], p.mint);
    box([2, .14, 0], [1.1, .9, .9], p.white);
    box([2, .64, 0], [1.18, .1, .98], p.side);
    // Private signing key remains physically anchored in the PNC side.
    sphere([-2, .85, 0], .11, p.gold);
    const u = smooth((t - 1.5) / 5),
      kx = mix(-1.9, 2, u),
      ky = .97 + Math.sin(u * Math.PI) * .45;
    ring([kx, ky, 0], .19, p.gold, [Math.PI / 2, 0, 0]);
    box([kx + .28, ky, 0], [.34, .09, .09], p.gold);
    box([kx + .4, ky - .09, 0], [.07, .18, .09], p.gold);
    route([[-1.2, .12, .75], [0, .12, 1.05], [1.3, .12, .75]]);
    label('PNC · 私钥留在本地', [-2, 1.6, 0]);
    label('手动复制验证公钥', [0, 2, 0]);
    label(t > 6.5 ? 'Helper · 已确认来源' : 'Helper', [2, 1.35, 0]);
  } else if (stage === 'sync') {
    pedestal(-2, 0);
    stack(-2, 0, 4);
    pedestal(2, 0);
    stack(2, 0, t > 6 ? 4 : 2);
    // Validation gate is a seal, never an encryption lock.
    ring([0, .55, 0], .67, p.mint, [Math.PI / 2, 0, 0]);
    ring([0, .55, 0], .78, p.side, [Math.PI / 2, 0, 0]);
    box([0, -.25, 0], [.18, .4, .3], p.side);
    const u = smooth((t - 1) / 6),
      x = mix(-2, 2, u);
    box([x, .55, 0], [.43, .32, .43], p.white, [.1, q * 2, .1]);
    sphere([x, .78, 0], .1, p.gold);
    route([[-1.4, .55, 0], [1.4, .55, 0]]);
    label('PNC · 签名题集快照', [-2, 1.15, 0]);
    label('验签 · 时间 · 序号', [0, 1.65, 0]);
    label('Helper · 本地保存', [2, 1.15, 0]);
  } else if (stage === 'remind') {
    pedestal(-2, 0);
    stack(-2, 0);
    ring([0, .45, 0], .82, p.side, [Math.PI / 2, 0, 0]);
    ring([0, .45, .02], .72, p.green, [Math.PI / 2, 0, 0]);
    add('cylinder', [0, .45, 0], [1.45, .07, 1.45], p.white, [Math.PI / 2, 0, 0]);
    const angle = mix(-1.2, .4, smooth(t / 6));
    tube([0, .45, .07], [Math.sin(angle) * .55, .45 + Math.cos(angle) * .55, .07], .045, p.ink);
    tube([0, .45, .08], [.3, .52, .08], .04, p.green);
    sphere([0, .45, .1], .07, p.gold);
    pedestal(2, 0);
    const rise = smooth((t - 5) / 2.2);
    box([2, -.15 + rise * .6, 0], [1.15, .75, .16], p.white, [0, -.12, 0]);
    for (let i = 0; i < 2; i++) box([2, .02 + rise * .6 - i * .18, .11], [.8 - i * .2, .045, .03], p.green);
    ring([1.45, .25, .55], .18, p.gold, [Math.PI / 2, 0, 0]);
    route([[-1.4, .05, .7], [-.7, .05, .7]]);
    route([[.8, .05, .7], [1.5, .05, .7]]);
    travel([[-1.4, .05, .7], [-.7, .05, .7], [.8, .05, .7], [1.5, .05, .7]], smooth(t / 7));
    label('最近同步的快照', [-2, .9, 0]);
    label(t < 4 ? '每 30 秒检查' : '少于 3 天 · 示例', [0, 1.55, 0]);
    label(t < 6 ? '去重检查' : '已请求 · 非送达', [2, 1.45, 0]);
  } else if (stage === 'jump') {
    pedestal(-2, 0);
    box([-2, .4, 0], [1.65, .8, .18], p.white, [0, .14, 0]);
    for (let i = 0; i < 2; i++) box([-2, .54 - i * .22, .13], [1.25 - i * .2, .045, .03], p.green);
    sphere([-2.62, .65, .13], .08, p.gold);
    browser(1.75, 0);
    const u = opened ? smooth(t / 1.8) : 0,
      path = [[-1.1, .4, .2], [-.3, .7, .7], [.5, .7, .7], [1.75, .55, .1]];
    route(path, opened ? p.green : p.side);
    if (opened) travel(path, u, .14, p.green);
    if (opened && u > .7) box([1.75, .51, -.12], [1.3, .65, .02], p.mint);
    label('题集截止提醒', [-2, 1.25, 0]);
    label(opened ? '在本页演示打开' : '等待用户点击', [0, 1.65, 0]);
    label('对应 PTA 题集', [1.75, 1.55, 0]);
  }
  return {
    objects,
    labels,
    phase
  };
}
