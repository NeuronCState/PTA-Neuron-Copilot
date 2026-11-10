# PNC project homepage

A static GitHub Pages homepage, built with React 19 and Meta's Astryx design system (`@astryxdesign/core` and `theme-neutral`, pinned in package-lock.json). The page uses actual Theme, Button, and Badge components; site-specific CSS customizes the presentation. It does not change the userscripts.

## Build

```sh
cd website
npm ci
npm run build
```

Generated HTML and bundled assets are committed to `../docs/` so the existing GitHub Pages configuration needs no new build workflow. The root `index.html` continues to redirect to `docs/` when Pages is served from repository root. All JavaScript/CSS are hosted alongside the page; no CDN or remote fonts are required at runtime.

The interactive preview is deliberately labelled as sample data. It never connects to PTA, sends model requests, saves preferences, or submits answers. The page describes the current PNC 2.1.0 / Helper 1.0.0 release. Older documentation pages are preserved for existing links, and not presented as current install guides.

Astryx and bundled dependency notices are in `../docs/THIRD-PARTY-NOTICES.txt`. Their licenses apply to those dependencies, not automatically to the PNC userscripts. Do not remove notices when rebuilding or redistributing the website.

### Interaction motion (2026-11-09)
Evaluated beUI Tabs / Animated Collapsible and Rare UI Folder. Selected continuous selection and reversible disclosure patterns, implemented specifically for PNC using MIT-licensed Motion. No beUI or Rare UI component source is copied; no Tailwind, Lenis or additional scrolling controller. Rare UI's Commons Clause and attribution restrictions are not treated as plain MIT. Motion notices are in `docs/THIRD-PARTY-NOTICES.txt`. Keyboard tab navigation, inert closed disclosures and reduced-motion handling are included.

### Two-axis viewport navigation (2026-11-10)

Each `main > section.screen` is one vertical chapter, exactly `100dvh`. Content is measured and packed into complete horizontal `.chapter-slide` pages inside the chapter. Smaller screens and larger text add horizontal pages without reducing text size or introducing an inner scrolling region. Oversized cards split at actual child/sentence boundaries, and returning to a larger viewport recombines them.

The preview has three real horizontal feature groups. Its shared tab toolbar stays in the same chapter, outside the moving track, so every content page can switch directly to another demonstration. A tab selects that feature's first panel; horizontal swipes update the selected tab. Each chapter remembers its horizontal position.

`scroll-snap.mjs` owns both axes. A deliberate 8px gesture locks one direction, follows with bounded damping, then settles over 440ms (previously 700ms). Touch, trackpad, Shift+wheel, arrow keys, visible navigation controls, anchors/history and focus are supported. Pinch zoom, slider/form controls and tab keyboard interactions remain local. Reduced motion settles immediately and disables entrance animation.

Entry animation is triggered by the active chapter and horizontal panel, rather than running offscreen at initial render. Cards move upward with a 90ms stagger. The original procedural Canvas background uses a true 3D perspective-projected neural lattice, depth-scaled nodes and lines, travelling impulses, scroll-damped camera motion and subtle pointer parallax. No reference-site source or assets are copied. `https://0z5a.github.io/` informed the sense of depth; no site-wide source license was verified. Canvas pauses in hidden tabs, is static under reduced motion, and caps density, DPR and drawing rate on touch devices. No new dependencies or userscript changes.

Validation:

```sh
npm run build
npm test
```

`/qa.html` is a development-only browser harness, not the production entry point. It runs actual Chromium iframe viewports at 1440×900, 1280×720, 1024×768, 390×844, 375×667, 320×568 and 844×390, plus 200% root-font cases. Twenty normal/expanded cases passed content-height and width checks. Interaction checks cover damped dragging, 440ms settling, horizontal switching, shared tabs, local slider keys, chapter position memory, staggered entry, inaccessible inactive panels and diagonal direction locking. Enlarging/reducing text while a slider is focused preserves focus and activates its reflowed horizontal page. Zoomed native panning is covered by the controller regression suite. Desktop light/dark and mobile layouts were visually inspected. Touch events in the harness are synthetic; physical iOS/Android hardware and Safari were not used.

