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

### Viewport pagination (2026-11-10)

Each `main > section.screen` is exactly `100dvh`. The fixed header and pager are measured; remaining space is used to pack content rows. Narrow/short viewports and larger text add pages instead of adding a section-internal scroll region or reducing font size. Oversized cards split at real child/sentence boundaries. Returning to the original viewport/type size recombines the content. The existing green PNC/Astryx identity remains; the reference site's full-screen opening and restrained navigation informed the layout, not its ordinary long-page scrolling.

`scroll-snap.mjs` owns whole-screen wheel, touch, keyboard, anchor/history and focus navigation. A deliberate 8px gesture has bounded damping while held, then settles to one adjacent page over 700ms. Reduced motion settles immediately. Pinch zoom and local form/tab interactions are preserved. Native scroll recovery prevents control or browser-originated scrolling from leaving a partial page.

Validation:

```sh
npm run build
npm test
```

For browser QA, open `/qa.html` on the dev server. It is a local test harness, not part of the production entry point. It runs real browser iframe viewports at 1440×900, 1280×720, 1024×768, 390×844, 375×667, 320×568, and 844×390, plus 200% root-font tests. It checks full content bounds, document width, all three demo states, expansion, wheel/touch settling, interrupted/reversed gestures, and font reset. Touch events in this harness are synthetic; physical iOS/Android hardware was not used. Final source passed the matrix in Chromium. No user scripts were changed.
