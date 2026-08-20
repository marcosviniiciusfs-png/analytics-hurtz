@echo off
setlocal
set "EXTENSAO=%~dp0extensao-hurtz"

if not exist "%EXTENSAO%\manifest.json" (
  echo [ERRO] A pasta da extensao nao foi encontrada.
  pause
  exit /b 1
)

start "" explorer.exe "%EXTENSAO%"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "edge://extensions"
) else (
  start "" "chrome://extensions"
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('1. Ative o Modo do desenvolvedor.`n2. Clique em Carregar sem compactacao.`n3. Selecione a pasta extensao-hurtz que foi aberta.`n4. Fixe a extensao Assistente Hurtz na barra do navegador.','Instalar extensao Assistente Hurtz','OK','Information') | Out-Null"
exit /b 0
