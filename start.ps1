# ════════════════════════════════════════════════════════════════
#  Conquer Capital — one-command startup
#  Brings up EVERYTHING in order:
#    1. Docker Desktop (if not running)
#    2. Containers: PostgreSQL + Redis + MinIO
#    3. Database migrations
#    4. Next.js dev server
#    5. Initial news sync (once the server is live)
#
#  Usage:  double-click start.bat  — or  — powershell -File start.ps1
# ════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"
$proj = $PSScriptRoot
Set-Location $proj

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# ── 1. Docker daemon ────────────────────────────────────────────
Step "Checking Docker"
docker info *>$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker not running — launching Docker Desktop..." -ForegroundColor Yellow
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

# ── 2. Containers ───────────────────────────────────────────────
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
if ($s -ne "healthy") { Write-Host "PostgreSQL not healthy yet ($s) — continuing anyway." -ForegroundColor Yellow }
else { Write-Host "PostgreSQL healthy." -ForegroundColor Green }

# ── 3. Migrations ───────────────────────────────────────────────
Step "Applying database migrations"
npx prisma migrate deploy

# ── 4. Initial sync (fired after the server is up) ──────────────
#    Runs in a background job so it doesn't block the dev server.
Step "Scheduling initial news sync"
Start-Job -ScriptBlock {
    # Wait for the dev server to answer, then trigger one sync
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

# ── 5. Dev server (foreground) ──────────────────────────────────
Step "Starting Conquer Capital (http://localhost:3000)"
npm run dev
