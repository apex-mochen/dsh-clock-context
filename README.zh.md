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

## 设计取舍

回答评审时会问到的问题 —— 为什么是这样写的。

**为什么用 `context()` 而不是 `section()` / `variable()`。**
system-prompt 这个 seam 有三个注册点：`section` 放静态指引，`variable` 放被 `{{name}}` 引用的值
（引用未设置的变量会抛错），`context` 放**动态运行快照**。时钟正是第三种：值会自己变，
而且它属于"每轮的快照"而不是"静态指令"。用 `variable` 还会被迫把这段文字塞进某个 section 里。

**为什么 `text` 是函数而不是字符串。** `text` 是每次组装都会求值的 provider ——
这正是整个插件的机制所在。写成加载时捕获的字符串，就会**冻结在 profile 启动那一刻**，
恰好就是这个插件要解决的那个故障。

**为什么 `order: 105`。** 内置排序位是 `SANDBOX_POLICY = 110`、`APPROVAL_POLICY = 115`、
`SUBAGENT_DELEGATION = 120`。时钟属于"设定背景"的信息，所以默认排最前；该值可配置。

**为什么名字是 `clock:now`。** 同层重名会抛错，所以贡献都要带命名空间前缀，`clock:` 是本插件的前缀。

**为什么 provider 是同步的。** seam 的类型就是 `(context) => string`，不能 await。
这不是我们绕过的限制：读 `Date` 不需要 I/O，本来就没有东西需要预取。

**为什么没有 `Config` schema。** 惯例是用 `schemastery` 声明一个，本插件刻意不这么做，有两个理由：
它运行时**不 import 任何东西** —— 所有选项都可选、与默认值合并，为"九个布尔和字符串"
引入一个运行时依赖（以及潜在的解析失败风险）不划算；而且选项是**每次组装现读**的，
非法值只会退回默认，不会弄坏这一轮。如果市场更希望有显式 schema，那是个小改动、不是重构 ——
说一声就加。

**为什么零依赖。** 这个插件会加载进它所在 profile 的每一个会话。这个位置要求尽可能地小：
一个文件、只用 Node 内置模块、除它之外没有需要审计的东西。

**每轮都变的值会不会把会话撑大？** 不会。`RuntimeContextProjection.project()` 只在渲染文本与
已保留的那份**不同**时才生成候选快照，而且新快照是**取代**旧的、不是追加 —— 快照文本本身就写着
"This snapshot supersedes earlier runtime-context snapshots"。所以一个会话里只有一行时钟，
不是每轮一行。**两种方式都验证过**：读 `dsh-agent-loop` 的投影源码；以及跑一个多轮 headless 任务，
让 agent 数自己上下文里的 `Current date/time:` 行数 —— 它报的就是 **1**。

## 兼容性

- DSH `0.1.x`（peer：`@deepseek-ai/cordis ^4.0.1`）
- Node.js 20+
- **零运行时依赖**，只用 `Intl`

已通过社区运行时验证器 `@qing3a/dsh-plugin-verify` 的实测：它会启动一个 mock-LLM agent 循环、
在每个 hook 上挂审计器，检查 7 条 waterfall 链是否全部存活：

```text
✅ 通过 | 捕获事件: 13 | waterfall: 7/7 | tools/result: 是
```

本插件不注册任何 waterfall 监听器、不贡献工具，所以那些链本来就不该受影响 ——
**这里给的是实测确认，而不是推断**。原始报告在
[`submission/verified/verify-report.json`](./submission/verified/verify-report.json)。

## 和已有插件的关系

如果你已经在用 [`liqiming-whu/dsh-environment-context`](https://github.com/liqiming-whu/dsh-environment-context)，
那可能不需要装这个：它把**实时时间**作为"环境信息大礼包"的一项注入
（还含天气、地点、电量、设备信息），并且带设置页。

本插件是刻意做窄的：

| | dsh-environment-context | dsh-clock-context |
|---|---|---|
| 范围 | 环境大礼包（时间 + 天气 + 地点 + 电量 + 设备） | **只做时间** |
| 前端 | 有设置页（`dsh.client`） | 无 —— 配置写在 profile 的 patch 文件里 |
| 依赖 | — | **零依赖**，实现就是一个文件、只用 `Intl` |
| headless | — | 可用（不依赖 `webServer`） |
| 精度控制 | — | `precision: 'second' \| 'minute'` |

按需选一个即可：想要"时间 + 其它环境信息"，用那个。

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
