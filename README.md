# PTA Neuron Copilot

**PNC · 2.1.1**：面向[拼题 A（PTA）](https://pintia.cn/) 的 AI 辅助答题脚本，支持多模型、小题并发、解析辅助、班级题集管理与本地缓存。可选安装 **PNC Helper · 1.0.0**，接收题集截止提醒。

[安装 PNC 2.1.1](https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/main/PNC.user.js) · [安装 Helper 1.0.0](https://raw.githubusercontent.com/NeuronCState/PTA-Neuron-Copilot/main/PNC%20Helper.user.js) · [脚本猫发布页](https://scriptcat.org/zh-CN/script-show-page/7287) · [项目主页](https://neuroncstate.github.io/PTA-Neuron-Copilot/) · [使用指南](https://neuroncstate.github.io/PTA-Neuron-Copilot/guide.html) · [反馈问题](https://github.com/NeuronCState/PTA-Neuron-Copilot/issues)

需要 [脚本猫](https://docs.scriptcat.org/) 或 [Tampermonkey](https://www.tampermonkey.net/) 用户脚本管理器。PNC 仅运行于 `https://pintia.cn/*`；Helper 在普通 HTTP/HTTPS 顶层网页运行，以便离开 PTA 后仍能根据缓存检查截止时间。脚本猫发布页由维护者单独更新，请核对页面上的版本号。

## 2.1.1 更新

- 修复填空题中嵌入代码块的输入框被漏识别，支持同题多个空和 textarea，避免误填代码编辑器的搜索框。
- 保持正式版开发者选项隐藏；不改变 Helper、API Key、缓存及配对设置。

## 截止提醒

1. 在 PTA 的 PNC 中读取班级题集，在设置底部启用“倒计时提醒”并选择提前天数。
2. 点击“复制 Helper 配对码”，在 Helper 管理器菜单选择“配对”，粘贴并确认。配对码只包含验证公钥。
3. 在“测试诊断”中确认题集数据可用；可手动请求同步或发送测试通知。“提醒状态”可暂停所有标签的提醒。

每条截止通知对应一个题集，点击打开该题集；每轮最多请求三条，其余留到后续检查。提醒使用最后同步的截止时间，未同步的延期或账号变化不会自动获知。浏览器退出、页面冻结、无可注入的普通网页或系统休眠会停止/延迟检查；系统权限及勿扰设置也可能阻止显示。管理器回报“已请求”不代表实际送达，请勿作为唯一提醒渠道。

通用模式适配篡改猴和脚本猫；离线链路、去重及安全校验测试已通过，实际设备的通知显示、点击和休眠恢复仍需验证。[完整配置与限制](./notifications/README.md)

## 界面

<img src="./screenshots/pnc-class-catalogue-beta20.png" width="420" alt="PTA Neuron Copilot 班级题集：分组、作答进度、分数与剩余天数。">

*用户提供的 beta.20 截图；图中的复习开关在 2.0.0 已隐藏。下方为历史版本界面，可能显示旧名称或控件。*

<p align="center">
  <img src="./screenshots/main-page.png" width="31%" alt="答题面板">
  <img src="./screenshots/dark-mode-main-page.png" width="31%" alt="深色模式">
  <img src="./screenshots/model-settings.png" width="31%" alt="模型设置">
</p>

## 升级与旧版

- 从 Beta 或 2.0.2 升级，请手动打开上方安装链接，核对管理器中的更新对象，不先卸载。只保留一份启用的 PNC 和一份 Helper，更新后刷新 PTA。旧测试分支不会自动切换到正式版。
- 本版不主动清除设置、API Key、题集/答案缓存或配对。主脚本保留原名称与 namespace；不同脚本身份或管理器之间不保证自动迁移。若管理器创建了新副本，请停用旧副本并核对设置；Helper 必要时重新配对。
- 原 `PTA Neuron Copilot-2.0.0.user.js`、`PTA Neuron Copilot-2.0.2.user.js` 及文件名含 `beta.1` 的[兼容入口](./PTA%20Auto%20Solver%20Pro-1.8.1-beta.1.user.js)本次保持 **2.0.2** 内容，不改写；新正式入口为 `PNC.user.js` 和 `PNC Helper.user.js`。
- 旧脚本原样保留：[2.0.0 原版](./legacy/PTA-Neuron-Copilot-2.0.0.user.js) · [1.4.2](./PTA%20Auto%20Solver%20Pro-1.4.2.user.js) · [1.6.0](./PTA%20Auto%20Solver%20Pro-1.6.0.user.js) · [1.8.0](./PTA%20Auto%20Solver%20Pro-1.8.0.user.js) · [beta.20 完整归档](./legacy/PTA-Auto-Solver-Beta-1.8.1-beta.20.user.js)。若固定使用旧归档，请在管理器关闭该条目的自动更新。
- 复习功能与开发者选项仍隐藏，相关后台任务暂停，不删除已有持久缓存。未保存的网页输入和代码不保证刷新恢复；升级后请先在普通练习页检查。

脚本会把题目发送给你选择的模型供应商，并按其要求使用 API Key；Key 保存在本地，缓存使用脚本私有存储，部分操作会使用剪贴板。自动提交会留下真实 PTA 记录，AI 答案可能有误，请遵守课程与平台规则。
