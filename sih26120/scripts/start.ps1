# ORIGIN — Quick Start (Windows)
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $Root
$Port = 8088

# Free the port if a leftover uvicorn is holding it
$owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $owners) {
  Write-Host "Stopping leftover process on port $Port (PID $procId)..."
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting ORIGIN backend on http://127.0.0.1:$Port ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$ProjectRoot\backend'; if (Test-Path .\.venv\Scripts\activate) { .\.venv\Scripts\activate }; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port $Port --app-dir ."
)

Start-Sleep -Seconds 2

Write-Host "Starting ORIGIN frontend on http://localhost:5173 ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$ProjectRoot\frontend'; npm run dev"
)

Write-Host ""
Write-Host "Open http://localhost:5173"
Write-Host "API docs: http://127.0.0.1:$Port/docs"
Write-Host ""
Write-Host "If you still see WinError 10013, run:"
Write-Host "  netstat -ano | findstr :$Port"
Write-Host "  Stop-Process -Id <PID> -Force"
Write-Host "Then retry, or use --port 8088"
