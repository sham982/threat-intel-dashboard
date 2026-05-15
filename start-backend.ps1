# Tsedey Bank Backend Service Script
cd "C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\api-server"

$env:PORT = "3001"
$env:DATABASE_URL = "postgresql://postgres:1234@localhost:5432/threat_db"
$env:GROQ_API_KEY = "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"
$env:NODE_ENV = "production"

# Log file
$logFile = "C:\Users\hp\Desktop\New folder\threat-intel-dashboard\logs\backend.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $logFile -Value "[$timestamp] Backend service starting..."
pnpm run start >> $logFile 2>&1
