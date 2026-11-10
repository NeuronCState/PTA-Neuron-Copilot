# PNC · Feature Terminal

An independent derivative of [LBEILC/RhineLabUI](https://github.com/LBEILC/RhineLabUI), pinned to upstream commit `12cc5e4013acb9408f753ff71de6b8492299b7c8`. This is an independent subpage. The existing PNC homepage remains at the repository root with a top-right link; userscripts are unchanged.

The original TypeScript + Three.js + Vite architecture remains: 5-column / 40-record archive array, camera choreography, vertical extraction, decryption, searchable records, bookmarks, TXT exports, settings, motion preferences and model inspection. PNC/Helper guided routes reuse the same scene and camera, never navigate to a long scrolling landing page.

## Run

`npm ci`, then `npm run dev`. `npm run build` emits `../docs/terminal` using base `/PTA-Neuron-Copilot/terminal/`. `npm test` checks content, attribution, sanitization and local-only behavior. `npm run check:viewport` checks camera/viewport math.

The homepage starts in the archive. Replay the original opening with the footer control; sound and original synthesized music are opt-in. On WebGL-capable browsers the original Three.js engine renders sanitized archive shells. Without WebGL, CSS perspective keeps browsing, search, documentation and guided routes usable; the GPU-only independent 360° viewer is hidden. A compatibility label remains visible. This fallback is not represented as GPU rendering.

## Content and permissions

40 feature records describe PNC 2.1.0 and Helper 1.0.0 using the PNC repository, README and notifications documentation. This is a local demonstration: no PTA access, model calls, pairing, permission requests or system notifications. Users follow the documentation link to install the actual scripts.

Copyright (c) 2026 LBEILC. Upstream author-owned code and generic shell resources are reused under MIT; see LICENSE and public/ATTRIBUTION.txt. Original game marks, fictional names, PV samples, Novecento font/glyph outlines, molded lettering and distinctive ring interiors are excluded. GLBs are compacted so excluded geometry is absent from binary buffer data, not merely hidden. MiSans and Rolling Number retain their separate licenses.

This terminal is published as the public `/PTA-Neuron-Copilot/terminal/` subpage. The original homepage links to it and the terminal links back. `LICENSE` applies to this derivative, not to the repository userscripts. The earlier standalone owner-private Site remains separate.
