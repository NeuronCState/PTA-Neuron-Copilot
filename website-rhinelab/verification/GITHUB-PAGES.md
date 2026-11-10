# GitHub Pages integration verification

Date: 2026-11-10.

## Deployment scope

- Existing homepage: https://neuroncstate.github.io/PTA-Neuron-Copilot/
- Separate feature terminal: https://neuroncstate.github.io/PTA-Neuron-Copilot/terminal/
- The original homepage remains the default. Its top-right “3D 终端” entry opens the terminal; the terminal has a return-home link.
- Original homepage uses native document scrolling instead of the previous two-axis snap/page-packing controller. Existing preview tabs, disclosures, theme, install links, continuous-camera workflow scenes and controls remain.
- Source locations: `website/` for the homepage, `website-rhinelab/` for the terminal. Generated output: `docs/` and `docs/terminal/` respectively.
- No userscript is changed. All ten tracked `*.user.js` files were compared byte-for-byte against the baseline.

## Reproducible checks

Homepage: `cd website && npm ci && npm test && npm run build`.
Terminal: `cd website-rhinelab && npm ci && npm test && npm run check:viewport && npm run build`.

Both builds and test suites pass. Terminal has 24 content/behavior/provenance checks, viewport/camera budget checks and 20,000 loop moves. Native homepage has DOM, visibility and continuous-camera tests.

Browser validation uses production files under the exact `/PTA-Neuron-Copilot/` prefix. The development-only `website/native-qa.html` harness ran 140 checks with zero failures across 1440×900, 1024×768, 390×844, 320×568, 844×390, and 390/320-wide layouts with 200% base type. Checks include content flow and overflow, visible entry, preview tabs, answer disclosure, uncancelled wheel/touch, stable arbitrary scroll, native anchor/back, persistent workflow canvas, details/focus return and reversible notification preview.

A physical browser scroll settled at 240px and stayed there, with `scroll-snap-type: none`. Manual checks confirmed the preserved homepage appearance, top-right entry, terminal PNC route/next step, and return-home navigation. Terminal deployment URLs for bundles, archives, fonts, icons, manifest, attribution and models use the dedicated subpath.

The cloud browser has no WebGL renderer. Terminal browser interaction validation therefore used its labelled CSS perspective fallback, not native GPU rendering. GPU rendering, 360° model inspection and hardware performance still need a hardware browser. No real PTA, model-provider or notification operation is performed by either showcase.

## License and rollback

Terminal source derives from LBEILC/RhineLabUI commit `12cc5e4013acb9408f753ff71de6b8492299b7c8`. Its MIT copyright/license and relevant font/dependency notices remain within the terminal subtree. This does not relicense PNC or its userscripts. Excluded game marks, PV samples, Novecento assets and distinctive baked model geometry are removed.

Baseline before this integration: `8bf1f623d29f14181e88d6feab2770c8748f7ace`. Git history retains the previous homepage and generated assets. To roll back this change, revert the integration commit normally and let GitHub Pages rebuild. Do not force-push or revert unrelated later changes.
