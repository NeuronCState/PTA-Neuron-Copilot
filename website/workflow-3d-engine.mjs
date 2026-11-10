// Original, dependency-free WebGL scene renderer. All meshes are real xyz
// geometry: perspective projection, lighting and a GPU depth buffer.
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function multiply(a, b) {
  const m = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) m[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return m;
}
export function transform(p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) {
  const [x, y, z] = r,
    cx = Math.cos(x),
    sx = Math.sin(x),
    cy = Math.cos(y),
    sy = Math.sin(y),
    cz = Math.cos(z),
    sz = Math.sin(z);
  const rx = [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1],
    ry = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1],
    rz = [cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const m = multiply(multiply(rz, ry), rx);
  for (let c = 0; c < 3; c++) for (let i = 0; i < 3; i++) m[c * 4 + i] *= s[c];
  m[12] = p[0];
  m[13] = p[1];
  m[14] = p[2];
  return m;
}
const sub = (a, b) => a.map((v, i) => v - b[i]),
  dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
  cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  unit = a => {
    const n = Math.hypot(...a) || 1;
    return a.map(x => x / n);
  };
export function camera(aspect, yaw = -.25, pitch = .6) {
  const distance = 8.2 * Math.max(1, 1.9 / aspect),
    eye = [Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance],
    target = [0, .35, 0],
    z = unit(sub(eye, target)),
    x = unit(cross([0, 1, 0], z)),
    y = cross(z, x),
    view = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  const f = 1 / Math.tan(.56 / 2),
    near = .1,
    far = 40;
  const projection = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
  return multiply(projection, view);
}
export function project(point, m, w, h) {
  const p = [...point, 1],
    r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r[i] += m[j * 4 + i] * p[j];
  return [(r[0] / r[3] * .5 + .5) * w, (-r[1] / r[3] * .5 + .5) * h, r[3]];
}
function mesh() {
  return {
    positions: [],
    normals: []
  };
}
function triangle(g, a, b, c, na, nb = na, nc = na) {
  g.positions.push(...a, ...b, ...c);
  g.normals.push(...na, ...nb, ...nc);
}
export function boxGeometry() {
  const g = mesh();
  for (const [n, u, v] of [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]]) {
    const p = (x, y) => n.map((q, i) => (q + x * u[i] + y * v[i]) * .5),
      a = p(-1, -1),
      b = p(1, -1),
      c = p(1, 1),
      d = p(-1, 1);
    triangle(g, a, b, c, n);
    triangle(g, a, c, d, n);
  }
  return g;
}
export function cylinderGeometry(segments = 32) {
  const g = mesh();
  for (let i = 0; i < segments; i++) {
    const a = i / segments * Math.PI * 2,
      b = (i + 1) / segments * Math.PI * 2,
      na = [Math.cos(a), 0, Math.sin(a)],
      nb = [Math.cos(b), 0, Math.sin(b)],
      p = (n, y) => [n[0] * .5, y, n[2] * .5],
      a0 = p(na, -.5),
      a1 = p(na, .5),
      b0 = p(nb, -.5),
      b1 = p(nb, .5);
    triangle(g, a0, a1, b1, na, na, nb);
    triangle(g, a0, b1, b0, na, nb, nb);
    triangle(g, [0, .5, 0], b1, a1, [0, 1, 0]);
    triangle(g, [0, -.5, 0], a0, b0, [0, -1, 0]);
  }
  return g;
}
export function sphereGeometry(segments = 20, rings = 12) {
  const g = mesh(),
    p = (u, v) => [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)];
  for (let j = 0; j < rings; j++) for (let i = 0; i < segments; i++) {
    const a = p(i / segments * Math.PI * 2, j / rings * Math.PI),
      b = p((i + 1) / segments * Math.PI * 2, j / rings * Math.PI),
      c = p((i + 1) / segments * Math.PI * 2, (j + 1) / rings * Math.PI),
      d = p(i / segments * Math.PI * 2, (j + 1) / rings * Math.PI);
    triangle(g, a, b, c, a, b, c);
    triangle(g, a, c, d, a, c, d);
  }
  return g;
}
export function torusGeometry(segments = 48, sides = 8) {
  const g = mesh(),
    v = (u, a) => {
      const n = [Math.cos(u) * Math.cos(a), Math.sin(a), Math.sin(u) * Math.cos(a)];
      return {
        p: [Math.cos(u) * (1 + .045 * Math.cos(a)), .045 * Math.sin(a), Math.sin(u) * (1 + .045 * Math.cos(a))],
        n
      };
    };
  for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {
    const a = v(i / segments * Math.PI * 2, j / sides * Math.PI * 2),
      b = v((i + 1) / segments * Math.PI * 2, j / sides * Math.PI * 2),
      c = v((i + 1) / segments * Math.PI * 2, (j + 1) / sides * Math.PI * 2),
      d = v(i / segments * Math.PI * 2, (j + 1) / sides * Math.PI * 2);
    triangle(g, a.p, b.p, c.p, a.n, b.n, c.n);
    triangle(g, a.p, c.p, d.p, a.n, c.n, d.n);
  }
  return g;
}
export function octahedronGeometry() {
  const g = mesh(),
    p = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const ids of [[2, 0, 4], [2, 4, 1], [2, 1, 5], [2, 5, 0], [3, 4, 0], [3, 1, 4], [3, 5, 1], [3, 0, 5]]) {
    const [a, b, c] = ids.map(i => p[i]);
    triangle(g, a, b, c, unit(cross(sub(b, a), sub(c, a))));
  }
  return g;
}
const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uVP;uniform mat4 uNormal;varying vec3 normal;varying vec3 world;void main(){vec4 p=uModel*vec4(aPosition,1.);world=p.xyz;normal=normalize(mat3(uNormal)*aNormal);gl_Position=uVP*p;}`;
const fragment = `precision mediump float;uniform vec3 uColor;uniform float uAlpha;uniform float uEmissive;varying vec3 normal;varying vec3 world;void main(){vec3 n=normalize(normal);float key=max(dot(n,normalize(vec3(-.5,1.,.65))),0.);float rim=max(dot(n,normalize(vec3(.8,.25,-.7))),0.);float light=.53+.4*key+.12*rim;vec3 color=uColor*mix(light,1.,uEmissive);gl_FragColor=vec4(color,uAlpha);}`;
export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: 'low-power'
  });
  if (!gl) return null;
  const resources = [];
  let disposed = false;
  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw Error('Workflow shader failed: ' + info);
    }
    resources.push(['shader', s]);
    return s;
  };
  const program = gl.createProgram();
  try {
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Workflow renderer failed');
  } catch (e) {
    resources.forEach(([, s]) => gl.deleteShader(s));
    gl.deleteProgram(program);
    throw e;
  }
  resources.push(['program', program]);
  const attributes = {
      position: gl.getAttribLocation(program, 'aPosition'),
      normal: gl.getAttribLocation(program, 'aNormal')
    },
    uniforms = Object.fromEntries(['Model', 'VP', 'Normal', 'Color', 'Alpha', 'Emissive'].map(n => [n, gl.getUniformLocation(program, 'u' + n)]));
  const geometries = {};
  for (const [name, g] of Object.entries({
    box: boxGeometry(),
    cylinder: cylinderGeometry(),
    sphere: sphereGeometry(),
    torus: torusGeometry(),
    octahedron: octahedronGeometry()
  })) {
    const buffers = [g.positions, g.normals].map(a => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW);
      resources.push(['buffer', b]);
      return b;
    });
    geometries[name] = {
      buffers,
      count: g.positions.length / 3
    };
  }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  return {
    draw(objects, vp, w, h, dpr = 1) {
      if (disposed) return;
      const width = Math.max(1, Math.round(w * dpr)),
        height = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.VP, false, new Float32Array(vp));
      for (const o of objects) {
        const g = geometries[o.shape || 'box'];
        g.buffers.forEach((b, i) => {
          const a = i ? attributes.normal : attributes.position;
          gl.bindBuffer(gl.ARRAY_BUFFER, b);
          gl.enableVertexAttribArray(a);
          gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 0, 0);
        });
        const s = o.s || [1, 1, 1],
          m = transform(o.p, s, o.r),
          normal = transform([0, 0, 0], s.map(v => 1 / (v || .001)), o.r);
        gl.uniformMatrix4fv(uniforms.Model, false, new Float32Array(m));
        gl.uniformMatrix4fv(uniforms.Normal, false, new Float32Array(normal));
        gl.uniform3fv(uniforms.Color, new Float32Array(o.color));
        gl.uniform1f(uniforms.Alpha, o.alpha ?? 1);
        gl.uniform1f(uniforms.Emissive, o.emissive || 0);
        gl.depthMask(o.alpha === undefined || o.alpha === 1);
        gl.drawArrays(gl.TRIANGLES, 0, g.count);
      }
      gl.depthMask(true);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [type, r] of resources) gl[{
        buffer: 'deleteBuffer',
        shader: 'deleteShader',
        program: 'deleteProgram'
      }[type]](r);
    }
  };
}

// Compatibility path rasterizes the same xyz meshes with a per-pixel depth
// buffer. No flat-card substitute, and no dependency on a GPU driver.
export function createSoftwareRenderer(canvas) {
  const context = canvas.getContext('2d', {
    alpha: true
  });
  if (!context) return null;
  const geometries = {
    box: boxGeometry(),
    cylinder: cylinderGeometry(16),
    sphere: sphereGeometry(10, 6),
    torus: torusGeometry(24, 6),
    octahedron: octahedronGeometry()
  };
  let disposed = false,
    pixels = null,
    depth = null;
  const point = (p, m, w = 1) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] * w, m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13] * w, m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14] * w];
  const lightA = unit([-.5, 1, .65]),
    lightB = unit([.8, .25, -.7]);
  return {
    type: 'software',
    draw(objects, vp, w, h, dpr = 1) {
      if (disposed) return;
      const ratio = Math.min(dpr, 1.25, 640 / w),
        width = Math.max(1, Math.round(w * ratio)),
        height = Math.max(1, Math.round(h * ratio));
      if (canvas.width !== width || canvas.height !== height || !pixels) {
        canvas.width = width;
        canvas.height = height;
        pixels = context.createImageData(width, height);
        depth = new Float32Array(width * height);
      }
      pixels.data.fill(0);
      depth.fill(Infinity);
      for (const o of objects) {
        const g = geometries[o.shape || 'box'],
          s = o.s || [1, 1, 1],
          m = transform(o.p, s, o.r),
          nm = transform([0, 0, 0], s.map(x => 1 / (x || .001)), o.r);
        for (let i = 0; i < g.positions.length; i += 9) {
          const v = [0, 3, 6].map(k => project(point(g.positions.slice(i + k, i + k + 3), m), vp, width, height)),
            [a, b, c] = v,
            normal = unit(point(g.normals.slice(i, i + 3), nm, 0)),
            shade = mix(.53 + .4 * Math.max(0, dot(normal, lightA)) + .12 * Math.max(0, dot(normal, lightB)), 1, o.emissive || 0),
            color = o.color.map(x => Math.round(clamp(x * shade) * 255));
          const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
          if (Math.abs(den) < .001) continue;
          const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))),
            maxX = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0]))),
            minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))),
            maxY = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
          for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
            const u = ((b[1] - c[1]) * (x + .5 - c[0]) + (c[0] - b[0]) * (y + .5 - c[1])) / den,
              bb = ((c[1] - a[1]) * (x + .5 - c[0]) + (a[0] - c[0]) * (y + .5 - c[1])) / den,
              cc = 1 - u - bb;
            if (u < 0 || bb < 0 || cc < 0) continue;
            const z = 1 / (u / a[2] + bb / b[2] + cc / c[2]),
              idx = y * width + x;
            if (z >= depth[idx]) continue;
            depth[idx] = z;
            const off = idx * 4;
            pixels.data[off] = color[0];
            pixels.data[off + 1] = color[1];
            pixels.data[off + 2] = color[2];
            pixels.data[off + 3] = Math.round(255 * (o.alpha ?? 1));
          }
        }
      }
      context.putImageData(pixels, 0, 0);
    },
    dispose() {
      disposed = true;
      pixels = depth = null;
    }
  };
}
export function createSceneRenderer(canvas) {
  const gpu = createRenderer(canvas);
  if (gpu) return {
    ...gpu,
    type: 'webgl'
  };
  return createSoftwareRenderer(canvas);
}
