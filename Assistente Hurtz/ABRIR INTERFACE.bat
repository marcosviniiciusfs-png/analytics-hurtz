@echo off
setlocal
cd /d "%~dp0overlay"
if not exist "node_modules\electron" (
  echo [INFO] Preparando a interface pela primeira vez...
  call npm install
)
call npm start

