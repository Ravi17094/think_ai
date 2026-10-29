$ErrorActionPreference = 'Stop'
$patanRoot = $PSScriptRoot
$patanBackend = Join-Path $patanRoot 'backend'
$patanMobile = Join-Path $patanRoot 'mobile'
$patanStateDir = Join-Path $patanRoot '.local'
$patanEnvFile = Join-Path $patanBackend '.env'
$patanPg = Join-Path $env:ProgramFiles 'PostgreSQL\18\bin'
$patanNode = (Get-Command node -ErrorAction Stop).Source
$patanHashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($patanRoot.ToLowerInvariant()))
$patanHash = [BitConverter]::ToString($patanHashBytes).Replace("-", "").Substring(0,12).ToLowerInvariant()
$patanRuntime = Join-Path $env:LOCALAPPDATA "ThinkzPatan\$patanHash"
$patanData = Join-Path $patanRuntime 'postgres'
$patanStateFile = Join-Path $patanStateDir 'launcher.json'

if (-not (Test-Path -LiteralPath "$patanPg\pg_ctl.exe")) { throw 'Install PostgreSQL 18 or update the PostgreSQL binary path in Start-Patan.ps1.' }
if (-not (Test-Path -LiteralPath "$patanBackend\node_modules\@prisma\client")) { throw 'Run npm install in backend and mobile first.' }
if ((Test-Path -LiteralPath $patanEnvFile) -and -not ((Get-Content -LiteralPath $patanEnvFile -Raw).Contains('# PATAN_LOCAL_DEVELOPMENT'))) {
    throw 'An existing backend .env is configured for another environment. It was preserved. Use its approved database and npm start, or back it up before using this local-only launcher.'
}
if (Test-Path -LiteralPath $patanStateFile) {
    $patanPrevious = Get-Content -LiteralPath $patanStateFile -Raw | ConvertFrom-Json
    foreach ($patanPreviousProcess in @($patanPrevious.processes)) {
        $patanExisting = Get-Process -Id $patanPreviousProcess.id -ErrorAction SilentlyContinue
        if ($patanExisting -and $patanExisting.StartTime.ToUniversalTime().Ticks.ToString() -eq $patanPreviousProcess.started) {
            throw 'This local project is already running. Open http://localhost:8081 or run Stop-Patan.ps1 before restarting.'
        }
    }
}
New-Item -ItemType Directory -Path $patanStateDir,$patanRuntime -Force | Out-Null
if (-not (Test-Path -LiteralPath $patanEnvFile)) {
    $patanPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    $patanJwt = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    $patanSession = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    @"
# PATAN_LOCAL_DEVELOPMENT
NODE_ENV=development
LMS_LOCAL_DEVELOPMENT=true
DATABASE_URL=postgresql://patan_local_user:${patanPassword}@127.0.0.1:55444/patan_local?schema=public
ACCESS_TOKEN_SECRET=$patanJwt
JWT_SECRET=$patanJwt
SESSION_SECRET=$patanSession
PORT=5000
HOST=127.0.0.1
LMS_APP_URL=http://localhost:8081
# Set approved external service credentials locally when available.
JUDGE0_URL=
LMS_CERTIFICATE_BUCKET=
SENDGRID_API_KEY=
FROM_EMAIL=
"@ | Set-Content -LiteralPath $patanEnvFile
}
$patanDbLine = Get-Content -LiteralPath $patanEnvFile | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1
$patanDbUrl = [uri]$patanDbLine.Substring('DATABASE_URL='.Length)
if ($patanDbUrl.Host -ne '127.0.0.1' -or $patanDbUrl.Port -ne 55444 -or $patanDbUrl.AbsolutePath -ne '/patan_local') { throw 'The launcher only manages its separate local patan_local database.' }
$patanPassword = $patanDbUrl.UserInfo.Split(':',2)[1]
if (-not (Test-Path -LiteralPath (Join-Path $patanMobile '.env'))) {
    "EXPO_PUBLIC_API_URL=http://localhost:5000/api`nEXPO_PUBLIC_APP_URL=http://localhost:8081" | Set-Content -LiteralPath (Join-Path $patanMobile '.env')
}
if (-not (Test-Path -LiteralPath "$patanData\PG_VERSION")) {
    $patanPwFile = Join-Path $patanRuntime 'init-password.txt'
    try {
        Set-Content -LiteralPath $patanPwFile -Value $patanPassword -NoNewline
        & "$patanPg\initdb.exe" -D $patanData -U patan_local_user --pwfile=$patanPwFile --auth=scram-sha-256 --encoding=UTF8 --locale=C > "$patanRuntime\init.log" 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL initialization failed. See the local runtime init.log.' }
    } finally { if (Test-Path -LiteralPath $patanPwFile) { Remove-Item -LiteralPath $patanPwFile } }
}
& "$patanPg\pg_ctl.exe" -D $patanData status *> $null
if ($LASTEXITCODE -ne 0) {
    & "$patanPg\pg_ctl.exe" -D $patanData -l "$patanRuntime\postgres.log" -o '-h 127.0.0.1 -p 55444' -w start
    if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL startup failed. Check whether port 55444 is occupied.' }
}
$env:PGPASSWORD = $patanPassword
try {
    $patanDbExists = & "$patanPg\psql.exe" -h 127.0.0.1 -p 55444 -U patan_local_user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='patan_local'"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to the dedicated local PostgreSQL instance.' }
    if ($patanDbExists -ne '1') {
        & "$patanPg\psql.exe" -h 127.0.0.1 -p 55444 -U patan_local_user -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE patan_local;'
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the separate local development database.' }
    }
} finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }

