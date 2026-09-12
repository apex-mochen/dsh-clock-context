# 上架指南（Publishing / Submission）

> ## 📌 当前进度（2026-09-12）
>
> | 步骤 | 状态 |
> |---|---|
> | 仓库公开 + `dsh-plugin` topic + 描述 | ✅ https://github.com/apex-mochen/dsh-clock-context |
> | **Verified 站投稿 PR** | ✅ **已提交** → https://github.com/qing3a/dsh-plugin-verify/pull/4 |
> | **主市场投稿分支** | ✅ **已备好**（fork `apex-mochen/awesome-dsh-plugin`，分支 `add-dsh-clock-context`，文件已提交） |
> | **主市场投稿 PR** | ⏳ **等仓库满 1 天**（2026-09-13 05:46 UTC / 本地 13:46）后开 |
> | web profile 生效 | ⏳ 待重启 DSH Web |
>
> **开主市场 PR 的直达链接**（过了时间门槛点它即可）：
>
> ```
> https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare/main...apex-mochen:add-dsh-clock-context?expand=1
> ```
>
> 或者点 fork 页面顶部 GitHub 提示的 **Compare & pull request**。
> 标题：`add dsh-clock-context`；正文用 `submission/PR-BODY.md`。
>
> ⚠️ **为什么不能现在就开**：主市场 CI 的 `scripts/check-submission.mjs` 里有
> `MIN_AGE_DAYS = 1`（注释原文 "time cannot be counterfeited"），
> 仓库 2026-09-12 05:46:52 UTC 创建，**未满 1 天的 PR 会被自动检查判失败**。
> 市场自己的 contributing.md 也写了 "If you're just under the bar, finish the work and resubmit"。
> 所以先备好分支、到点再开 PR —— 这样第一次提交就是绿的。

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
category: tools
description:
  en: Injects the current date and time into the runtime context on every turn, so the agent can read the time instead of inferring it.
  zh: 每一轮把当前日期时间注入运行上下文，让 agent 能读到准确时间而不是靠推算。
