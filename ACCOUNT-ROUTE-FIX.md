# Account/home route and cache preservation

Based on published `75b3203` (2.0.2), independently fetched from current main.

## Reproduced paths

- `/home/account` was absent from `catalogueRoute`, so the UI fell back to answer controls and never exposed the exam-only class pull-down.
- The 500ms lifecycle loop called `clearCatalogueCache()` for every non-`/problem-sets` route. That discarded in-memory progress/snapshot/owner. If a delayed persistent write had not run, its owner guard could then prevent saving the pending change.

## Fix

- Treat `/home` and its child routes as catalogue views. On an actual exam route the answer view and pull-down remain available.
- Serialize pending cache writes before resetting the route view.
- On unrelated navigation invalidate identity proof, not cache contents. Account identity is freshly checked before showing restored data. Auth denial does not expose private cached rows and does not delete saved data.
- No new storage keys, automatic deletions, or bypasses of existing identity/expiry checks. Manual clear remains unchanged.

## Tests

76 offline suites pass. Added actual script-function + DOM route sequence: account boot → exam → account → unrelated → account → full account reload. Tests cover answer/pull relocation, dirty progress flushed before route reset, one identity request on valid cached reload, denied identity retains stored bytes, and successful retry restores the directory.

This is a deterministic simulated navigation sequence, not a live signed-in PTA browser test. Existing cache retention/expiry and storage quota policies have not been changed. Data already lost before this fix cannot be recreated by the patch; normal successful rereading can repopulate it.

## PNC beta integration

Merged the same fix into local `PNC.user.js` (2.1.0-beta.1) without changing Helper, notification authorization, or panel performance behavior. 79 suites pass: 76 target the PNC beta source, 3 check unchanged stable-release identity/update paths. Private fixtures enabled, no skips. This integration is scoped to the beta test branch; Helper and the stable main branch are unchanged.
