param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference = 'Stop'
$agentConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
$agentConfig = Get-Content -LiteralPath $agentConfigPath -Raw | ConvertFrom-Json
$agentApi = [Uri]$agentConfig.api_url
if ($agentApi.Host -notin @('localhost','127.0.0.1','::1')) { throw 'Este iniciador aceita somente uma API no localhost.' }
Get-Command ollama -ErrorAction Stop | Out-Null
Get-Command ffmpeg -ErrorAction Stop | Out-Null
$env:HURTZ_CREATIVE_CONFIG = $agentConfigPath
$agentScript = Join-Path (Split-Path -Parent $PSScriptRoot) 'Hurtz Creative Analyzer/agent.py'
python $agentScript
