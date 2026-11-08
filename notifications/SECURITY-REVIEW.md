# 修订后的安全边界

旧自动页面桥已删除。手动 UUID 绑定使主脚本和后台通过脚本猫 GM 存储直接通信，无网页消息授权，不迁移主脚本身份。用户在管理器侧手动绑定，授权范围包括整个主脚本 GM 空间；代码自限五键不是能力隔离。

已处理：超过500条（上限10000并报错暂停）、后台快照ID回执、通知失败最多5次退避重试、唯一控制ID取当前存储值而非毫秒排序、确证注销/账号变化撤销、后台串行重入保护。真实主模块→GM→后台模拟覆盖这些场景。

剩余验收/限制：真实脚本猫UUID绑定界面及版本、OS权限、关闭全部PTA标签后执行、重启恢复尚未实测；仅支持一份后台脚本，多副本无事务锁；离线期间无法获知外部注销/延期；通知已开始无法撤回，崩溃边界可能重试重复；辅助自动更新可能覆盖用户UUID编辑。未经实机验收不应称功能完成，更不能声称只授予了提醒键权限。

回归：77个测试文件通过（74个定向beta源码，3个稳定发布身份/更新路径检查原稳定文件），私有fixtures启用，无跳过。提醒测试验证嵌入主脚本的同一模块，经共享GM模拟到后台；所有脚本语法检查通过。未进行真实系统通知或真实浏览器运行验证。

复审补丁：真实 `catalogueCacheOwner` 身份验证入口立即观察授权账号，同步函数在目录缺失/不完整判断之前撤销旧账号；链测试覆盖 null/partial 目录及实际入口。发送前要求快照 ID 与当前批次一致，主模块在后台预约后发布延期快照时取消旧请求并回滚预约；测试确认不发送旧通知、不消耗重试。77套回归通过，仍不替代真实脚本猫验收。

## Unpublished universal candidate (beta.2)

This extends, rather than supersedes, the historical ScriptCat review above.
Default Helper now uses its own GM store. One-time, extension-editor public-key pairing pins a P-256 verification key; the main private key remains in main GM storage. Only PTA receives signed configuration through its page message channel. Other matched sites have neither a message receiver nor DOM/network integration. Public pairing never authorizes reading unrelated sites. Signature sequence allocation uses same-origin Web Locks and received writes use the Helper's per-script tab lock. No automatic key discovery or unsigned configuration is accepted.

Cross-origin coordination uses manager `GM_getTabs`/`GM_saveTab` records and a no-lease-stealing bakery lock. This relies on manager record visibility, closed-tab cleanup, and one top-frame Helper instance per tab. A frozen holder may delay all reminders. Simulated mutual exclusion is not a proof of either manager implementation or browser lifecycle. Live manager, sandbox isolation, OS notifications, and freezing tests remain mandatory before claiming full compatibility.

Notification outcome is at-most-one request for unknown outcomes, not exactly-once delivery. A crash after reservation can lose a notification. Main-to-Helper messages can be blocked by PTA, and disabling from main does not immediately revoke a Helper snapshot if synchronization fails; the extension menu offers direct Helper pause. Old snapshots cannot know subsequent account/logout or server deadline changes without PTA synchronization.

Optional ScriptCat background mode still has whole-main-GM access via manual `@storageName`. It is an alternative, not a second parallel installation; it does not inherit the default mode's storage isolation. No real manager/OS tests were run for this candidate; all current verification uses actual modules in mocked API harnesses.

### Lifecycle correction

`pagehide` marks the document disposed, then issues one immediate zero-ticket `GM_saveTab` teardown write only if that instance previously registered. It deliberately bypasses the normal alive guard; every ordinary read/write continuation remains disabled. This fixes the definite residual-lock bug where `finally` cleanup itself was rejected after `pagehide`. The new lifecycle harness covers a suspended critical section, suspended acquisition, navigation with no replacement script, and asynchronously queued FIFO tab writes. Received packet age is rechecked after acquiring the lock.

This depends on the manager preserving write invocation order for a tab. A manager that applies an earlier nonzero write after the later teardown can still strand a lock; per-tab FIFO and teardown delivery must be verified in both real managers. The available APIs provide no cross-origin compare-and-swap or cancellation of an already-issued write, so arbitrary reordered/lost IPC cannot be made reliable by this patch.
