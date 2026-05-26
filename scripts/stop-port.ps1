# Stop processes listening on a TCP port (Windows).
# Usage: .\scripts\stop-port.ps1 3001
#        npm run api:stop

param(
  [Parameter(Position = 0)]
  [int]$Port = 3001
)

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Host "No process is listening on port $Port."
  exit 0
}

$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $pids) {
  try {
    $proc = Get-Process -Id $pid -ErrorAction Stop
    Write-Host "Stopping PID $pid ($($proc.ProcessName))..."
    Stop-Process -Id $pid -Force -ErrorAction Stop
    Write-Host "  Stopped."
  } catch {
    Write-Host "  Could not stop PID $pid : $_"
    Write-Host "  Try: Run PowerShell as Administrator, then run this script again."
  }
}

Start-Sleep -Seconds 1
$still = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($still) {
  Write-Host "Port $Port is still in use. Remaining PIDs:"
  $still | ForEach-Object { Write-Host "  PID $($_.OwningProcess)" }
  exit 1
}

Write-Host "Port $Port is free."
