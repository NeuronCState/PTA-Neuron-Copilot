# 缺失复习答案的 AI 补全 helper

本补丁只有独立 helper 和测试，无界面、SPA、后台缓存或原题填写改动。入口：

```js
const results = await supplementReviewAnswers(questions, {
  signal: controller.signal,
  isCurrent: () => routeGeneration === generation && !controller.signal.aborted,
  concurrency: 1,
  onUpdate: result => { /* 安全显示本题状态；不得覆盖已有答案 */ }
});
```

## 输入

每题 `{ id, type, content, choices?, blankCount?, answer: null, answerSource: 'unknown' }`。

- `id`：非空字符串或安全整数，批内唯一。
- `type`：支持规范名称 `judge/choice/multi_choice/fill`，数字/字符串 `1/2/3/4`，及枚举 `TRUE_OR_FALSE/MULTIPLE_CHOICE/MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER/FILL_IN_THE_BLANK`。其他题型明确拒绝。
- `content`：真实题干字符串，1–50000 字符。不得用页面登录提示/加载占位作为题干。
- `choices`：2–26 个有序字符串，或 `{label?, text}` / `{label?, content}`。省略 label 时按原数组顺序 A/B/...；显式 label 必须是唯一大写 A–Z。若原数据顺序不可靠，调用前应标为未知而非猜测。若 text/content 同时存在但不一致，拒绝。
- 判断题同样需要真实选项及真实顺序，不假定 T 在 F 前；模型返回原选项字母。
- 填空题必须有真实 `blankCount`（1–50），可由原题对应输入框可靠获得，不能由题干猜测；没有明确空数不发请求。
- 只有严格 `answer === null && answerSource === 'unknown'` 可补全。已有任意答案，或 accepted/inverted/manual/platform/ai-generated 等其他来源，均跳过。

最多请求前 50 题，超出部分分别返回 failed。默认串行；并发限制 1–10。请明确由用户触发，不在载入界面时调用。

## 输出与来源

每题 `{ questionId, status, answer, answerSource, message }`；status 为 `pending/generating/generated/failed/skipped/stale/cancelled`。成功额外带：

```js
{
  answer: ['A'], // 多选每字母一项；填空按空序号每字符串一项
  answerSource: 'ai-generated',
  label: 'AI 生成（非官方答案）',
  explanation: '中文解析',
  model: {provider: 'deepseek', model: '实际模型名称'}
}
```

结果不含 API Key、请求 URL 或供应商原始错误。模型回复必须是严格 JSON `{answer: string[] | null, explanation: string}`，不接受代码围栏、额外字段、未知/重复选项、单选多选项、错误空数或 unknown 占位填空。`answer:null` 保持未知并给出失败说明。不宣称生成结果正确或官方。

helper **从不修改输入对象、持久化、填写、保存、提交**。调用者若写入缓存/原页复习视图，必须再次核对当前 job/页面/题目 id 以及最新 `answer===null && answerSource==='unknown'`，仅以 ai-generated 来源保存；不得将生成结果改称官方或覆盖任何后来取得的答案。

onUpdate 为每题当前状态提供浅拷贝（answer/model 也复制）；处理器异常不会中断队列。取消/全局失效后不会回调旧 UI，最终结果仍标 cancelled。即便之前有个别结果完成，调用者应用整批返回时仍需检查 job 是否当前。

## 取消与安全边界

- 独立 AbortController 转发调用者 signal，不复用自动答题控制器。
- 请求前后校验 job、模型配置和原题快照/来源，题干/空数/选项变化或取得平台答案时丢弃回复。
- `isCurrent` 本身只阻止发布和后续请求；要立即中止在途请求，请在切页/取消时 abort 传入的 controller。
- 沿用当前 provider/model/maxTokens/thinking，模型配置中途变化后不再派发请求。无图片/隐私历史/学生作答采集；只有题目白名单字段传模型。
- 答案和解析是**不可信惰性文本数据**。UI 使用 textContent 或既有安全 Markdown/MathML renderer，不能直接 innerHTML。填空正确内容本身可能含 HTML 或代码，helper 不执行也不擅自篡改。

## 验证

`node tests/review-ai-supplement.cjs` 使用 mock requestAI，覆盖受保护来源、严格 JSON、choice/multi/judge/fill、枚举、无可靠空数、批量/并发限制、取消/过期/配置与答案来源更改、回调取消、供应商错误脱敏、无修改/提交。没有真实模型或 PTA 请求。

全套回归需要现有 DOM 测试依赖，例如设置 `NODE_PATH=/tmp/pta-render-test/node_modules:/tmp/pta-dom-test/node_modules` 与 `PTA_DOM_MODULE=/tmp/pta-dom-test/node_modules/linkedom`。
