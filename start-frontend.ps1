# Tsedey Bank Frontend Service Script
cd "C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\threat-dashboard"

$env:PORT = "5173"
$env:BASE_PATH = "/"

# Log file
$logFile = "C:\Users\hp\Desktop\New folder\threat-intel-dashboard\logs\frontend.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $logFile -Value "[$timestamp] Frontend service starting..."

# Use dev mode instead of serve (dev mode uses port 5173)
pnpm run dev -- --port 5173 --host 0.0.0.0 >> $logFile 2>&1
