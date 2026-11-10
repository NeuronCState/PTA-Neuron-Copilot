import { useEffect, useRef } from 'react';
import './neuron-background.css';

// Original procedural artwork. No third-party geometry, shaders or assets.
export default function NeuronBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!context) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    let width = 1, height = 1, frame = 0, last = 0, time = 0;
    let nodes = [], edges = [], ink = '#61835c', glow = '#91a779';
    let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
    let cameraTravel = 0;
    let disposed = false;
    const tau = Math.PI * 2;

    function palette() {
      const style = getComputedStyle(canvas);
      ink = style.getPropertyValue('--neuron-ink').trim() || '#61835c';
      glow = style.getPropertyValue('--neuron-glow').trim() || '#91a779';
    }

    function geometry() {
      // A gently folded lattice: stable topology avoids random connection flicker.
      const columns = width < 700 ? 9 : 15;
      const rows = width < 700 ? 7 : 10;
      nodes = [];
      edges = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const id = row * columns + col;
          nodes.push({ u: col / (columns - 1), v: row / (rows - 1), phase: id * 2.399963 });
          if (col) edges.push([id - 1, id]);
          if (row) edges.push([id - columns, id]);
          if (row && col && (row + col) % 3 === 0) edges.push([id - columns - 1, id]);
        }
      }
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width * .54, height * .9);
      // Model-space folds are rotated before perspective division. The near
      // edge grows while far vertices converge, instead of warping a flat grid.
      const yaw = -.32 + Math.sin(cameraTravel * .34) * .16 + pointerX * .055;
      const pitch = -.4 + Math.sin(cameraTravel * .23) * .1 + pointerY * .035;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      function project({ x, y, z }) {
        const rx = x * cy + z * sy;
        const rz = z * cy - x * sy;
        const ry = y * cp - rz * sp;
        const depth = 3.6 + y * sp + rz * cp;
        const perspective = 2.9 / Math.max(1.2, depth);
        return {
          x: width * .59 + (rx + pointerX * .035) * scale * perspective,
          y: height * .53 + (ry + pointerY * .025 - Math.sin(cameraTravel * .3) * .09) * scale * perspective,
          depth, perspective,
          fade: Math.max(.14, Math.min(1, (5.6 - depth) / 3.6)),
        };
      }
      const world = nodes.map(({ u, v }) => ({
        x: (u - .5) * 4.3,
        y: (v - .5) * 2.8 + Math.sin(u * tau + time * .12) * .2,
        z: Math.sin(u * tau * .85 + v * 2.3 + time * .1) * .72 + (v - .5) * 1.65,
      }));
      const points = world.map(project);
      // Back-to-front drawing preserves the faint far surface at crossings.
      const orderedEdges = edges.map((edge, index) => ({ edge, index,
        depth: (points[edge[0]].depth + points[edge[1]].depth) / 2,
      })).sort((a, b) => b.depth - a.depth);
      context.strokeStyle = ink;
      for (const { edge: [a, b], index } of orderedEdges) {
        const start = points[a], end = points[b];
        const fade = (start.fade + end.fade) / 2;
        context.lineWidth = .45 + (start.perspective + end.perspective) * .17;
        context.globalAlpha = .045 + fade * .2;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        if (index % 13 === 0) {
          const progress = (time * .1 + index * .137) % 1;
          // Interpolate in world space so travelling signals share the projection.
          const pulse = project({
            x: world[a].x + (world[b].x - world[a].x) * progress,
            y: world[a].y + (world[b].y - world[a].y) * progress,
            z: world[a].z + (world[b].z - world[a].z) * progress,
          });
          context.fillStyle = glow;
          context.globalAlpha = Math.sin(progress * Math.PI) * .2 * pulse.fade;
          context.beginPath();
          context.arc(pulse.x, pulse.y, 5 * pulse.perspective, 0, tau);
          context.fill();
          context.fillStyle = ink;
          context.globalAlpha = Math.sin(progress * Math.PI) * .72 * pulse.fade;
          context.beginPath();
          context.arc(pulse.x, pulse.y, 1.7 * pulse.perspective, 0, tau);
          context.fill();
        }
      }
      points.map((point, index) => ({ ...point, index }))
        .sort((a, b) => b.depth - a.depth).forEach((point) => {
          const major = point.index % 7 === 0;
          context.fillStyle = ink;
          context.globalAlpha = (major ? .58 : .3) * point.fade;
          context.beginPath();
          context.arc(point.x, point.y, (major ? 2.1 : 1.1) * point.perspective, 0, tau);
          context.fill();
          if (point.index % 19 === 0) {
            context.globalAlpha = .2 * point.fade;
            context.strokeStyle = ink;
            context.lineWidth = .65 * point.perspective;
            context.beginPath();
            context.arc(point.x, point.y, 6 * point.perspective, 0, tau);
            context.stroke();
          }
        });
      context.globalAlpha = 1;
    }

    function animate(now) {
      frame = 0;
      if (disposed || document.hidden || reduced.matches) return;
      // Cap drawing at 30fps (24 on touch). Geometry is small and DPR is bounded.
      const interval = coarse.matches ? 1000 / 24 : 1000 / 30;
      if (!last || now - last >= interval) {
        const dt = last ? Math.min((now - last) / 1000, .08) : 0;
        last = now;
        time += dt;
        const ease = 1 - Math.exp(-dt * 3);
        pointerX += (targetX - pointerX) * ease;
        pointerY += (targetY - pointerY) * ease;
        const travel = Math.max(0, window.scrollY) / Math.max(1, height);
        cameraTravel += (travel - cameraTravel) * ease;
        draw();
      }
      frame = requestAnimationFrame(animate);
    }

    function restart() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (reduced.matches) {
        time = 0;
        cameraTravel = 0;
        targetX = targetY = pointerX = pointerY = 0;
      }
      if (!document.hidden) {
        draw();
        if (!reduced.matches) frame = requestAnimationFrame(animate);
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      geometry();
      palette();
      restart();
    }

    function pointer(event) {
      if (coarse.matches || reduced.matches || event.pointerType === 'touch') return;
      targetX = Math.max(-1, Math.min(1, event.clientX / width * 2 - 1));
      targetY = Math.max(-1, Math.min(1, event.clientY / height * 2 - 1));
    }
    function resetPointer() { targetX = targetY = 0; }
    function themeChanged() { palette(); restart(); }
    const themeObserver = new MutationObserver(themeChanged);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    reduced.addEventListener('change', restart);
    coarse.addEventListener('change', resize);
    colorScheme.addEventListener('change', themeChanged);
    document.addEventListener('visibilitychange', restart);
    window.addEventListener('pointermove', pointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', resetPointer);
    window.addEventListener('blur', resetPointer);
    window.addEventListener('resize', resize, { passive: true });
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      resizeObserver?.disconnect();
      reduced.removeEventListener('change', restart);
      coarse.removeEventListener('change', resize);
      colorScheme.removeEventListener('change', themeChanged);
      document.removeEventListener('visibilitychange', restart);
      window.removeEventListener('pointermove', pointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('blur', resetPointer);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <div className="neuron-background" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
