# Tsedey Bank - Master Service Launcher
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     TSEDEY BANK SECURITY COMMAND CENTER                      ║" -ForegroundColor Green
Write-Host "║     Starting Services...                                     ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$logDir = "C:\Users\hp\Desktop\New folder\threat-intel-dashboard\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*"} | Select-Object -First 1).IPAddress

Write-Host "🌐 Local IP Address: $localIP" -ForegroundColor Cyan
Write-Host ""

# Kill existing node processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start Backend
Write-Host "Starting Backend API Server..." -ForegroundColor Cyan
$backendLog = "$logDir\backend.log"
$backendProcess = Start-Process -NoNewWindow -PassThru -FilePath "powershell.exe" -ArgumentList "-File `"C:\Users\hp\Desktop\New folder\threat-intel-dashboard\start-backend.ps1`"" 

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
$frontendLog = "$logDir\frontend.log"
$frontendProcess = Start-Process -NoNewWindow -PassThru -FilePath "powershell.exe" -ArgumentList "-File `"C:\Users\hp\Desktop\New folder\threat-intel-dashboard\start-frontend.ps1`""

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access URLs:" -ForegroundColor Yellow
Write-Host "   Local Access:    http://localhost:5173" -ForegroundColor White
Write-Host "   Network Access:  http://$localIP`:5173" -ForegroundColor White
Write-Host ""
Write-Host "📝 Logs Location: $logDir" -ForegroundColor Gray
Write-Host ""
Write-Host "🔑 Login: admin / admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Red
Write-Host ""

# Wait for user to press Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Check if processes are still running
        if ($backendProcess.HasExited) {
            Write-Host "⚠️ Backend process died! Restarting..." -ForegroundColor Yellow
            $backendProcess = Start-Process -NoNewWindow -PassThru -FilePath "powershell.exe" -ArgumentList "-File `"C:\Users\hp\Desktop\New folder\threat-intel-dashboard\start-backend.ps1`""
        }
        if ($frontendProcess.HasExited) {
            Write-Host "⚠️ Frontend process died! Restarting..." -ForegroundColor Yellow
            $frontendProcess = Start-Process -NoNewWindow -PassThru -FilePath "powershell.exe" -ArgumentList "-File `"C:\Users\hp\Desktop\New folder\threat-intel-dashboard\start-frontend.ps1`""
        }
    }
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Services stopped" -ForegroundColor Green
}
