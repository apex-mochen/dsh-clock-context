# 上架指南（Publishing / Submission）

本文列出把 `dsh-clock-context` 上架到 DSH 插件市场所需的**全部步骤与文件内容**。
面向未来的自己：照着做即可，不需要重新调研。

---

## 0. 上架前自检清单（对照市场收录硬门槛）
| 门槛 | 状态 | 说明 |
|---|---|---|
| `package.json` 声明 **`dsh.bundle`** manifest | ✅ | `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`。**这是最常见的被拒原因**——只声明 `dsh.client` 无法安装 |
| 仓库有真实可用代码 | ✅ | `lib/index.js`（含时区计算与配置）+ `test/smoke.mjs`（7 项断言） |
| 仓库创建满 **1 天** | ⏳ | **由市场 CI 自动检查**，用来过滤"PR 前几分钟才建好"的仓库。建完仓库要等一天 |
| 仓库加 **`dsh-plugin`** topic | ⏳ | GitHub 仓库设置里加（Settings → Topics） |
| 项目处于活跃维护 | ✅ | 有测试、有 README，后续可继续迭代 |
| 描述只讲功能、无营销词，且**与代码相符** | ✅ | 见下方 description；市场会**对照代码核对**，夸大是打回主因 |
| 许可证 | ✅ | MIT |

---

## 1. 主市场：awesome-dsh-plugin（推荐先做）

**投稿方式**：向 `github.com/awesome-dsh-plugin/awesome-dsh-plugin` 提一个 PR，
**只新增一个文件**（不编辑自动生成的 README）：

```text
data/plugins/apex-mochen__dsh-clock-context.yml
```

文件名格式是 `<GitHub 用户名>__<仓库名>.yml`（双下划线）。
本插件的用户名是 **apex-mochen**、仓库是 **dsh-clock-context**，所以文件名如上。

### 文件内容（可直接复制）

```yaml
url: https://github.com/apex-mochen/dsh-clock-context
name: apex-mochen/dsh-clock-context
category: session
description:
  en: Injects the current date and time into the runtime context on every turn, so the agent can read the time instead of inferring it.
  zh: 每一轮把当前日期时间注入运行上下文，让 agent 能读到准确时间而不是靠推算。
```

> - `url` **必须与仓库地址完全一致**。
> - `category` 取值必须是官方列表之一：`agi` `ui` `usage` `theme` `model` `identity` `session` `memory` `tools` `wsl` `browser` `vision` `voice` `docs` `skill` `workflow` `git` `notify` `dev` `security` `remote` `market` `fun`。
> - 两版 README 由 `data/plugins/*.yml` **自动生成**，不要手工编辑。
> - 一个插件一个文件，所以 PR 之间永不冲突。

**为什么选 `session`**：本插件贡献的是**每一轮的运行上下文快照**（会话级别），
不是 UI、不是工具、也不是模型接入，`session`（Sessions & Messages）最贴近。

### PR 之后

合并后市场会自动重建索引，你的插件出现在：
`https://awesome-dsh-plugin.com/p/apex-mochen/dsh-clock-context/`

安装方式随之变为：

```bash
dsh plugin --profile web add github:apex-mochen/dsh-clock-context
```

---

## 2. 可选：Verified 徽章站（dsh-plugin-verify）

这是一个更严格的目录，硬门槛是**通过运行时验证**：

```text
✅ 通过 | waterfall: 7/7 | tools/result: 是
```

验证器：`@qing3a/dsh-plugin-verify`（npm）

```bash
node <验证器>/lib/cli.js <插件路径> --repo <DSH 源码 checkout>
```

**它的前置要求（实测确认）**：`--repo` 必须指向 **DSH 源码 monorepo**
（`preflight` 会检查 `pnpm-workspace.yaml` 是否存在，并用 `pnpm dsh ...` 调用），
**npm 安装版（`node_modules/@deepseek-ai/dsh`）不满足**，会报
`不是 DSH checkout: ...（缺 pnpm-workspace.yaml）`。

