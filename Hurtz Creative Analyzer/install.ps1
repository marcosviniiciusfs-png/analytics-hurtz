$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $root 'config.json'))) { throw 'O arquivo config.json ainda não foi criado.' }
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw 'Instale o Ollama antes de continuar.' }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'Instale o FFmpeg antes de continuar.' }
Start-Process ollama -ArgumentList 'serve' -WindowStyle Hidden -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
ollama pull qwen2.5vl:3b
$agentScript = Join-Path $root 'start-agent.ps1'
$runCommand = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$agentScript`""
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
New-Item -Path $runKey -Force | Out-Null
New-ItemProperty -Path $runKey -Name 'HurtzCreativeAnalyzer' -Value $runCommand -PropertyType String -Force | Out-Null
Start-Process powershell.exe -ArgumentList "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$agentScript`"" -WindowStyle Hidden
Write-Host 'Hurtz Creative Analyzer instalado e iniciado.' -ForegroundColor Green
