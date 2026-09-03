$ErrorActionPreference = "Stop"
# Alguns ambientes de desenvolvimento definem esta variável e fazem o
# Electron executar como Node puro. O produto sempre precisa do runtime gráfico.
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $project "venv\Scripts\python.exe"
$overlay = Join-Path $project "overlay"
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$ollama = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
$dataDirectory = Join-Path $project "data"

if (-not (Test-Path -LiteralPath $python)) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "O ambiente Python não foi encontrado. Execute o instalador do Assistente Hurtz primeiro.",
        "Assistente Hurtz",
        "OK",
        "Error"
    ) | Out-Null
    exit 1
}

# O aplicativo gráfico do Ollama pode estar fechado mesmo após a instalação.
# Garante a API local antes de subir o backend para evitar estados de espera infinitos.
$ollamaReady = $false
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null
    $ollamaReady = $true
} catch {
    if (Test-Path -LiteralPath $ollama) {
        Start-Process -FilePath $ollama -ArgumentList "serve" -WindowStyle Hidden
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            Start-Sleep -Milliseconds 500
            try {
                Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null
                $ollamaReady = $true
                break
            } catch {}
        }
    }
}
if (-not $ollamaReady) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "O Ollama não iniciou. Abra o Ollama pelo menu Iniciar e tente novamente.",
        "Assistente Hurtz",
        "OK",
        "Error"
    ) | Out-Null
    exit 1
}

# Garante instância única e remove backends antigos que poderiam manter código
# incompatível atendendo a porta local do overlay.
$projectPattern = [Regex]::Escape($project)
Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "python.exe" -and
        $_.CommandLine -match "backend\\main.py" -and
        ($_.ExecutablePath -match $projectPattern -or $_.CommandLine -match $projectPattern)
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

foreach ($requiredPort in @(8765, 8766)) {
    $portOwner = Get-NetTCPConnection -LocalPort $requiredPort -State Listen -ErrorAction SilentlyContinue
    if ($portOwner) {
        $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($portOwner.OwningProcess)"
        if ($owner.CommandLine -match "backend\\main.py") {
            Stop-Process -Id $owner.ProcessId -Force -ErrorAction SilentlyContinue
        } else {
            Add-Type -AssemblyName PresentationFramework
            [System.Windows.MessageBox]::Show(
                "A porta $requiredPort está sendo usada por outro programa. Feche-o e tente novamente.",
                "Assistente Hurtz",
                "OK",
                "Error"
            ) | Out-Null
            exit 1
        }
    }
}
Start-Sleep -Milliseconds 350
New-Item -ItemType Directory -Force -Path $dataDirectory | Out-Null

$backend = $null
try {
    $backend = Start-Process -FilePath $python `
        -ArgumentList @("-u", "backend\main.py") `
        -WorkingDirectory $project `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $dataDirectory "backend.log") `
        -RedirectStandardError (Join-Path $dataDirectory "backend-error.log") `
        -PassThru

    $electron = Start-Process -FilePath $npm `
        -ArgumentList @("start") `
        -WorkingDirectory $overlay `
        -WindowStyle Hidden `
        -PassThru

    $electron.WaitForExit()
}
finally {
    if ($backend -and -not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
}
