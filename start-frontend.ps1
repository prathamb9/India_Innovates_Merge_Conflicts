# ============================================================
#  SignalSync — Start Frontend
#  Run from the prototype/ root directory:
#    .\start-frontend.ps1
# ============================================================

$Root = $PSScriptRoot
$frontendDir = Join-Path $Root "signal-sync"

Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Cyan
Write-Host "   SignalSync Frontend Launcher" -ForegroundColor Cyan
Write-Host "  ==============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting Next.js on http://localhost:3000 ..." -ForegroundColor Yellow
Write-Host "(Press Ctrl+C in this window to stop the frontend)" -ForegroundColor DarkGray
Write-Host ""

Set-Location $frontendDir
npm run dev
