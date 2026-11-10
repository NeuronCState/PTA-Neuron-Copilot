import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { camera, createSceneRenderer, project } from './workflow-3d-engine.mjs';
import { buildScene, DURATION, phases, sceneLabels } from './workflow-3d-scenes.mjs';
import './workflow-3d.css';
export default function WorkflowScene3D({
  stage
}) {
  const root = useRef(null),
    canvas = useRef(null),
    labels = useRef(null),
    timeline = useRef(null),
    refresh = useRef(() => {});
  const reduce = useReducedMotion(),
    [paused, setPaused] = useState(false),
    [run, setRun] = useState(0),
    [view, setView] = useState(false),
    [cacheHit, setCacheHit] = useState(false),
    [opened, setOpened] = useState(false),
    [phase, setPhase] = useState(0),
    [rendererType, setRendererType] = useState('idle');
  const live = useRef({});
  live.current = {
    paused,
    view
  };
  useEffect(() => {
    const el = root.current,
      cv = canvas.current,
      viewport = cv.parentElement,
      screen = el.closest('.screen'),
      slide = el.closest('.chapter-slide');
    let renderer = null,
      raf = 0,
      last = 0,
      time = reduce ? DURATION : 0,
      yaw = -.27,
      pitch = .6,
      active = false,
      disposed = false,
      lost = false,
      failed = false,
      phaseSeen = -1,
      width = 1,
      height = 1,
      dark = false;
    const coarse = matchMedia('(pointer:coarse)'),
      scheme = matchMedia('(prefers-color-scheme:dark)');
    const isActive = () => screen?.dataset.active === 'true' && slide?.dataset.active === 'true';
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      el.dataset.running = 'false';
    }
    function palette() {
      const style = getComputedStyle(el),
        color = style.getPropertyValue('--pnc-ink').trim();
      dark = document.documentElement.dataset.theme === 'dark' || color.startsWith('#e') || color.startsWith('#f') || !document.documentElement.dataset.theme && scheme.matches;
      const rgb = color.match(/[\d.]+/g);
      if (color.startsWith('rgb') && rgb) dark = Number(rgb[0]) > 150;
    }
    function draw() {
      if (!renderer || !active || disposed || lost) return;
      const scene = buildScene(stage.id, time, {
          dark,
          cacheHit,
          opened
        }),
        vp = camera(width / height, yaw, pitch);
      renderer.draw(scene.objects, vp, width, height, Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5));
      scene.labels.forEach((l, i) => {
        const node = labels.current?.children[i];
        if (!node) return;
        const [x, y] = project(l.pos, vp, width, height);
        node.style.left = Math.max(42, Math.min(width - 42, x)) + 'px';
        node.style.top = Math.max(12, Math.min(height - 12, y)) + 'px';
        node.textContent = l.text;
      });
      if (phaseSeen !== scene.phase) {
        phaseSeen = scene.phase;
        setPhase(scene.phase);
      }
      if (timeline.current) timeline.current.style.width = (stage.id === 'jump' ? opened ? 100 : 0 : time / DURATION * 100) + '%';
      el.dataset.time = time.toFixed(2);
    }
    function tick(now) {
      raf = 0;
      if (disposed || !active || document.hidden || lost) return;
      const dt = last ? Math.min((now - last) / 1000, .08) : 0;
      if (last && dt < 1 / (renderer?.type === 'software' ? 18 : coarse.matches ? 24 : 30)) {
        raf = requestAnimationFrame(tick);
        return;
      }
      last = now;
      const targetYaw = live.current.view ? .48 : -.27,
        drift = targetYaw - yaw;
      yaw += drift * (reduce ? 1 : Math.min(1, dt * 6));
      const limit = stage.id === 'jump' ? 2.3 : DURATION;
      if (!reduce && !live.current.paused && (stage.id !== 'jump' || opened)) time = Math.min(limit, time + dt);
      draw();
      const moving = !reduce && !live.current.paused && time < limit && (stage.id !== 'jump' || opened),
        orbit = Math.abs(drift) > .001;
      el.dataset.running = String(moving || orbit);
      if (moving || orbit) raf = requestAnimationFrame(tick);
    }
    function start() {
      stop();
      if (active && !document.hidden && renderer && !lost) {
        draw();
        raf = requestAnimationFrame(tick);
      }
    }
    function resize() {
      const style = getComputedStyle(el),
        available = innerHeight - ['--screen-top', '--screen-bottom', '--toolbar-space'].reduce((sum, key) => sum + (parseFloat(style.getPropertyValue(key)) || 0), 0),
        chrome = el.getBoundingClientRect().height - viewport.getBoundingClientRect().height;
      el.style.setProperty('--wf3d-fit-height', Math.max(16, available - chrome - 2) + 'px');
      const rect = viewport.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      palette();
      start();
    }
    function activate() {
      const next = isActive();
      if (next === active) return;
      active = next;
      if (!active) {
        stop();
        renderer?.dispose();
        renderer = null;
        setRendererType('idle');
        return;
      }
      if (!failed && !lost) {
        try {
          renderer = createSceneRenderer(cv);
          el.dataset.rendererError = renderer ? '' : 'WebGL unavailable';
        } catch (error) {
          el.dataset.rendererError = error.message;
          renderer = null;
        }
        if (!renderer) failed = true;
      }
      setRendererType(renderer?.type || 'fallback');
      resize();
    }
    function contextLost(event) {
      event.preventDefault();
      lost = true;
      stop();
      renderer?.dispose();
      renderer = null;
      setRendererType('fallback');
    }
    function contextRestored() {
      lost = false;
      failed = false;
      active = false;
      activate();
    }
    cv.addEventListener('webglcontextlost', contextLost);
    cv.addEventListener('webglcontextrestored', contextRestored);
    const observer = new MutationObserver(activate);
    if (screen) observer.observe(screen, {
      attributes: true,
      attributeFilter: ['data-active']
    });
    if (slide) observer.observe(slide, {
      attributes: true,
      attributeFilter: ['data-active']
    });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    ro?.observe(viewport);
    ro?.observe(el);
    const themeObserver = new MutationObserver(resize);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style']
    });
    const visibility = () => document.hidden ? stop() : start();
    document.addEventListener('visibilitychange', visibility);
    scheme.addEventListener('change', resize);
    window.addEventListener('pnc:page', activate);
    window.addEventListener('pnc:layout', activate);
    refresh.current = start;
    resize();
    activate();
    return () => {
      disposed = true;
      stop();
      refresh.current = () => {};
      renderer?.dispose();
      observer.disconnect();
      themeObserver.disconnect();
      ro?.disconnect();
      cv.removeEventListener('webglcontextlost', contextLost);
      cv.removeEventListener('webglcontextrestored', contextRestored);
      document.removeEventListener('visibilitychange', visibility);
      scheme.removeEventListener('change', resize);
      window.removeEventListener('pnc:page', activate);
      window.removeEventListener('pnc:layout', activate);
    };
  }, [stage.id, run, reduce, cacheHit, opened]);
  useEffect(() => {
    refresh.current();
  }, [paused, view]);
  const staticMode = !!reduce || rendererType === 'fallback';
  let status = phases[stage.id][phase];
  if (stage.id === 'model' && cacheHit) status = phase === 0 ? '先检查本地答案缓存' : phase === 1 ? '缓存命中，绕过模型请求' : '复用候选答案，仍需核对';
  const replay = () => {
    setPaused(false);
    setRun(n => n + 1);
  };
  return <div ref={root} className="workflow-graphic wf3d" data-renderer={rendererType} data-paused={paused || undefined} data-static={staticMode || undefined} data-stage={stage.id}>
  <div className="wf3d-heading"><span><i />{rendererType === 'fallback' ? 'STATIC FALLBACK' : '3D WORKFLOW'}</span><span>0{Object.keys(sceneLabels).indexOf(stage.id) + 1} / 07</span></div>
  <div className="wf3d-viewport" aria-hidden="true"><canvas ref={canvas} /><div ref={labels} className="wf3d-labels">{sceneLabels[stage.id].map((label, i) => <span key={i}>{label}</span>)}</div>{rendererType === 'fallback' && <div className="wf3d-fallback">{sceneLabels[stage.id].map((label, i) => <div key={label}><i style={{
            '--tile-order': i
          }} /><span>{label}</span></div>)}</div>}</div>
  <div className="wf3d-caption"><span className="wf3d-phase">{staticMode ? '静态示意' : `0${phase + 1}`}</span><p>{rendererType === 'fallback' ? '图形渲染不可用，显示静态流程示意。详见步骤说明。' : status}</p></div>
  <div className="wf3d-timeline" aria-hidden="true"><i ref={timeline} /></div>
  <div className="wf-controls">
   <span>{rendererType === 'fallback' ? '图形渲染不可用' : reduce ? '已减少动态效果' : '三维流程示意 · 无真实请求'}</span>
   <div><button onClick={() => setView(v => !v)} disabled={rendererType === 'fallback'} aria-label="转动三维视角" aria-pressed={view}>转动视角</button><button disabled={staticMode || stage.id === 'jump'} onClick={() => setPaused(v => !v)} aria-pressed={paused} aria-label={(paused ? '继续' : '暂停') + stage.label + '动效'}>{paused ? '继续' : '暂停'}</button><button disabled={staticMode} onClick={replay} aria-label={'重播' + stage.label + '动效'}>重播 ↻</button></div>
  </div>
  {stage.id === 'model' && <div className="wf3d-branch"><span>演示路径</span><button aria-pressed={!cacheHit} onClick={() => {
        setCacheHit(false);
        replay();
      }}>缓存未命中</button><button aria-pressed={cacheHit} onClick={() => {
        setCacheHit(true);
        replay();
      }}>缓存命中</button></div>}
  {stage.id === 'jump' && <button className="wf3d-jump" onClick={() => {
      setOpened(v => !v);
      setPaused(false);
    }} aria-pressed={opened}>{opened ? '返回示意通知 ↶' : '点击示意通知，查看对应题集 ↗'}</button>}
  {stage.id === 'jump' && <span className="visually-hidden" role="status">{opened ? '已在示意画面中打开：Java 程序设计，字符串与常用类题集。' : '示意通知：字符串与常用类即将截止。'}</span>}
 </div>;
}