Push-Location $patanBackend
try {
    if (-not (Test-Path -LiteralPath "$patanStateDir\schema-initialized")) {
        & $patanNode node_modules/prisma/build/index.js db push --skip-generate > "$patanRuntime\schema.log" 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'Local schema initialization failed. See the local runtime schema.log.' }
        Set-Content -LiteralPath "$patanStateDir\schema-initialized" -Value 'Dedicated local development database initialized.'
    }
    # Additive Day 7 table for local checkouts initialized before this update.
    $env:PGPASSWORD = $patanPassword
    try {
        $patanReportTable = & "$patanPg\psql.exe" -h 127.0.0.1 -p 55444 -U patan_local_user -d patan_local -tAc 'SELECT to_regclass(''public."LmsReportDelivery"'')'
        if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the local Day 7 schema.' }
        if ([string]::IsNullOrWhiteSpace($patanReportTable)) {
            & "$patanPg\psql.exe" -h 127.0.0.1 -p 55444 -U patan_local_user -d patan_local -v ON_ERROR_STOP=1 --single-transaction -f lms/day7-migration.sql > "$patanRuntime\day7-schema.log"
            if ($LASTEXITCODE -ne 0) { throw 'Local Day 7 schema update failed.' }
        }
    } finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    $env:PGPASSWORD = $patanPassword
    try {
        & "$patanPg\psql.exe" -h 127.0.0.1 -p 55444 -U patan_local_user -d patan_local -v ON_ERROR_STOP=1 --single-transaction -f lms/security-acceptance-migration.sql > "$patanRuntime\completion-schema.log"
        if ($LASTEXITCODE -ne 0) { throw 'Local completion-rule schema update failed.' }
    } finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    & $patanNode lms/scripts/seed-local.js
    if ($LASTEXITCODE -ne 0) { throw 'Local practice data initialization failed.' }
} finally { Pop-Location }

$patanProcesses = @()
try {
    $patanApi = Start-Process -FilePath $patanNode -ArgumentList @('server.js') -WorkingDirectory $patanBackend -WindowStyle Hidden -RedirectStandardOutput "$patanRuntime\backend.log" -RedirectStandardError "$patanRuntime\backend-errors.log" -PassThru
    $patanProcesses += @{ id=$patanApi.Id; started=$patanApi.StartTime.ToUniversalTime().Ticks.ToString(); role='backend' }
    $env:CI='1'
    $env:BROWSER='none'
    $env:EXPO_NO_TELEMETRY='1'
    $patanWeb = Start-Process -FilePath $patanNode -ArgumentList @('node_modules/expo/bin/cli','start','--web','--port','8081','--offline') -WorkingDirectory $patanMobile -WindowStyle Hidden -RedirectStandardOutput "$patanRuntime\mobile.log" -RedirectStandardError "$patanRuntime\mobile-errors.log" -PassThru
    $patanProcesses += @{ id=$patanWeb.Id; started=$patanWeb.StartTime.ToUniversalTime().Ticks.ToString(); role='mobile' }
} finally {
    @{ root=$patanRoot; runtime=$patanRuntime; processes=$patanProcesses; web='http://localhost:8081'; api='http://localhost:5000' } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $patanStateFile
    Remove-Item Env:CI,Env:BROWSER,Env:EXPO_NO_TELEMETRY -ErrorAction SilentlyContinue
}
Write-Output 'Local project started. App: http://localhost:8081 | Swagger: http://localhost:5000/api-docs'
Write-Output 'Open backend/.local/LOCAL_LOGIN.txt for your local learner and Admin login details.'
Write-Output 'Use Stop-Patan.ps1 to stop these local services. External Judge0, S3 and email remain unconfigured until approved settings are supplied.'

