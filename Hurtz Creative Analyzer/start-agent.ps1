param([string]$ConfigPath)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $root 'agent.log'
if ($ConfigPath) { $env:HURTZ_CREATIVE_CONFIG = (Resolve-Path -LiteralPath $ConfigPath).Path }
Set-Location $root
py -3 agent.py *>> $log