```

> - `url` **必须与仓库地址完全一致**（`slugFor(url)` 必须等于文件名）。
> - `category` 取值必须是官方列表之一：`agi` `ui` `usage` `theme` `model` `identity` `session` `memory` `tools` `wsl` `browser` `vision` `voice` `docs` `skill` `workflow` `git` `notify` `dev` `security` `remote` `market` `fun`。
> - **不允许出现未知字段**：条目只接受 `url` / `name` / `category` / `description` / `tarball` 五个键（npm 包由工具自动从仓库解析，不在条目里声明）。
> - 描述里若含 `": "`（冒号加空格）**必须加引号**，否则整个文件会被解析成映射而报 YAML 错。
> - 每条描述必须是**单行**；`description.en` 必填，`zh` 可选（维护者会补）。
> - 两版 README 由 `data/plugins/*.yml` **自动生成**，不要手工编辑。
> - 一个插件一个文件，所以 PR 之间永不冲突。

**为什么选 `tools`**：先按"最接近的同类插件"定，而不是按自己的直觉。
市场上直接注入**实时时间**的插件是 `liqiming-whu/dsh-environment-context`
（"Injects live time, weather, location, battery, and device context into the DSH system prompt"），
它归在 **`tools`** 类。同类归同类，所以本插件也放 `tools`。

> ℹ️ **修正一条早期判断**：曾一度认为市场上没有做时间注入的插件 —— 那是错的，
> 当时只按插件名和部分描述关键词检索。上面的 `dsh-environment-context` 就在做这件事，
> 只是它把时间作为"环境上下文"大礼包的一部分（还带天气/电量/设置页）。
> 本插件的差异点是：**只做时间、零依赖、无前端、headless 可用、配置走 patch 文件**。
> 这不影响收录（市场不要求首创），但**PR 描述里不能声称"没有同类"**。

### 用官方校验器本地验一遍（推荐）

市场的 CI 用 `scripts/check-submission.mjs` 检查投稿，它依赖 `GITHUB_TOKEN` 才能跑全量，
但真正决定格式成败的是 `scripts/lib/entries.mjs` 里的 `readEntries` + `validateEntries`，
这两个函数可以**直接在本地复用**：

```js
// 在市场仓库根目录放 validate-ours.mjs，然后：
import { readEntries, validateEntries, slugFor, CAT_IDS, dumpEntry } from './scripts/lib/entries.mjs'
const entries = readEntries(process.argv[2])
console.log(validateEntries(entries))   // 空数组 = 全过
```

本插件的实测结果：

```text
读取到条目数: 1
  url      : https://github.com/apex-mochen/dsh-clock-context
  category : tools （在 CAT_IDS 中: true）
  期望文件名: apex-mochen__dsh-clock-context.yml
  实际文件名: apex-mochen__dsh-clock-context.yml
VALIDATION: PASS  （官方校验器 0 个问题）
```

更进一步：官方 `dumpEntry()` 规范化输出的内容与手写的 yml **逐字节一致**，
说明这份投稿文件与市场工具链自己生成的格式完全相同。

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

**它的前置要求（实测确认，共三条）**：

1. `--repo` 必须指向 **DSH 源码 monorepo** —— `preflight` 会检查 `pnpm-workspace.yaml`；
   npm 安装版（`node_modules/@deepseek-ai/dsh`）**不满足**，会报
   `不是 DSH checkout: ...（缺 pnpm-workspace.yaml）`。
2. `pnpm` 可用（`preflight` 会跑 `pnpm --version`；DSH 锁 `pnpm@11.7.0`）。
3. **仓库必须已经构建过** —— `preflight` 会检查这两个产物是否存在，缺失就报
   `DSH 尚未构建：请先运行 pnpm run build:lib:host && pnpm run build:lib:client`：
   ```text
   packages/boot/app-boot/lib/index.js
   packages/interaction/commands/lib/typert.host.js
   ```

**因此完整路径是 3 步**（实测耗时基线，2026-09-12）：

```bash
git clone --depth 1 https://github.com/deepseek-ai/deepseek-harness.git   # 68 MB / 18 秒
cd deepseek-harness
pnpm install --frozen-lockfile        # 291 个 workspace 项目 / 1262 个包 ← 最耗时的一步
pnpm run build:lib:host && pnpm run build:lib:client                      # tsc -b + tsdown
node <验证器>/lib/cli.js <插件路径> --repo <本 checkout>                   # 才是真正的验证
```

> ⚠️ **成本提示**：这不是"秒出"的检查。`pnpm install` 要拉 1262 个包
> （走代理时部分 tarball 只有 26~36 KiB/s），之后还要跑一遍全量 TypeScript 构建。
> **建议在不需要用机器的时候做**，或者只在确实想要 Verified 徽章时再做。
> 主市场（awesome-dsh-plugin）**不需要**这一步。

验证器会做这些事（读源码得到）：
1. 静态规则 R1（入口形态）/ R2（patch YAML 的 `!!js` 位置）
2. 把插件 `link:` 进 **headless** profile
3. 启动 **mock-llm**，用 `--patch` 注入 `verify-auditor`
4. 跑 headless agent，检查 **7 条 waterfall 链**是否完整：
   `system-prompt/assemble` · `agent/pre-step` · `agent/request` · `llm/stream` ·
   `tools/pre-execute` · `tools/execute` · `tools/post-execute`
5. 输出报告，退出码 `0=通过 / 1=未通过 / 2=环境错误`

**预期**：本插件不注册任何 waterfall 监听器、不贡献工具、不注入独有服务，
所以那 7 条链**不应该受影响**。

### 2.1 实测结果：✅ 通过（2026-09-12）

```text
✓ R1-entry-shape: 入口 lib/index.js：namespace 形式 ✓ 且无裸 export default
✓ R2-patch-yaml: patch ./cordis.patch.yml：!!js 表达式均位于 config 子树（12 行）
[1/5] 前置检查 DSH checkout
[2/5] 安装插件 + verify-auditor 到 headless profile
[3/5] 启动 mock-llm (port 8000)
[4/5] 跑 headless agent（verify-auditor 监听 waterfall 链）
[5/5] 分析事件审计

✅ 通过 | 捕获事件: 13 | waterfall: 7/7 | tools/result: 是
验证器退出码: 0
```

报告全文（也是 Verified 投稿的核心证据）保存在
`submission/verified/verify-report.json`：

```json
{
  "pass": true,
  "waterfallFound": ["system-prompt/assemble", "agent/pre-step", "agent/request",
                     "llm/stream", "tools/pre-execute", "tools/execute", "tools/post-execute"],
  "waterfallMissing": [],
  "rules": [
    { "name": "R1-entry-shape", "pass": true },
    { "name": "R2-patch-yaml", "pass": true },
    { "name": "R3-tools-result", "pass": true, "detail": "工具真实执行成功（1 次结果，无 isError）" }
  ],
  "detail": "捕获事件: 13 | waterfall: 7/7 | tools/result: 是"
}
```

### 2.2 Verified 投稿包

投稿规格与主市场不同，它要三个文件：`manifest.json` · `self_check.json` · `verify-report.json`，
且 gate 会**重算 SHA-256**，所以不能手写。本仓库提供了生成器：

```bash
node submission/verified/make-submission.mjs --out <目录> --repo-public --topic-set
cd <dsh-plugin-verify checkout>
node scripts/check-submission.mjs <上一步的目录>
```

**本机彩排结果（用判定站自己的 gate，24 项全绿）**：

```text
结果: ✅ 通过 — 可提交 PR
```

⚠️ `--repo-public` / `--topic-set` 是对**仓库状态**的断言，必须显式传入：
不加时生成器把它们写成 `false`（仓库推送前的诚实值）。详见 `submission/verified/README.md`。

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
| 单元测试（含夏令时、precision、打包契约、BOM 守卫） | `node test/smoke.mjs` | **12 checks passed** |
| 官方静态规则 R1/R2 | `node scripts/static-rules.mjs .` | **静态规则：全过** |
| 官方条目格式校验 | 市场仓库的 `readEntries` + `validateEntries` | **0 个问题**，`dumpEntry()` 逐字节一致 ✅ |
| 发布产物装箱 | `npm pack --dry-run` | 10 个文件 / 20.4 kB，无多余文件 |
| tarball 安装 → 组装树 | `dsh plugin --profile headless add <tgz>` | 树中出现 `dsh-clock-context` ✅ |
| **运行时端到端** | headless agent 复述上下文时间行 | 与对照组**相差 2 秒** ✅ |
| web profile 层叠组装 | `dsh --profile web --patch <probe> --dump-config` | 干净插入，**真实 profile 未被改动** ✅ |
| **配置链路（本轮补的缺口）** | id 定位 patch 覆盖 6 个选项后跑 headless | **6/6 全部生效**，epoch 数值精确吻合 ✅ 见 §6.4 |
| **关闭开关（反向验证）** | `enabled: false` 后跑 headless | agent 回答「没有」；其推理显示上下文里只有 file policy / approval policy ✅ |
| 卸载回滚 | `dsh plugin --profile headless remove` | bundles 与 dependencies 均干净移除，装回一条命令 ✅ |
| **快照是否累积**（每轮变化的最大隐患） | 读 `dsh-agent-loop` 的 `RuntimeContextProjection` + 多轮 headless 让 agent 数行数 | **替换而非累积**；agent 报「只有 1 行」✅ |
| **官方运行时验证（7/7）** | `@qing3a/dsh-plugin-verify`，源码 checkout + mock-llm | **✅ 通过 \| 捕获事件 13 \| waterfall 7/7 \| tools/result 是** ✅ |
| **Verified 投稿包 gate** | 判定站自己的 `check-submission.mjs` | **24 项全绿 → ✅ 通过 — 可提交 PR** ✅ |
| CI 工作流语法 | 用 js-yaml 解析 + 结构断言 | PASS ✅ |
| 未通过项 | 无 —— 全部验证项均已通过 ✅ |

### 6.4 配置链路的端到端验证配方（可复现）

**为什么单独验**：配置选项此前只有单元测试（直接调 `renderClock(options)`）。
那条路径**绕过了 loader**，所以"文档里写的 `config:` 能不能真的传进 `apply(ctx, config)`"
一直是未验证状态 —— 如果这条链路不通，README 里承诺的功能就是坏的。

**做法**：用 profile patch 的 id 定位覆盖（这正是用户在 `cordis.patch.yml` 里的写法），
并且每个选项都取**特征值**，让生效与否一眼可辨：

```yaml
# probe.yml
- id: dsh-clock-context
  config:
    label: NOW-PROBE
    timeZone: UTC
    locale: en-US
    includeUtc: false
    includeEpoch: true
    hint: false
```

```powershell
# 1. 先看配置有没有被合并进树
dsh --profile headless --patch probe.yml --dump-config
#    → "# == dsh-clock-context, patched by <probe.yml>" 且 config 块完整出现

# 2. 再看运行时是否真的按配置渲染
dsh --profile headless --patch probe.yml "把运行上下文里给当前时间的那一行原文引用出来，不要解释。"
```

**实测输出**：

```text
NOW-PROBE: Saturday, 09/12/2026, 05:27:42 (UTC, UTC+00:00) · epoch 1789190862.
```

| 选项 | 期望表现 | 实测 |
|---|---|---|
| `label: NOW-PROBE` | 标题被替换 | ✅ |
| `timeZone: UTC` | 显示 `UTC+00:00` | ✅ |
| `locale: en-US` | 英文日期（而非宿主的中文格式） | ✅ |
| `includeUtc: false` | 不出现 `UTC 2026-…` | ✅ |
| `includeEpoch: true` | 出现 `epoch …` | ✅ |
| `hint: false` | 不出现 "authoritative clock" 那句 | ✅ |

**数值交叉验证**：`05:27:42` 的 Unix 时间应为 `1789190862`，实测输出的 epoch 正是该值 ✅

**反向验证**（顺带证明 agent 不会凭空编造时间行）：

```yaml
- id: dsh-clock-context
  config:
    enabled: false
```

```text
agent 回答：没有
（其推理过程显示上下文里只有 "file policy, approval policy" —— 时间行确实不存在）
组装树仍含 dsh-clock-context 节点，只是贡献文本为空 ✅
```

---

## 7. 本地安装与开发

### 7.1 用 `dev-install.ps1`（推荐）

```powershell
.\dev-install.ps1            # 打包并装到 web profile
.\dev-install.ps1 headless   # 打包并装到 headless profile
```

脚本做三件事：`npm pack` → `dsh plugin --profile <p> add <tgz>` → `--dump-config` 确认进了组装树。

**为什么用 tarball 而不是直接指目录**：tarball 就是发布到 npm / 市场的那份产物，
用它安装能保证「本地测的」和「发出去的」是同一个东西；而且不再需要在别处维护第二份副本 ——
本次就踩到过：工作区源码已更新（加了 `precision` / 类型 / 安全提示），而
`C:\Users\ASUS\dsh-plugins\` 的那份副本还是旧版，差点装出旧版本。

### 7.2 ⚠️ `.ps1` 文件必须带 UTF-8 BOM

`dev-install.ps1` 里含中文，**必须**存成 UTF-8 **带 BOM**：
Windows PowerShell 5.1 对无 BOM 的文件按 ANSI（本机是 GBK）解码，
中文会变成乱码并触发语法错误（本次实测：`Unexpected token '纭...'`）。
PowerShell 7 无此问题，但只要有人用 5.1 跑，就得以 BOM 为准。

> 这与项目里 `.md` 必须带 BOM 是同一个根因：**凡是被 Windows 工具读取、且含非 ASCII 的文件，
> 都要靠 BOM 告诉它"这是 UTF-8"**。反之，知识库 `D:\myknowledge` 的 `.md` 约定**不带** BOM，
> `.js` / `.json` 也不带 —— 按各自生态的惯例来。

### 7.3 已经准备好的投稿包

`submission/` 目录里是上架那一刻要用的成品，不需要随 npm 包发布：

| 文件 | 用途 |
|---|---|
| `submission/apex-mochen__dsh-clock-context.yml` | 直接放进 fork 的 `data/plugins/` —— **这就是整个投稿** |
| `submission/PR-BODY.md` | 提 PR 时贴进描述框 |
| `submission/README.md` | 投稿包的使用说明与前置条件清单 |

### 7.4 卸载与回滚（已实测）

装进日常 profile 之前，先确认它是可逆的 —— 实测过整条回滚路径：

```powershell
dsh plugin --profile web remove dsh-clock-context
```

实测结果（在 headless profile 上）：

```text
卸载前  bundles: @deepseek-ai/dsh-base, @deepseek-ai/dsh-headless, dsh-clock-context
        dependencies: dsh-clock-context
卸载后  bundles: @deepseek-ai/dsh-base, @deepseek-ai/dsh-headless      ← 干净移除
        dependencies: （空）
组装树含 dsh-clock-context: False
```

**卸载是干净的**：`dsh plugin remove` 会同时把包从 `dsh.profile.bundles` 与 `dependencies`
里去掉，不需要手工编辑 profile 文件。装回来只要再跑一次 `.\dev-install.ps1`。

> ⚠️ `dev-install.ps1` 末尾有显式 `exit 0`：脚本中途调用过 npm / pnpm，
> 它们的退出码会留在 `$LASTEXITCODE` 里，导致"明明成功却返回 1"，调用方会误判失败。

### 7.5 开发循环

```powershell
# 改代码
node test/smoke.mjs                                         # 单元测试（秒出）
node <验证器>\scripts\static-rules.mjs .                    # 静态规则（秒出，不联网）
.\dev-install.ps1 headless                                  # 装到测试 profile
dsh --profile headless "把运行上下文里给当前时间的那一行原文引用出来。"   # 端到端
# 确认无误后：
git add -A; git commit -m "..."; git push
.\dev-install.ps1                                           # 再装到你日常用的 web profile
```


