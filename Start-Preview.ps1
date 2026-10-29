param(
    [string]$RuntimeDirectory = (Join-Path $PSScriptRoot '.preview-runtime'),
    [int]$DatabasePort = 54897,
    [int]$ApiPort = 5016,
    [int]$WebPort = 8086,
    [switch]$Rebuild
)
$ErrorActionPreference = 'Stop'
$previewRoot = $PSScriptRoot
$previewRuntime = [IO.Path]::GetFullPath($RuntimeDirectory)
$previewBackend = Join-Path $previewRoot 'backend'
$previewMobile = Join-Path $previewRoot 'mobile'
$previewPg = Join-Path $env:ProgramFiles 'PostgreSQL\18\bin'
$previewData = Join-Path $previewRuntime 'data'
$previewEnv = Join-Path $previewBackend '.env'
$previewState = Join-Path $previewRoot '.preview-state.json'
$previewNode = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath "$previewPg\pg_ctl.exe")) { throw 'Install PostgreSQL 18 before starting this local preview.' }
foreach ($previewPart in @('backend','mobile')) {
    if (-not (Test-Path -LiteralPath (Join-Path $previewRoot "$previewPart\node_modules"))) { throw "Run npm install in $previewPart first." }
}
if (Test-Path -LiteralPath $previewState) {
    $previewOld = Get-Content -LiteralPath $previewState -Raw | ConvertFrom-Json
    foreach ($previewProcess in $previewOld.processes) {
        $previewLive = Get-Process -Id $previewProcess.id -ErrorAction SilentlyContinue
        if ($previewLive -and $previewLive.StartTime.ToUniversalTime().Ticks.ToString() -eq $previewProcess.started) {
            Write-Output "Preview already running: $($previewOld.web). Use Stop-Preview.ps1 before rebuilding."
            return
        }
    }
}
New-Item -ItemType Directory -Path $previewRuntime -Force | Out-Null
if (Test-Path -LiteralPath $previewEnv) {
    $previewText = Get-Content -LiteralPath $previewEnv -Raw
    if (-not $previewText.Contains('# CODEX_DESKTOP_PREVIEW')) { throw 'Existing backend .env was preserved. This launcher only manages its own preview configuration.' }
    $previewDbLine = Get-Content -LiteralPath $previewEnv | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1
    $previewDbUrl = [uri]$previewDbLine.Substring(13)
    if ($previewDbUrl.Host -ne '127.0.0.1' -or $previewDbUrl.Port -ne $DatabasePort -or $previewDbUrl.AbsolutePath -ne '/patan_local') { throw 'Preview database settings do not match this dedicated local instance.' }
    $previewPassword = $previewDbUrl.UserInfo.Split(':',2)[1]
} else {
    $previewPasswordFile = Join-Path $previewRuntime 'password.txt'
    $previewPassword = if (Test-Path -LiteralPath $previewPasswordFile) { [IO.File]::ReadAllText($previewPasswordFile).Trim() } else { [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N') }
    $previewSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    @"
# CODEX_DESKTOP_PREVIEW
NODE_ENV=development
LMS_LOCAL_DEVELOPMENT=true
DATABASE_URL=postgresql://codex_task:${previewPassword}@127.0.0.1:${DatabasePort}/patan_local?schema=public
ACCESS_TOKEN_SECRET=$previewSecret
JWT_SECRET=$previewSecret
SESSION_SECRET=$previewSecret
PORT=$ApiPort
HOST=127.0.0.1
LMS_APP_URL=http://localhost:$WebPort
LMS_PRACTICE_MEDIA_URL=/local-practice-media/practice.mp4
LMS_CERTIFICATE_STORAGE=local
JUDGE0_URL=
LMS_CERTIFICATE_BUCKET=
SENDGRID_API_KEY=
FROM_EMAIL=
"@ | Set-Content -LiteralPath $previewEnv
}
if (-not (Test-Path -LiteralPath "$previewData\PG_VERSION")) {
    $previewPasswordFile = Join-Path $previewRuntime 'password.txt'
    [IO.File]::WriteAllText($previewPasswordFile, $previewPassword)
    & "$previewPg\initdb.exe" -D $previewData -U codex_task --pwfile=$previewPasswordFile --auth=scram-sha-256 --encoding=UTF8 --locale=C > "$previewRuntime\init.log" 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Preview database initialization failed. Read .preview-runtime/init.log.' }
}
& "$previewPg\pg_ctl.exe" -D $previewData status *> $null
if ($LASTEXITCODE -ne 0) {
    & "$previewPg\pg_ctl.exe" -D $previewData -l "$previewRuntime\server.log" -o "-h 127.0.0.1 -p $DatabasePort" -w start
    if ($LASTEXITCODE -ne 0) { throw 'Could not start the dedicated preview database.' }
}
$env:PGPASSWORD = $previewPassword
$env:PGCONNECT_TIMEOUT = '5'
try {
    $previewExists = & "$previewPg\psql.exe" -w -h 127.0.0.1 -p $DatabasePort -U codex_task -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='patan_local'"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to this preview database instance.' }
    if ($previewExists -ne '1') {
        & "$previewPg\createdb.exe" -w -h 127.0.0.1 -p $DatabasePort -U codex_task patan_local
        if ($LASTEXITCODE -ne 0) { throw 'Preview database creation failed.' }
    }
} finally { Remove-Item Env:PGPASSWORD,Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue }
Push-Location $previewBackend
try {
    & $previewNode node_modules/prisma/build/index.js db push --skip-generate
    if ($LASTEXITCODE -ne 0) { throw 'Preview schema initialization failed.' }
    & $previewNode lms/scripts/seed-local.js
    if ($LASTEXITCODE -ne 0) { throw 'Preview account/content setup failed.' }
} finally { Pop-Location }
if ($Rebuild -or -not (Test-Path -LiteralPath "$previewMobile\web-preview\index.html")) {
    Push-Location $previewMobile
    try {
        $env:EXPO_PUBLIC_API_URL='/api'; $env:EXPO_NO_TELEMETRY='1'; $env:CI='1'
        & $previewNode node_modules/expo/bin/cli export --platform web --output-dir web-preview
        if ($LASTEXITCODE -ne 0) { throw 'Mobile web preview export failed.' }
    } finally { Pop-Location; Remove-Item Env:EXPO_PUBLIC_API_URL,Env:EXPO_NO_TELEMETRY,Env:CI -ErrorAction SilentlyContinue }
}
$previewProcesses = @()
try {
    $previewApi = Start-Process -FilePath $previewNode -ArgumentList @('server.js') -WorkingDirectory $previewBackend -WindowStyle Hidden -RedirectStandardOutput "$previewRuntime\api.log" -RedirectStandardError "$previewRuntime\api-errors.log" -PassThru
    $previewProcesses += @{ id=$previewApi.Id; started=$previewApi.StartTime.ToUniversalTime().Ticks.ToString(); role='backend' }
    $env:PREVIEW_WEB_PORT=[string]$WebPort; $env:PREVIEW_API_PORT=[string]$ApiPort
    $previewWeb = Start-Process -FilePath $previewNode -ArgumentList @('scripts/preview-server.cjs') -WorkingDirectory $previewMobile -WindowStyle Hidden -RedirectStandardOutput "$previewRuntime\web.log" -RedirectStandardError "$previewRuntime\web-errors.log" -PassThru
    $previewProcesses += @{ id=$previewWeb.Id; started=$previewWeb.StartTime.ToUniversalTime().Ticks.ToString(); role='web' }
} finally {
    @{ root=$previewRoot; runtime=$previewRuntime; processes=$previewProcesses; web="http://localhost:$WebPort"; api="http://127.0.0.1:$ApiPort" } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $previewState
    Remove-Item Env:PREVIEW_WEB_PORT,Env:PREVIEW_API_PORT -ErrorAction SilentlyContinue
}
Write-Output "Laptop preview: http://localhost:$WebPort"
$previewAddresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike '*Loopback*' }
foreach ($previewAddress in $previewAddresses) { Write-Output "Same-Wi-Fi phone link ($($previewAddress.InterfaceAlias)): http://$($previewAddress.IPAddress):$WebPort" }
Write-Output 'Login details: backend/.local/LOCAL_LOGIN.txt. External Judge0, S3 and email need their approved configuration.'
