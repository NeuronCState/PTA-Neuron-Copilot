# PNC derivative verification

Upstream: LBEILC/RhineLabUI at 12cc5e4013acb9408f753ff71de6b8492299b7c8. Initially verified in an independent checkout. The final integration publishes only the terminal subpath and adds an entry to the preserved homepage; see GITHUB-PAGES.md.

## Passed

- Production TypeScript/Vite build.
- 24 Node tests: 40 TXT exports equal shared data, invalid content/URLs are rejected, provenance is retained, scene/camera remain upstream, PV samples and Novecento glyph assets are not imported, tour is local and interruptible, model primitives exclude branded lettering and distinctive ring motifs.
- Original viewport/camera/render-budget checks and 20,000 loop-navigation moves.
- Sanitized GLB parsing using the actual Three.js GLTFLoader.
- Real cloud Chromium: default URL gracefully enters the labelled CSS perspective fallback when WebGL creation is unavailable.
- Interactive in-browser test harness at 1440×900, 1212×799, 1024×768, 390×844, 375×667, 320×568, and 844×390. At every size: page width/height and controls within viewport; PNC and Helper routes; same world DOM across steps; next/reverse; notes; save/unsave; search returning a single matching record; close and return.
- Manual visual inspection: desktop overview/detail, mobile overview/detail, dark theme, reduced-motion controls. Reduced motion yields the static fallback class. Modal focus isolation is retained.

## Limits

Cloud Chromium reports GL_VENDOR / GL_RENDERER Disabled. Native GPU rendering, original WebGL glass/decryption, 360° model viewer, native FPS and GPU loss/recovery were not visually tested. The build and GLTF parser validate those source/assets but do not replace a hardware browser test. No physical phone, Safari or real PTA/model/Helper notification workflow was tested. The showcase never performs those remote operations.

Performance: generic cassette GLB reduced from 3,564,416 to 617,404 bytes; assembly from 3,342,780 to 581,304 bytes after removing excluded geometry and compacting buffers. Mobile defaults to upstream performance preset. Only opted-in sound is loaded; no automatic service worker. Upstream idle render reuse, pixel budgets, hidden-document checks and resource disposal remain.
