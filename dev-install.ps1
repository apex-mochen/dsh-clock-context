# dev-install.ps1 — 打包本插件并安装到指定 DSH profile。
#
# 为什么用 tarball 而不是直接指目录：npm pack 出来的 tarball 就是将来发布到
# npm / 市场的那份产物，用它安装可以保证「本地测的」和「发出去的」是同一个东西，
# 也避免维护第二份会在你不注意时变旧的副本。
#
#   .\dev-install.ps1              # 装到 web profile（默认）
#   .\dev-install.ps1 headless     # 装到 headless profile
#
param([string]$Profile = 'web')

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "[1/3] 打包 ..." -ForegroundColor Cyan
npm pack | Out-Null
$tgz = (Get-ChildItem *.tgz | Select-Object -First 1).FullName
Write-Host "      $tgz ($([math]::Round((Get-Item $tgz).Length / 1KB, 1)) KB)"

Write-Host "[2/3] 安装到 profile '$Profile' ..." -ForegroundColor Cyan
dsh plugin --profile $Profile add "$tgz"
if ($LASTEXITCODE -ne 0) { throw "安装失败（退出码 $LASTEXITCODE）" }

Write-Host "[3/3] 确认已进入组装树 ..." -ForegroundColor Cyan
$cfg = dsh --profile $Profile --dump-config 2>&1 | Out-String
if ($cfg -match 'dsh-clock-context') {
    Write-Host "      OK — dsh-clock-context 在组装树里" -ForegroundColor Green
} else {
    Write-Host "      警告：组装树里没找到，请检查 profile 的 package.json bundles" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "完成。重启 DSH（web profile 需要重启应用）后生效。" -ForegroundColor Green
Write-Host "验证方法：新开一轮，让 agent「把运行上下文里给当前时间的那一行原文引用出来」。"
Write-Host ""
Write-Host "卸载回滚：dsh plugin --profile $Profile remove dsh-clock-context" -ForegroundColor DarkGray
Write-Host ""

# 显式成功退出：脚本中途调用过 npm / pnpm，它们的退出码会留在 $LASTEXITCODE，
# 让"明明成功却返回 1"——调用方或 CI 会误判为失败。
exit 0
