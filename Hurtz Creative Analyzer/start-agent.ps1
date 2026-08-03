$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $root 'agent.log'
Set-Location $root
py -3 agent.py *>> $log
