$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -State Listen -LocalPort 8091 -ErrorAction SilentlyContinue
if ($listener) {
    $localProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener[0].OwningProcess)"
    if ($localProcess.CommandLine -notmatch 'dev[/\\]local-server\.cjs') { throw 'A porta 8091 está sendo usada por outro processo.' }
    $serverProcess = [System.Diagnostics.Process]::GetProcessById($localProcess.ProcessId)
    $serverProcess.Kill()
    $serverProcess.WaitForExit(10000) | Out-Null
}
$logDirectory = Join-Path $projectDirectory '.codex-tmp'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
Start-Process -FilePath node -ArgumentList 'dev/local-server.cjs' -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'local-server.out.log') -RedirectStandardError (Join-Path $logDirectory 'local-server.err.log')
Write-Output 'Aplicativo local: http://localhost:8091'