验证器会做这些事（读源码得到）：
1. 静态规则 R1（入口形态）/ R2（patch YAML 的 `!!js` 位置）
2. 把插件 `link:` 进 **headless** profile
3. 启动 **mock-llm**，用 `--patch` 注入 `verify-auditor`
4. 跑 headless agent，检查 **7 条 waterfall 链**是否完整：
   `system-prompt/assemble` · `agent/pre-step` · `agent/request` · `llm/stream` ·
   `tools/pre-execute` · `tools/execute` · `tools/post-execute`
5. 输出报告，退出码 `0=通过 / 1=未通过 / 2=环境错误`

**结论**：要拿 Verified 徽章，需要先克隆 DSH 源码仓库（体积较大）。
本插件不注册任何 waterfall 监听器，也不注入独有服务，预期可过，
但**尚未实测**——等真的需要徽章时再克隆源码跑一次。

静态规则本地可先跑（秒出，无需 checkout）：

```bash
node <验证器>/scripts/static-rules.mjs .
```

本插件实测结果：

```text
✓ R1-entry-shape: 入口 lib/index.js：namespace 形式 ✓ 且无裸 export default
✓ R2-patch-yaml: patch ./cordis.patch.yml：!!js 表达式均位于 config 子树（12 行）
静态规则：全过
```

---

## 3. 可选：发布到 npm

市场同时支持 npm 安装（`npm: "包名"`）。发布后可让用户直接：

```bash
dsh plugin --profile web add dsh-clock-context
```

```bash
npm publish            # 需要 npm 账号，且包名未被占用
```

`package.json` 已配置 `publishConfig.registry` 与 `files` 白名单，
`prepack` 未定义构建步骤（本插件是纯 ESM 源码，无需构建）。

---

## 4. 发布前还需要补的元数据

- [ ] `package.json` 的 `repository` / `homepage` 字段（建完 GitHub 仓库后填）
- [ ] `LICENSE` 里的版权人（当前是 `dsh-clock-context contributors`，可改成自己的名字）
- [ ] 仓库添加 `dsh-plugin` topic
- [ ] 建仓库后等待满 1 天再提 PR

---

## 5. 一次完整的发布流程（顺序执行）

```bash
# 1. 本仓库已经是 git 仓库，先确认干净
git status

# 2. 在 GitHub 网页新建空仓库 dsh-clock-context（public，不要勾选 README）
# 3. 关联并推送
git remote add origin https://github.com/apex-mochen/dsh-clock-context.git
git branch -M main
git push -u origin main

# 4. 在仓库 Settings → Topics 添加：dsh-plugin
# 5. 等满 1 天（市场 CI 硬性检查）
# 6. Fork awesome-dsh-plugin/awesome-dsh-plugin
# 7. 在其 data/plugins/ 下新增 apex-mochen__dsh-clock-context.yml（内容见 §1）
# 8. 提 PR，标题：add dsh-clock-context
```

---

## 6. 自审记录（对照社区《DSH 插件开发与设计规范建议 v0.1》）

来源：`dsh-plugin-verify` 仓库 `docs/plugin-standards.md` + `docs/review-checklist.md`
（官方 postmortem 0001/0002 与 defensive-patterns 提炼，非官方规范但审核员照此复核）。

### 6.1 逐条核对

