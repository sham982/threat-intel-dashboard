Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     TSEDEY BANK SECURITY COMMAND CENTER                      ║" -ForegroundColor Green
Write-Host "║     Threat Intelligence Dashboard                            ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Kill existing node processes
Write-Host "✓ Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Build and start backend
Write-Host "▶ Building Backend..." -ForegroundColor Cyan
cd "C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\api-server"
pnpm run build

Write-Host "▶ Starting Backend Server..." -ForegroundColor Cyan
$env:PORT = "3001"
$env:DATABASE_URL = "postgresql://postgres:1234@localhost:5432/threat_db"
$env:GROQ_API_KEY = "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"

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\api-server'
`$env:PORT='3001'
`$env:DATABASE_URL='postgresql://postgres:1234@localhost:5432/threat_db'
`$env:GROQ_API_KEY='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'
Write-Host '🔒 TSEDEY BANK API SERVER - Running on port 3001' -ForegroundColor Green
pnpm run start
"@ -WindowStyle Normal

Start-Sleep -Seconds 3

# Build and start frontend
Write-Host "▶ Building Frontend..." -ForegroundColor Cyan
cd "C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\threat-dashboard"
pnpm run build

Write-Host "▶ Starting Frontend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\threat-dashboard'
Write-Host '🌿 TSEDEY BANK SECURITY DASHBOARD - Running on port 5173' -ForegroundColor Green
pnpm run dev
"@ -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ All services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔑 Login Credentials:" -ForegroundColor Yellow
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Opening browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Press any key to close this window (servers will continue running)" -ForegroundColor Gray
Read-Host
