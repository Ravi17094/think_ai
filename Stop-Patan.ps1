$ErrorActionPreference = 'Stop'
$patanRoot = $PSScriptRoot
$patanStateFile = Join-Path $patanRoot '.local\launcher.json'
if (-not (Test-Path -LiteralPath $patanStateFile)) { Write-Output 'No local launcher state found.'; return }
$patanState = Get-Content -LiteralPath $patanStateFile -Raw | ConvertFrom-Json
if ($patanState.root -ne $patanRoot) { throw 'Launcher state belongs to another checkout.' }
foreach ($patanEntry in @($patanState.processes)) {
    $patanProcess = Get-Process -Id $patanEntry.id -ErrorAction SilentlyContinue
    if ($patanProcess -and $patanProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $patanEntry.started -and $patanProcess.ProcessName -eq 'node') {
        Stop-Process -Id $patanProcess.Id
        Write-Output "Stopped local $($patanEntry.role)."
    }
}
$patanHashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($patanRoot.ToLowerInvariant()))
$patanHash = [BitConverter]::ToString($patanHashBytes).Replace("-", "").Substring(0,12).ToLowerInvariant()
$patanData = Join-Path $env:LOCALAPPDATA "ThinkzPatan\$patanHash\postgres"
$patanPg = Join-Path $env:ProgramFiles 'PostgreSQL\18\bin\pg_ctl.exe'
if (Test-Path -LiteralPath "$patanData\postmaster.pid") {
    & $patanPg -D $patanData -m fast -w stop
    if ($LASTEXITCODE -ne 0) { throw 'Could not stop the local development database.' }
}
Remove-Item -LiteralPath $patanStateFile
Write-Output 'Local services stopped. Accounts, data and configuration were preserved.'