| 规范条款 | 要求 | 本插件 | 证据 |
|---|---|---|---|
| §2.1 包结构 | `name`/`type`/`main`/`files`/`dsh.bundle.patch` | ✅ | `package.json`；另补了 `types` → `lib/index.d.ts` |
| §2.2 入口红线 R1 | namespace 形式，禁**裸** `export default` | ✅ | `export const name` + `export function apply`；`export default` 是**对象**（规则允许的形式）。静态规则实测通过 |
| §2.3 ESM 纪律 | 相对 import 带 `.js`；cordis 不入 `dependencies` | ✅ | 无相对 import；cordis 只在 `peerDependencies`（与已上架插件 `dshmarket` 同款），无 `dependencies` |
| §3.2 patch 红线 R2 | `!!js` 只在 `config` 子树 | ✅ | patch 内**没有** `!!js`；静态规则实测通过 |
| §3.3 条件启用 | 用 overlay，不用 `disabled: !!js` | ✅ | 未使用 `disabled` |
| §4.1 资源释放 | 监听/定时器用 `ctx.effect` 包裹 | ✅ | 无定时器、无子进程；贡献由 `systemPrompt.context()` 返回的 disposer 随卸载清理 |
| §4.2 服务注入 | 可选服务用 `ctx.inject` 动态注入 | ✅ | 用 `ctx.inject(['systemPrompt'], cb)`（与官方 `dsh-sandbox-policy` 同款）；避免 headless 加载树阻塞 |
| §5 waterfall | 监听器必须透传 `next()` | ✅ N/A | 本插件**不注册任何 waterfall 监听器**，只贡献一条上下文文本 |
| §6.5 system-prompt 注入 | 同步 provider；命名加前缀防重名 | ✅ | `text: () => string` 同步签名；名字 `clock:now` 带前缀 |
| §6.5 `context()` 语义 | 动态快照，"变化才记录" | ✅ | 提供 `precision: 'second' \| 'minute'` 让运维在信息量与快照 churn 之间取舍 |
| §8.1 npm 约定 | `files` 含 `lib` + `cordis.patch.yml`；keywords 带 `dsh`/`deepseek-harness`/`dsh-plugin` | ✅ | `npm pack --dry-run` 实测 9 个文件，无多余内容 |
| §8.2 GitHub 约定 | `dsh-plugin` topic；`repository` 字段；README 写安装命令 + **安全提示** | ✅（topic 待加） | READMEs 均有安装命令与"安装授予进程级权限"章节 |
| §8.3 patch 路径 | `insert: [{id, name}]`；仓库内安全相对路径 | ✅ | `./cordis.patch.yml` |

### 6.2 人类评审层 7 条（defensive-patterns）结论

`docs/review-checklist.md` 的 A–I 九组中，与本插件相关的只有 A/B 两组，其余（C 结果上报、
D 双端契约、E 异步状态、F 资源释放、G 回调隔离、H 输出卫生、I link 路径）**全部 N/A**，
因为本插件不产出结果、不持有异步状态、不 spawn 进程、不写临时文件、不删除路径。

- A 组：无裸 `export default` ✅；default 对象自带 `name`/`apply` ✅；未对非 inject 服务调用 `ctx.get` ✅
- B 组：无 `!!js` ✅；无条件 `disabled` ✅；不注册工具（R3 不适用）✅

### 6.3 已完成的验证证据

| 验证 | 命令 | 结果 |
|---|---|---|
| 单元测试（含夏令时、precision） | `node test/smoke.mjs` | **8 checks passed** |
| 官方静态规则 R1/R2 | `node scripts/static-rules.mjs .` | **静态规则：全过** |
| 发布产物装箱 | `npm pack --dry-run` | 9 个文件 / 14.1 kB，无多余文件 |
| tarball 安装 → 组装树 | `dsh plugin --profile headless add <tgz>` | 树中出现 `dsh-clock-context` ✅ |
| **运行时端到端** | headless agent 复述上下文时间行 | 与对照组**相差 2 秒** ✅ |
| web profile 层叠组装 | `dsh --profile web --patch <probe> --dump-config` | 干净插入，**真实 profile 未被改动** ✅ |
| 未通过项 | `@qing3a/dsh-plugin-verify` 完整运行时验证 | ⏳ 未跑（需要 DSH **源码** checkout，见 §2） |

