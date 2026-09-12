# 投稿包（Submission）

这个文件夹里的东西是**给上架那一刻用的**，不需要随 npm 包发布（`files` 里没有它）。

## 文件

| 文件 | 用途 |
|---|---|
| `apex-mochen__dsh-clock-context.yml` | ⭐ 直接放进 `awesome-dsh-plugin` 仓库的 `data/plugins/` 目录，这就是整个投稿 |
| `PR-BODY.md` | 提 PR 时贴进描述框的内容 |

## 操作步骤

1. Fork `github.com/awesome-dsh-plugin/awesome-dsh-plugin`
2. 在 fork 里新建文件：`data/plugins/apex-mochen__dsh-clock-context.yml`
   （内容 = 本目录的同名 yml，**一字不改**，尤其是 `url` 必须与仓库地址完全一致）
3. 提 PR，标题：`add dsh-clock-context`
4. 描述框粘贴 `PR-BODY.md` 的内容
5. **不要**编辑仓库的 README 或其它文件 —— 两版 README 由 `data/plugins/*.yml` 自动生成

## 前置条件（缺一不可）

- [ ] 仓库已推送到 `https://github.com/apex-mochen/dsh-clock-context`
- [ ] 仓库已添加 `dsh-plugin` topic
- [ ] 仓库**创建满 1 天**（市场 CI 自动检查，刚建的仓库会被拒）
- [ ] `package.json` 已声明 `dsh.bundle`（✅ 本仓库已有：`{"bundle":{"patch":"./cordis.patch.yml"}}`）