### Script workflow illustrations (2026-11-10, local candidate)

The PNC chapter now has three horizontal stages: read the current problem, use cached answers or the configured model, then fill and update progress before the page-level save. The independent Helper chapter has four: manually pair with the public key, verify signed catalogue snapshots, check the configured deadline window, and open the matching problem set from a notification. These describe the actual small-question and Helper paths, not an invented live backend. Source anchors are in `WorkflowShowcase.jsx`. Programming submissions are explicitly a separate branch.

Each stage uses original DOM/CSS miniatures, staged data packets/tags, a finite entry timeline, and pause/replay controls. The sample notification opens a reversible in-page miniature, never PTA or a real OS notification. No network, clipboard, pairing, credential, or permission APIs are called. No reference component source/assets were copied and no dependency was added. The existing 440ms two-axis controller, chapter position memory, neural background and page packing remain; inactive chapter toolbars are now inert as well as inactive slides.

The decorative miniatures fit the measured space; readable explanation text continues at its normal size onto additional horizontal pages. Reduced-motion mode shows the completed static diagrams and disables timeline controls. `reduced-qa.html` is a development-only matchMedia fixture for that fallback, not a native OS setting test or a production entry.

Validation adds seven-stage/tab selection, reversible notification, pause/replay and factual-copy checks to `npm test`; `/qa.html` includes workflow keyboard, inactive-animation and toolbar accessibility tests. All 20 normal/expanded viewport cases (including 320×568, 844×390 and 200% root text) fit without content-height or width overflow. Synthetic browser tests do not replace physical mobile/Safari or authenticated userscript acceptance. Local only; no publication is performed.

### Actual 3D workflow scenes (2026-11-10)

Replaces the previous DOM/CSS flow miniatures with seven original 3D scenes.
The browser, input sheets, cache stack, model core, verification gates, public-key
transfer, signed snapshot, clock and destination are meshes with real xyz
coordinates. A perspective camera, directional lighting and depth testing make
objects occlude one another correctly. Animated data travels through the same
3D coordinates as its connectors. The model scene lets visitors choose cache
hit or miss: a hit follows the bypass and leaves the model core inactive.

WebGL is preferred. When no WebGL context is available, a small software
rasterizer renders the same meshes with a per-pixel depth buffer, at a capped
resolution and 18 fps. If neither context is available, a labelled static
fallback preserves the workflow explanation. Only the active scene owns
renderer resources and runs its finite timeline. Hidden documents and inactive
pages stop animation; resources and observers are cleaned up. Reduced motion
shows the final static scene. Rotation is an explicit button, so it does not
consume the site's existing horizontal/vertical swipe gestures.

The viewport measures available height and shrinks only the decorative canvas;
controls remain usable and explanation text flows onto the existing horizontal
pages. Existing neural background, 440 ms two-axis navigation, site audience,
installation links and userscripts are unchanged. No new dependencies, external
models, textures, fonts or API requests are added.

Factual corrections: the automatic single-choice result is B, not an assistance
explanation; saving follows all targeted page jobs succeeding, illustrated as
3/3; pairing shows an abstract public key rather than an invented pairing-code
format; the reminder example is strictly less than the configured three days.
Nothing in the scene performs real pairing, model calls, notifications or PTA
navigation.

Validation: build and npm test pass, including perspective/mesh tests,
software depth occlusion, connector orientation and cache-hit inactivity.
The browser harness passes all 26 3D interaction checks, all 20 viewport cases
(320x568 through 1440x900, 844x390 landscape, and 200% root-font cases), and
all 14 retained gesture checks. Light/dark desktop scenes and reduced-motion
output were inspected. The current cloud browser does not expose WebGL, so
browser visual checks exercised the software 3D path; native GPU rendering and
physical mobile/Safari remain unverified. Publication uses the existing
GitHub Pages build output in docs/, without changing the deployment pipeline.
