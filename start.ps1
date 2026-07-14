# ================================================================
#  Conquer Capital - one-command startup
#  Brings up EVERYTHING in order:
#    1. Docker Desktop (if not running)
#    2. Containers: PostgreSQL + Redis + MinIO
#    3. Database migrations
#    4. Next.js PRODUCTION server (fast — no on-demand compiling;
#       builds automatically only when the code changed)
#    5. Initial news sync (once the server is live)
#
#  Usage:  double-click start.bat  - or -  powershell -File start.ps1
# ================================================================

$ErrorActionPreference = "Continue"
$proj = $PSScriptRoot
Set-Location $proj

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# -- 1. Docker daemon --------------------------------------------
Step "Checking Docker"
docker info *>$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker not running - launching Docker Desktop..." -ForegroundColor Yellow
    $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) { Start-Process $dockerExe }
    else { Write-Host "Docker Desktop not found at default path. Install Docker Desktop first." -ForegroundColor Red; exit 1 }

    Write-Host "Waiting for Docker engine (up to 3 min)..."
    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
        docker info *>$null 2>&1
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 6
    }
    docker info *>$null 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host "Docker engine did not start in time." -ForegroundColor Red; exit 1 }
}
Write-Host "Docker is ready." -ForegroundColor Green

# -- 2. Containers -----------------------------------------------
Step "Starting containers (PostgreSQL, Redis, MinIO)"
docker compose up -d

Write-Host "Waiting for PostgreSQL to be healthy..."
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    $s = docker inspect upsc-os-postgres --format "{{.State.Health.Status}}" 2>$null
    if ($s -eq "healthy") { break }
    Start-Sleep -Seconds 4
}
$s = docker inspect upsc-os-postgres --format "{{.State.Health.Status}}" 2>$null
if ($s -ne "healthy") { Write-Host "PostgreSQL not healthy yet ($s) - continuing anyway." -ForegroundColor Yellow }
else { Write-Host "PostgreSQL healthy." -ForegroundColor Green }

# -- 3. Migrations -----------------------------------------------
Step "Applying database migrations"
npx prisma migrate deploy

# -- 4. Initial sync (fired after the server is up) --------------
#    Runs in a background job so it doesn't block the server.
Step "Scheduling initial news sync"
Start-Job -ScriptBlock {
    # Wait for the server to answer, then trigger one sync
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
        try {
            $h = Invoke-WebRequest "http://localhost:3000/api/health" -TimeoutSec 4 -UseBasicParsing
            if ($h.StatusCode -eq 200) {
                Invoke-WebRequest "http://localhost:3000/api/affairs/ingest" -Method POST -TimeoutSec 80 -UseBasicParsing | Out-Null
                break
            }
        } catch { Start-Sleep -Seconds 5 }
    }
} | Out-Null
Write-Host "Initial sync will fire automatically once the server is live." -ForegroundColor Green

# -- 5. Production server (foreground) ---------------------------
#    Dev mode compiles every page on first visit = slow. Production
#    serves the prebuilt bundle instantly. Rebuild only when the code
#    is newer than the last build (or run:  npm run build  manually).
Step "Checking the production build"
$buildId = Join-Path $proj ".next\BUILD_ID"
$needBuild = -not (Test-Path $buildId)
if (-not $needBuild) {
    $built = (Get-Item $buildId).LastWriteTime
    $newest = Get-ChildItem (Join-Path $proj "src"), (Join-Path $proj "prisma") -Recurse -File |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($newest -and $newest.LastWriteTime -gt $built) { $needBuild = $true }
}
if ($needBuild) {
    Write-Host "Code changed since last build - building once (1-2 min)..." -ForegroundColor Yellow
    npm run build
} else {
    Write-Host "Build is current - starting instantly." -ForegroundColor Green
}

Step "Starting Conquer Capital (http://localhost:3000)"
npm start
