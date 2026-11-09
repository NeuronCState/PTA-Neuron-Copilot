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
