$ErrorActionPreference = 'Stop'
$previewStateFile = Join-Path $PSScriptRoot '.preview-state.json'
if (-not (Test-Path -LiteralPath $previewStateFile)) { Write-Output 'No preview launched from this folder.'; return }
$previewState = Get-Content -LiteralPath $previewStateFile -Raw | ConvertFrom-Json
foreach ($previewProcess in $previewState.processes) {
    $previewLive = Get-Process -Id $previewProcess.id -ErrorAction SilentlyContinue
    if ($previewLive -and $previewLive.StartTime.ToUniversalTime().Ticks.ToString() -eq $previewProcess.started) { Stop-Process -Id $previewProcess.id }
}
$previewPg = Join-Path $env:ProgramFiles 'PostgreSQL\18\bin\pg_ctl.exe'
$previewData = Join-Path $previewState.runtime 'data'
if ((Test-Path -LiteralPath $previewPg) -and (Test-Path -LiteralPath "$previewData\PG_VERSION")) { & $previewPg -D $previewData -m fast -w stop }
Remove-Item -LiteralPath $previewStateFile
Write-Output 'This project preview stopped.'
