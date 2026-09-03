@echo off
setlocal
cd /d "%~dp0"
if not exist "Hurtz Launcher.exe" (
  echo [ERRO] Hurtz Launcher.exe nao foi encontrado.
  pause
  exit /b 1
)
start "" "Hurtz Launcher.exe"
