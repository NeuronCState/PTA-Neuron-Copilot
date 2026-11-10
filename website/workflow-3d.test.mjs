import assert from 'node:assert/strict';
import { boxGeometry, cylinderGeometry, sphereGeometry, torusGeometry, octahedronGeometry, camera, project, transform, multiply, identity, createRenderer, createSoftwareRenderer } from './workflow-3d-engine.mjs';
import { buildScene, sceneLabels, phaseFor, segmentRotation } from './workflow-3d-scenes.mjs';
for (const geometry of [boxGeometry(), cylinderGeometry(), sphereGeometry(), torusGeometry(), octahedronGeometry()]) {
  assert.equal(geometry.positions.length, geometry.normals.length);
  assert.equal(geometry.positions.length % 9, 0);
  assert(geometry.positions.every(Number.isFinite));
  assert(geometry.normals.every(Number.isFinite));
}
assert.deepEqual(multiply(identity(), transform([1, 2, 3])), transform([1, 2, 3]));
assert.notDeepEqual(project([1, 0, 0], camera(1.8, -.3), 500, 280), project([1, 0, 0], camera(1.8, .4), 500, 280));
for (const stage of Object.keys(sceneLabels)) for (const t of [0, 1.5, 3, 6, 9]) for (const dark of [false, true]) {
  const scene = buildScene(stage, t, {
    dark,
    cacheHit: t === 6,
    opened: t > 3
  });
  assert(scene.objects.length > 20);
  assert.equal(scene.labels.length, 3);
  for (const o of scene.objects) {
    assert(o.p.every(Number.isFinite));
    assert(o.s.every(n => Number.isFinite(n) && n > 0));
    assert(o.r.every(Number.isFinite));
    assert(o.color.every(n => n >= 0 && n <= 1));
  }
}
assert.equal(phaseFor('jump', 9, {
  opened: false
}), 0);
assert.equal(phaseFor('jump', 0, {
  opened: true
}), 2);
assert(buildScene('write', 9).labels.some(l => l.text.includes('3/3')));
assert(!buildScene('write', 5).labels.some(l => l.text.includes('已保存')));
assert(buildScene('model', 5, {
  cacheHit: true
}).labels.some(l => l.text.includes('跳过模型')));
assert.notDeepEqual(buildScene('read', 0).objects, buildScene('read', 5).objects);
assert.equal(createRenderer({
  getContext: () => null
}), null);
let imageData;
const ctx = {
  createImageData: (w, h) => ({
    data: new Uint8ClampedArray(w * h * 4)
  }),
  putImageData: p => {
    imageData = p;
  }
};
const canvas = {
  width: 0,
  height: 0,
  getContext: () => ctx
};
const soft = createSoftwareRenderer(canvas);
// Depth buffer must show the nearer green cube regardless of draw order.
const near = {
    shape: 'box',
    p: [0, 0, 1],
    s: [1, 1, 1],
    r: [0, 0, 0],
    color: [0, 1, 0]
  },
  far = {
    ...near,
    p: [0, 0, -1],
    color: [1, 0, 0]
  };
soft.draw([near, far], camera(1, 0, 0), 64, 64);
const pixel = (32 * 64 + 32) * 4;
assert(imageData.data[pixel + 1] > imageData.data[pixel]);
soft.draw([far, near], camera(1, 0, 0), 64, 64);
assert(imageData.data[pixel + 1] > imageData.data[pixel]);
soft.dispose();
console.log('PASS: real xyz meshes, perspective orbit, seven finite scenes, factual route states and software depth occlusion');
for (const v of [[1.1, 0, .3], [1, 2, 3], [-1, -2, -3], [0, 0, 1], [1, 0, 0], [0, -1, 0]]) {
  const length = Math.hypot(...v),
    matrix = transform([0, 0, 0], [1, length, 1], segmentRotation(v));
  for (let i = 0; i < 3; i++) assert(Math.abs(matrix[4 + i] - v[i]) < 1e-8);
}
const core = t => buildScene('model', t, {
  cacheHit: true
}).objects.find(o => o.shape === 'octahedron');
assert.deepEqual(core(3), core(5));
console.log('PASS: 3D segment orientation and inactive AI core on cache hits');
