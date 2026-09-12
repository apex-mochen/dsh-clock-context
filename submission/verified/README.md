# Verified 徽章投稿包

第二个目录：[Verified DSH Plugins](https://qing3a.github.io/dsh-plugin-verify/)。
比主市场更严格 —— 硬门槛是**通过官方运行时验证**：

```text
✅ 通过 | 捕获事件: 13 | waterfall: 7/7 | tools/result: 是
```

## 已完成的验证（2026-09-12）

本目录的 `verify-report.json` 就是验证器的原始输出，`pass: true`，`waterfallMissing: []`。

复现命令（需要 DSH **源码 checkout**，且必须已经 install + build）：

```bash
node <验证器>/lib/cli.js <本插件路径> --repo <DSH 源码 checkout> --out <输出目录>
```

验证器做了什么（该报告的三条规则 + 7 条链）：

| 项 | 结果 |
|---|---|
| **R1** 入口形态（无裸 `export default`） | ✅ pass |
| **R2** patch YAML（`!!js` 只在 `config` 子树） | ✅ pass |
| **R3** `tools/result` 语义（无 `UNKNOWN_TOOL`，无 `isError`） | ✅ pass（工具真实执行成功，1 次结果） |
| **7 条 waterfall 链完整** | ✅ 7/7，`waterfallMissing: []` |
| 捕获事件数 | 13 |

> 本插件**不注册任何 waterfall 监听器、不贡献工具**，所以那 7 条链本来就不该受影响 ——
> 现在这一点是被**实测确认**过的，而不是推断。

## 投稿流程

```bash
# 1. 生成投稿包（哈希由脚本计算，不要手改）
node submission/verified/make-submission.mjs --out <目录> --repo-public --topic-set

# 2. 用判定站自己的 gate 自检
cd <dsh-plugin-verify checkout>
node scripts/check-submission.mjs <上一步的目录>

# 3. 自检通过后，把三个文件放进 fork 的 submissions/apex-mochen/dsh-clock-context/
# 4. 提 PR，标题：submission: dsh-clock-context
```

**彩排结果**（本次实测，24 项全绿）：

```text
结果: ✅ 通过 — 可提交 PR
```

## ⚠️ 两个必须先为真才敢断言的字段

`self_check.json` 是对**仓库状态**的声明，所以生成器要求显式传入：

| 字段 | 含义 | 现在 |
|---|---|---|
| `repo_public` | 仓库已公开 | ⏳ 待推送 |
| `topic_dsh_plugin` | 仓库已加 `dsh-plugin` topic | ⏳ 待设置 |

不加这两个 flag 时生成器会把它们写成 `false` —— 这是**仓库推送之前的诚实值**。
推送并设置 topic 之后，再加 flag 重新生成（哈希会随之重算），然后自检、提 PR。

## 分类为什么选「调试与观测」

判定站的分类表只有 7 项：`调试与观测` `桌面与系统` `安全与合规` `效率与监控`
`编码开发` `通讯集成` `娱乐生活`。

本插件贡献的是**每轮的运行上下文快照**，既不是桌面外壳、也不是计费或编码工具。
`调试与观测`（含"会话诊断、运行观测"）是最接近的一项 —— 按判定站的说法，
**分类拿不准时选最接近的，维护者可复核调整**。

> ℹ️ 注意两个市场的分类体系**不一样**：主市场里最接近的同类插件
> （`liqiming-whu/dsh-environment-context`，同样注入实时时间）归在 `tools`，
> 而判定站没有 `tools`，所以这边不能照搬。
