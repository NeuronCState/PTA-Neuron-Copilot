# Original-page local review helper

Exports `startOriginalReview(setId)` and `stopOriginalReview()`. No boot, route, catalogue or ring integration is included in this isolated patch.

- Call start only for explicit review intent after navigation to the normal `/problem-sets/:id/exam/...` page. It freshly calls `verifyReviewSet`, requires `complete`, stops automated solving/assistance, and attaches local controls to matching original numeric-ID cards. `complete` here is question completeness, not all answers known.
- Parent must call stop synchronously on route epoch, logout/account change, pagehide, cache clear and before ordinary auto-solving/assistance. Starting anew after a type route change requires retaining explicit review intent, not starting automatically for all ended pages.
- `start` returns ready/mounted count, incomplete, unavailable, wrong-page or cancelled. A mounted count of zero can mean DOM still loading (polls every 500 ms) or strict content/option mismatch. Parent should expose pending/unmatched status, never silently claim mounted questions.
- Exact normalized statement match uses the existing safe local Markdown renderer against actual DOM text; options also must match. Unrecognized Markdown/HTML/math forms can conservatively fail matching. No arbitrary source HTML is inserted or executed.
- Original selected inputs and result summary are visually hidden while active; their values, checked states, disabled states and event handlers are untouched. Practice inputs are newly created in a per-question section, with only a local comparison button. No official save or submit is clicked. Stop removes local controls and restores original styles.
- Existing accepted/binary-inverted DOM answers enrich the cache through `updateReviewSetAnswers`; fills pass `blankCount` from the actual original DOM. Big questions never read/cache solutions.
- Unknown small questions show an AI supplementation button if `supplementReviewAnswers` exists. It only requests unknown answers, validates returned IDs/status/source, converts letter answers to numeric cached indices, sends observed fill count, and labels AI output as not platform verified. Cancel/route/DOM changes abort and reject late replies. Persistence failure remains explicitly marked.
- `getReviewSet` is not needed directly here. `verifyReviewSet` returns the verified set. `updateReviewSetAnswers` returns a boolean.

Tests: `NODE_PATH=/tmp/pta-dom-test/node_modules PTA_REVIEW_DIAGNOSTIC_DIR=../pta-review-inspect node tests/review-original-ui.cjs`. Private fixture validates 34 original question cards. These are offline DOM tests, not a real PTA browser or model run.

Each mounted panel includes an explicit 退出复习 button. It calls the parent-provided `exitReviewMode()` (which must clear session review intent and stop hub work), falling back to `stopOriginalReview()` only when no integration function exists. This avoids a guard trapping users inside review mode.
