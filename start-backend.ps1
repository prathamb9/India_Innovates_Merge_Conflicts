# ============================================================
#  SignalSync — Start All Backend Services
#  Run from the prototype/ root directory:
#    .\start-backend.ps1
# ============================================================

$Root = $PSScriptRoot

Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Cyan
Write-Host "   SignalSync Backend Launcher" -ForegroundColor Cyan
Write-Host "  ==============================================" -ForegroundColor Cyan
Write-Host ""

$backendDir = Join-Path $Root "signal-sync\backend"
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"

# ── 1. Docker (PostgreSQL + Redis) ────────────────────────
Write-Host "[1/4] Starting Docker services (PostgreSQL + Redis)..." -ForegroundColor Yellow
Start-Process "cmd.exe" -ArgumentList "/k cd /d `"$backendDir`" && docker compose up -d && echo Docker services started." -WindowStyle Normal

Start-Sleep -Seconds 4   # give Docker a moment to spin up

# ── 2. FastAPI Server (Python backend) ───────────────────
Write-Host "[2/4] Installing requirements & Starting FastAPI server on http://localhost:8080 ..." -ForegroundColor Yellow

# If venv doesn't exist yet, create it first (separate step so cmd.exe doesn't choke)
if (-not (Test-Path (Join-Path $backendDir "venv\Scripts\python.exe"))) {
    Write-Host "    Creating virtual environment..." -ForegroundColor Gray
    Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$backendDir`" && python -m venv venv" -WindowStyle Normal -Wait
}

Start-Process "cmd.exe" -ArgumentList "/k cd /d `"$backendDir`" && call venv\Scripts\activate.bat && pip install -r requirements.txt && python -m uvicorn app.main:app --reload --port 8080" -WindowStyle Normal

Start-Sleep -Seconds 2

# ── 3. Edge AI MJPEG Video Streamer ──────────────────────
Write-Host "[3/4] Starting YOLO MJPEG Streamer on http://localhost:8001 ..." -ForegroundColor Yellow
$edgeDir = Join-Path $Root "edge-sim"
Start-Process "cmd.exe" -ArgumentList "/k cd /d `"$edgeDir`" && python streamer.py --video-north demo.mp4 --video-south `"WhatsApp Video 1.mp4`" --video-east `"WhatsApp Video 2.mp4`" --video-west `"WhatsApp Video 3.mp4`" --port 8001" -WindowStyle Normal

Start-Sleep -Seconds 2

# ── 4. Edge AI YOLO Runner (Firebase triggers) ───────────
Write-Host "[4/4] Starting YOLO Runner (Firebase IoT triggers)..." -ForegroundColor Yellow
Start-Process "cmd.exe" -ArgumentList "/k cd /d `"$edgeDir`" && python runner.py --video demo.mp4 --headless" -WindowStyle Normal

Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Green
Write-Host "   All backend services launched!" -ForegroundColor Green
Write-Host ""
Write-Host "   API Docs   => http://localhost:8080/docs" -ForegroundColor Green
Write-Host "   Video Feed => http://localhost:8001/video_feed" -ForegroundColor Green
Write-Host "  ==============================================" -ForegroundColor Green
Write-Host ""
