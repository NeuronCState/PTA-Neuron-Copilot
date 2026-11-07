# PTA Neuro Copilot 显示名与兼容升级

本版将面板品牌和日志名称改为 PTA Neuro Copilot，收起时显示 PNC。为了保留 Tampermonkey/Violentmonkey 的既有安装身份，脚本元数据 `@name` 暂保留 `PTA Auto Solver Beta`。这是有意的兼容处理，管理器列表仍可能显示旧名。

以下保持不变：`@namespace`、`@updateURL`、`@downloadURL`、仓库 `.user.js` 文件路径、API Key/设置键 `pta-auto-solver-v1`、GM缓存键 `pta-ai-answer-cache-v2` 和 `pta-catalogue-cache-v1`。不做数据搬运、清除或跨脚本读取。

已有用户发布后优先从原脚本“检查更新”升级，不先卸载。Tampermonkey 维护者说明其更新流程可随下载内容更名，但未在真实管理器验证，不能据此保证其他管理器或手动安装的兼容性。直接修改 name 后安装可能创建新脚本，新的 GM 存储不等于旧脚本存储。因此本版不自动改变管理器身份；如果之后要连管理器名字一起改，需先备份并单独确认迁移路径。

官方依据：[Tampermonkey维护者答复](https://github.com/Tampermonkey/tampermonkey/discussions/1542)、[GM存储API](https://www.tampermonkey.net/documentation.php?locale=en&q=GM_values)。API Key仍用既有同站点配置，本地缓存仍用既有脚本私有存储；不应将备份分享给他人。

启动增加重复面板保护，若页面已有另一个副本的面板，新副本不启动。旧版先运行时仍会显示旧面板，需要在管理器仅启用一份并刷新。未实际执行管理器升级或跨管理器迁移，不宣称这些路径已验收。
