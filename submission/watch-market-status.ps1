# watch-market-status.ps1 — 盯 dsh-clock-context 的上架状态，一旦上架就通知
#
# 为什么存在：agent 无法在会话之外醒来，而"盯到上架"这件事需要跨天持续观察。
#
# 每次运行做四件事：
#   1. 查投稿 PR 的状态（还没开 / open / merged / closed 未合并）
#   2. 查官方目录 plugins.json 里有没有我们的插件名
#   3. 查详情页 https://awesome-dsh-plugin.com/p/apex-mochen/dsh-clock-context/ 是否 200
#   4. 一旦确认上架 → 弹通知 + 在桌面写一份验证说明 → 注销自己的计划任务（不再打扰）
#
# 幂等且无害：只读 API / 只写日志与桌面提示，绝不修改任何仓库。
#
# 手动运行：powershell -NoProfile -ExecutionPolicy Bypass -File .\watch-market-status.ps1

$ErrorActionPreference = 'Continue'

$Proxy     = 'http://127.0.0.1:7890'
$Plugin    = 'dsh-clock-context'
$Upstream  = 'awesome-dsh-plugin/awesome-dsh-plugin'
$Fork      = 'apex-mochen'
$Branch    = 'add-dsh-clock-context'
$PageUrl   = "https://awesome-dsh-plugin.com/p/$Fork/$Plugin/"
$TaskName  = 'dsh-clock-context-watch-market'
$LogPath   = Join-Path $PSScriptRoot 'market-status.log'
$DeskFile  = Join-Path ([Environment]::GetFolderPath('Desktop')) "dsh-clock-context-已上架.txt"

function Log([string]$msg) {
    $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Write-Host $line
    Add-Content -Path $LogPath -Value $line -Encoding UTF8
}

function Notify([string]$title, [string]$text) {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $ni = New-Object System.Windows.Forms.NotifyIcon
        $ni.Icon = [System.Drawing.SystemIcons]::Information
        $ni.BalloonTipTitle = $title
        $ni.BalloonTipText  = $text
        $ni.Visible = $true
        $ni.ShowBalloonTip(30000)
        Start-Sleep -Seconds 6
        $ni.Dispose()
    } catch {
        Log "（通知弹出失败，不影响其它动作：$($_.Exception.Message)）"
    }
}

Log '--- 检查开始 ---'

# ---------------------------------------------------------------- 凭据（不落盘）
$raw = ("protocol=https`nhost=github.com`n`n" | git credential fill) | Out-String
$tok = ((($raw -split "`n") | Where-Object { $_ -match '^password=' }) -replace '^password=', '').Trim()
$Headers = @{}
if ($tok) {
    $Headers = @{ Authorization = "Bearer $tok"; 'User-Agent' = 'dsh-clock-context-watch'; Accept = 'application/vnd.github+json' }
} else {
    Log '（取不到凭据，本次只能查公开目录）'
}

# ---------------------------------------------------------------- 1. PR 状态
$prState = 'none'
$prLine  = 'PR 还没创建（等 open-market-pr 计划任务开出来）'
try {
    $prs = Invoke-RestMethod "https://api.github.com/repos/$Upstream/pulls?state=all&head=${Fork}:$Branch" `
        -Headers $Headers -Proxy $Proxy -TimeoutSec 40
    if ($prs -and @($prs).Count -gt 0) {
        $pr = @($prs)[0]
        if ($pr.merged_at) {
            $prState = 'merged'
            $prLine = "PR #$($pr.number) 已合并（$($pr.merged_at)）  $($pr.html_url)"
        } elseif ($pr.state -eq 'open') {
            $prState = 'open'
            $age = [math]::Round(((Get-Date).ToUniversalTime() - [datetime]::Parse($pr.created_at)).TotalHours, 1)
            $prLine = "PR #$($pr.number) 开着，已等 $age 小时，等待维护者 review  $($pr.html_url)"
        } else {
            $prState = 'closed'
            $prLine = "⚠️ PR #$($pr.number) 被关闭且未合并 —— 需要人工看看原因  $($pr.html_url)"
        }
    }
} catch { $prLine = "PR 查询失败：$($_.Exception.Message)" }
Log $prLine

# ---------------------------------------------------------------- 2. 官方目录
$listed = $false
try {
    $cat = Invoke-RestMethod 'https://awesome-dsh-plugin.com/plugins.json' -Proxy $Proxy -TimeoutSec 40
    $hit = @($cat.plugins | Where-Object { $_.name -eq $Plugin })
    if ($hit.Count -gt 0) {
        $listed = $true
        Log "✅ 目录里已经有了！count=$($cat.count)  updated=$($cat.updated)  category=$($hit[0].category)  install=$($hit[0].install)"
    } else {
        Log "目录里还没有（当前 $($cat.count) 个插件，目录更新日期 $($cat.updated)）"
    }
} catch { Log "目录查询失败：$($_.Exception.Message)" }

# ---------------------------------------------------------------- 3. 详情页
try {
    $page = Invoke-WebRequest $PageUrl -Proxy $Proxy -TimeoutSec 40 -UseBasicParsing
    Log "详情页 HTTP $($page.StatusCode)  $PageUrl"
} catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Log "详情页 HTTP $code（未上架时 404 属正常）  $PageUrl"
}

# ---------------------------------------------------------------- 4. 上架了就通知并收工
if ($listed) {
    $body = @"
dsh-clock-context 已经上架到 DSH 插件市场了。
（本文件由计划任务 $TaskName 自动生成，看完可以删掉）

== 怎么验证 ==

1) 命令行查目录（最快）：
   (Invoke-RestMethod 'https://awesome-dsh-plugin.com/plugins.json' -Proxy 'http://127.0.0.1:7890').plugins.name -contains 'dsh-clock-context'
   返回 True 就是已收录。

2) 网页看详情页：
   $PageUrl

3) GUI 插件市场里搜：
   打开 DSH 的插件市场，搜 clock 或 dsh-clock-context。
   你的机器走官方目录源，和网站同步，不需要等夜间。

4) 别人怎么装（已实测可用）：
   dsh plugin --profile web add github:apex-mochen/dsh-clock-context

== 你自己的环境 ==

web profile 里已经装好并生效了 —— 每轮运行上下文里都会有这样一行：

  Current date/time: 2026年09月12日星期六 14:03:49 (Asia/Shanghai, UTC+08:00) · UTC 2026-09-12T06:03:49Z. ...

想确认就问我一句："把运行上下文里给当前时间的那一行原文引用出来"。

== 收尾 ==

本监控任务已经完成使命并自动注销，不会再打扰你。
详细日志：$LogPath
"@
    try {
        Set-Content -Path $DeskFile -Value $body -Encoding UTF8
        Log "已在桌面写入说明：$DeskFile"
    } catch { Log "（写桌面文件失败：$($_.Exception.Message)）" }

    Notify 'dsh-clock-context 已上架 ✅' '插件市场已收录，桌面有一份验证说明。（监控任务已自动注销）'

    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Log "已注销计划任务 $TaskName —— 监控结束"
    } catch { Log "（注销任务失败，可手动执行：Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false）" }
}

Log '--- 检查结束 ---'
exit 0
