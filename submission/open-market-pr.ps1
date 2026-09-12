# open-market-pr.ps1 — 到点自动给主市场开投稿 PR（dsh-clock-context）
#
# 为什么存在：agent 无法在会话之外自己醒来，而主市场 CI 要求插件仓库创建满 1 天
# （MIN_AGE_DAYS = 1），所以这个脚本被计划任务在门槛过后触发。
#
# 设计要点：
#   · 不存凭据 —— 每次运行时才用 git credential fill 从 Windows 凭据管理器取
#   · 幂等 —— 已存在 PR 就直接退出（计划任务可以重复触发）
#   · 有守卫 —— 仓库未满 1 天时直接退出，绝不制造必然失败的红叉 PR
#   · 全程写日志，便于事后核对
#
# 手动运行：  powershell -NoProfile -ExecutionPolicy Bypass -File .\open-market-pr.ps1

$ErrorActionPreference = 'Stop'

$Proxy      = 'http://127.0.0.1:7890'
$PluginRepo = 'apex-mochen/dsh-clock-context'
$Upstream   = 'awesome-dsh-plugin/awesome-dsh-plugin'
$Fork       = 'apex-mochen/awesome-dsh-plugin'
$Branch     = 'add-dsh-clock-context'
$Title      = 'add dsh-clock-context'
$LogPath    = Join-Path $PSScriptRoot 'open-market-pr.log'
$BodyPath   = Join-Path $PSScriptRoot 'submission\PR-BODY.md'

function Log([string]$msg) {
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Write-Host $line
    Add-Content -Path $LogPath -Value $line -Encoding UTF8
}

Log '=== open-market-pr 启动 ==='

function Get-GitHubToken {
    $raw = ("protocol=https`nhost=github.com`n`n" | git credential fill) | Out-String
    $tok = ((($raw -split "`n") | Where-Object { $_ -match '^password=' }) -replace '^password=', '').Trim()
    if (-not $tok) { throw '取不到 GitHub 凭据（git credential fill 返回空）' }
    return $tok
}

try {
    $tok = Get-GitHubToken
    $Headers = @{
        Authorization = "Bearer $tok"
        'User-Agent'  = 'dsh-clock-context-publisher'
        Accept        = 'application/vnd.github+json'
    }
    Log '凭据读取成功（未落盘）'

    # ---- 守卫 1：仓库是否已满 1 天 -------------------------------------------------
    $repo = Invoke-RestMethod "https://api.github.com/repos/$PluginRepo" -Headers $Headers -Proxy $Proxy -TimeoutSec 40
    $created  = [datetime]::Parse($repo.created_at).ToUniversalTime()
    $eligible = $created.AddDays(1)
    $now = (Get-Date).ToUniversalTime()
    if ($now -lt $eligible) {
        $left = [math]::Round(($eligible - $now).TotalMinutes, 1)
        Log "尚未到门槛：仓库 $($created.ToString('u')) 创建，需等到 $($eligible.ToString('u'))，还差 $left 分钟 —— 直接退出（不制造必然失败的 PR）"
        exit 0
    }
    Log "门槛已过（仓库创建于 $($created.ToString('u'))）"

    # ---- 守卫 2：PR 是否已存在（幂等）---------------------------------------------
    $existing = Invoke-RestMethod "https://api.github.com/repos/$Upstream/pulls?state=all&head=${Fork}:$Branch" -Headers $Headers -Proxy $Proxy -TimeoutSec 40
    if ($existing -and $existing.Count -gt 0) {
        Log "PR 已存在：#$($existing[0].number) $($existing[0].html_url) —— 退出"
        exit 0
    }

    # ---- 守卫 3：分支上的投稿文件是否就位 -----------------------------------------
    $target = 'data/plugins/apex-mochen__dsh-clock-context.yml'
    $file = Invoke-RestMethod "https://api.github.com/repos/$Fork/contents/$target?ref=$Branch" -Headers $Headers -Proxy $Proxy -TimeoutSec 40
    $remoteYml = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($file.content))
    Log "分支文件就位：$target（$($file.size) bytes）"

    # ---- 开 PR --------------------------------------------------------------------
    $body = if (Test-Path $BodyPath) { Get-Content $BodyPath -Raw -Encoding UTF8 } else { 'Adds dsh-clock-context.' }
    $payload = @{
        title = $Title
        head  = "${Fork}:$Branch"
        base  = 'main'
        body  = $body
    } | ConvertTo-Json -Depth 4

    $pr = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$Upstream/pulls" `
        -Headers $Headers -Body $payload -ContentType 'application/json' -Proxy $Proxy -TimeoutSec 90

    Log "✅ PR 已创建：#$($pr.number)  $($pr.html_url)  （改动文件 $($pr.changed_files) 个）"
    Log '=== 完成 ==='
    exit 0
}
catch {
    Log "❌ 失败：$($_.Exception.Message)"
    if ($_.ErrorDetails) { Log "   $($_.ErrorDetails.Message)" }
    exit 1
}
