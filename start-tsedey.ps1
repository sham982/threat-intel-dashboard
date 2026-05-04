Write-Host "Starting Tsedey Bank Security Dashboard..." -ForegroundColor Cyan
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     TSEDEY BANK SECURITY COMMAND CENTER                      ║" -ForegroundColor Green
Write-Host "║     Threat Intelligence Dashboard                            ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "▶ Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\api-server'; `$env:DATABASE_URL='postgresql://postgres:1234@localhost:5432/threat_db'; `$env:PORT='3000'; Write-Host 'Tsedey Bank Security API Server' -ForegroundColor Green; Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor DarkGray; pnpm run start"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "▶ Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\threat-dashboard'; `$env:PORT='5173'; `$env:BASE_PATH='/'; Write-Host 'Tsedey Bank Security Dashboard' -ForegroundColor Green; Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' -ForegroundColor DarkGray; pnpm run dev"

Write-Host ""
Write-Host "✓ Servers starting..." -ForegroundColor Green
Write-Host ""
Write-Host "  🔒 Backend API:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "  🌐 Frontend:      http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🎨 Theme: Dark Mode (default) with Light Mode toggle in sidebar"
Write-Host "  🏦 Colors: Tsedey Bank Brand Colors"
Write-Host ""
Write-Host "  Press any key to stop all servers..." -ForegroundColor Gray
