$ErrorActionPreference = "Stop"
$project = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$compiler = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$source = Join-Path $project "launcher\Launcher.cs"
$output = Join-Path $project "Hurtz Launcher.exe"
$icon = Join-Path $project "assets\hurtz-logo.ico"

if (-not (Test-Path -LiteralPath $compiler)) { throw "Compilador C# do Windows não encontrado." }
if (-not (Test-Path -LiteralPath $icon)) { throw "Ícone não encontrado. Execute gerar-assets-logo.ps1 primeiro." }

& $compiler /nologo /target:winexe /optimize+ `
    /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll `
    /win32icon:"$icon" /out:"$output" "$source"
if ($LASTEXITCODE -ne 0) { throw "Não foi possível compilar o Hurtz Launcher." }

Write-Host "[OK] Launcher compilado: $output"
