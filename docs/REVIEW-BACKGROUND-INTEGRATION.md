# Invisible background review cache (sharded persistence)

## Evidence and access

Public source `kisakiayano/PTA-mcp`, commit `7facea51243ab134ec3352b1a11a472b6a0b175e`, `pta_auto_mcp/pta_tools.py::pull_exam_set`, uses `problem-summaries.summaries[type].total`, then the `exam-problems?problem_type=...` collection and `problemSetProblems`. This is public-client evidence, not a live verification of this user's ended classes. Unknown schema/option formats fail explicitly; totals and unique question IDs must match.

No iframe, visible navigation, new tab, exam creation, submission, credential reading or permission bypass. Native same-origin GET, JSON Accept, no redirects, 2 MiB bounded response stream, 15 second request timeout, minimum 300 ms between starts. All supplied eligible ended sets are attempted once, yielding between batches; there is no 100-set or five-minute whole-task cut-off. Permission failures are item failures, 401/account changes/429 stop the run. Cancellation invalidates readers, late writes and identity proofs. Storage failures stop further downloading rather than allowing memory eviction to hide unsaved results.

Fresh `/exams` verifies `userId`, exam ID, set ID and ended date per set. Identity is rechecked after collection before persistence. Stored owner labels never authenticate. Every body reload requires its own recent matching proof; updates after five minutes refresh that proof without resetting practice state.

## Storage and durability

- `pta-review-index-v2`: metadata only, at most 10,000 entries /2 MiB across accounts. Exceeding that safety boundary explicitly fails, without evicting existing data.
- `pta-review-set-v2-<owner>-<set>-<nonce>`: copy-on-write per-set shards, max4 MiB each. No aggregate 8 MiB cap, no 100-set cap, no 30-day expiry/deletion. Previously cached ended sets remain until explicitly cleared or successfully replaced with the same set's newer contents.
- The runtime keeps at most eight bodies /16 MiB in an LRU. This only evicts memory, not disk. Metadata stays small; body shards are lazy-loaded.
- A successful new shard write is followed by a merged index commit and readback. Only then can its superseded shard be deleted. Quota/index write failures leave the old committed index and old body intact; the failed/unindexed new shard is covered by explicit clear.
- All collaborating tabs' writes/index commits/old-version cleanup and clear share an exclusive `navigator.locks` lock. Commit additionally re-reads/merges and validates the index revision. Without Web Locks, persistence explicitly reports `storage-lock-unavailable` and does not modify old storage; it does not claim unsafe concurrent success. Older script versions that ignore this protocol should not run simultaneously.
- A shared clear epoch prevents already-started old jobs from recreating shards after clear. GM writes cannot be forcibly cancelled: a two-second wait reports `persisted:false`, but the actual queue remains serialized, and clear waits for real in-flight writes before deleting.
- `GM_listValues` is used only to enumerate key names during explicit clear. Only exact review-shard prefixes, the review index and old review key are deleted. No other feature's values, API Keys or credentials are read. The clear-epoch tombstone remains. If a manager asks for the additional grant on upgrade, the user must approve it normally; the script does not bypass that prompt.

Legacy `pta-review-questions-v1` migration occurs only after fresh same-owner verification. Each valid old record becomes a shard; old data is never deleted on failure. The legacy package remains as a recovery backup even after success, until explicit clear, so concurrently running old versions cannot have their newer writes erased by migration. A v2 entry takes precedence over its legacy counterpart. No old-account body is loaded merely because its owner label exists.

## Integrator API

- `await reviewCacheClass(items, onUpdate)`: items `{id,endTime}`. Callback `{id,status,questions?,missingAnswers?,persisted?,persistenceError?,code?}`. Return `{results,stopped,omitted}`. `complete` means complete question content, **not** all answers. If `persisted:false`, the download loop stops with an explicit storage reason.
- `await verifyReviewSet(id)`: starts a fresh verified review session and lazily loads that one set.
- `await loadVerifiedReviewSet(id)` (alias `readVerifiedReviewSet`): lazily loads using a valid in-document proof; stale/missing proof performs normal `/exams` verification without clearing other same-account proofs. Use this in post-collection AI loops, not synchronous `getReviewSet`.
- `getReviewSet(id)`: synchronous access only if that body currently remains in memory and has matching proof.
- `getReviewSetSummary(id)`: synchronous metadata `{id,examId,at,complete,questionCount,missingAnswers,persisted:true}` only with a recent matching proof. Suitable for ring/entry rendering without loading all bodies. Returns null for unknown, expired-proof or unpersisted content.
- `await updateReviewSetAnswers(id,updates)`: updates `{id,answer:Array,answerSource,blankCount?}`; returns persistence boolean. Choice/judge arrays contain indices; fill arrays contain strings and must match the actual DOM `blankCount`. Allowed sources are `accepted-submission`, `binary-verdict-inversion` (only binary judgment) and `ai-generated`. AI never replaces trusted accepted/inverted answers; locked disk merge also preserves a newer trusted answer written by another tab. Programming/function/subjective answers remain null.
- `cancelReviewCache()`: call on pagehide, route/account exit and user stop. Cancels runtime work, not disk.
- `await clearReviewCache()`: explicit user clear. Removes all known namespace shards, including unindexed failed writes, and the legacy backup. May remain pending if the userscript manager never resolves an earlier write; never report deletion before it resolves.

AI callers must also guard their own run/page/account tokens after model awaits. The persistence utility cannot infer which AI request produced an update.

## Verification limits

Tests cover 201 sets, content exceeding 8 MiB, lazy refresh reads, old data beyond 30 days, matching-owner migration, quota preserving all previous data, cross-tab interleaved writers, stale-read cancellation and clear/write races. They are mocked transport/userscript-manager tests, not a real PTA API, browser UI or userscript-manager quota acceptance test.
