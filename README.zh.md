# dsh-clock-context

**给你的 DSH agent 装一块表。**

DSH 每一轮都会往上下文里注入一份 *运行上下文快照*（文件权限策略、审批策略……）。
这个插件往那份快照里**多加一行：当前日期和时间**，而且每次组装都会重新求值 —— 永远不会过期。

```text
Current date/time: Saturday, 09/12/2026, 13:04:27 (Asia/Shanghai, UTC+08:00) · UTC 2026-09-12T05:04:27Z.
Treat this as the authoritative clock: whenever you state or reason about "now", today, the current
date, or how much time has passed, use this value — never infer the current time from earlier
messages, log lines, or file timestamps, and never guess it.
```

## 为什么需要它

**语言模型没有时钟。** 它只能从"碰巧读到的"时间戳里知道时间 —— 工具输出、日志行、文件修改时间。
后果很容易观察：

| 现象 | 真正的原因 |
|---|---|
| 明明是白天，它却说"夜深了/该睡了" | 它最后一次读到的时间来自几小时前的某条日志 |
| 说"大概过了两个小时" | 那是**估算**，但它当成事实说出来了 |
| 跨天的报告里写"今天" | 它从来没有过一个"今天" |

这些不是推理错误，而是**输入缺失**。这个插件补上这个输入，并且最后一句明确告诉 agent
"这个值才是权威的、不许猜"，能显著减少凭空推算。

## 安装

从 GitHub 仓库安装：

```bash
dsh plugin --profile web add github:<owner>/dsh-clock-context
```

从 npm 安装（发布后）：

```bash
dsh plugin --profile web add dsh-clock-context
```

装完后重启 profile（或依赖 `patchReload: live` 热加载），然后按下面的方法验证。

## 配置

所有选项都是可选的，写在 profile 的 `cordis.patch.yml` 里：

```yaml
- id: dsh-clock-context
  config:
    timeZone: Asia/Shanghai   # 任意 IANA 时区；默认跟随宿主
    locale: zh-CN             # 默认跟随宿主
    label: 当前时间            # 默认 "Current date/time"
    includeUtc: true          # 默认 true
    includeEpoch: false       # 默认 false（Unix 秒）
    precision: minute         # 'second'（默认）或 'minute'
    hint: true                # 默认 true（附上"这是权威时钟"那句）
    order: 105                # 默认 105（排在 SANDBOX_POLICY=110 之前）
    enabled: true             # 默认 true
```

| 选项 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `timeZone` | string | 宿主时区 | 渲染本地时间用的 IANA 时区 |
| `locale` | string | 宿主 locale | 传给 `Intl.DateTimeFormat` |
| `label` | string | `Current date/time` | 注入行的前缀 |
| `includeUtc` | boolean | `true` | 是否附上 UTC 时间 |
| `includeEpoch` | boolean | `false` | 是否附上 Unix 秒 |
| `precision` | `'second' \| 'minute'` | `'second'` | 用 `'minute'` 时快照每分钟才变一次 |
| `hint` | boolean | `true` | 是否附上"用这个、别猜"那句 |
| `order` | number | `105` | 在运行上下文快照里的排序位 |
| `enabled` | boolean | `true` | 关掉贡献但不用卸载 |

时区偏移是**每次调用现算**的，所以夏令时切换会自动处理。

> **关于 `precision`。** DSH 只在快照文本**发生变化**时才重新记录，
> 所以秒级精度意味着每轮都会重记一次快照。这个开销很小 ——
> 快照是**末尾的 user 角色消息**，不会让前面已缓存的 KV 前缀失效 ——
> 但如果你希望把开销压到最低，`precision: minute` 可以让文本最多每分钟变一次。

## 怎么验证它生效了

让 agent 读自己的运行上下文：

```text
把你运行上下文里给出当前日期时间的那一行原文引用出来。
```

如果插件生效，回答里会出现 `Current date/time:` 开头的一行，时间与你的钟差几秒内。
如果 agent 说没有这一行，检查：

1. `dsh plugin --profile web ls` —— 包装上了吗？
2. profile 的 `cordis.patch.yml` —— bundle 的 `insert` 条目进去了吗？
3. profile 启动日志 —— 加载失败会在启动时报出来。

## 原理

`lib/index.js` 导出 `name` 与 `apply(ctx, config)`，这是 DSH 插件的标准形状。
插件只注册**一个动态运行上下文贡献**：

```js
ctx.inject(['systemPrompt'], (scope) => {
  scope.systemPrompt.context({
    name: 'clock:now',
    order: options.order,
    text: () => renderClock(options),   // 每次组装都重新求值
  });
});
```

**`text` 是函数而不是字符串** —— 这正是"每轮都是新时间"的关键。
内置的上下文排序位是 `SANDBOX_POLICY=110`、`APPROVAL_POLICY=115`、`SUBAGENT_DELEGATION=120`；
默认的 `105` 让时钟排在最前面。

## 兼容性

- DSH `0.1.x`（peer：`@deepseek-ai/cordis ^4.0.1`）
- Node.js 20+
- **零运行时依赖**，只用 `Intl`

## 安全提示

**安装 DSH 插件等于授予它进程级权限。** 插件被加载进宿主进程，
能读写宿主能读写的一切 —— 它**不受沙箱限制**。

本插件的设计目标是**可审计**，而不是"请相信我"：

- **零依赖**：全部实现就是 `lib/index.js`（约 150 行），只用 Node 内置的 `Intl`。
  `package.json` 里**没有 `dependencies`** 需要审计。
- **不碰进程、文件、网络**：不启动任何东西、不读文件、不写文件、不发请求。
  它只注册一条运行上下文字符串，然后结束。
- **没有定时器**：轮次之间什么都不跑，字符串是在组装上下文时按需渲染的。
- **一口气能读完**：[`lib/index.js`](./lib/index.js)

如果你不想装它，也可以退而求其次：**要求你的 agent 在任何关于当前时间的表述之前先跑一次 `date`。**

## 许可

MIT
