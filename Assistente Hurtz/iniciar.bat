@echo off
setlocal
cd /d "%~dp0"
if not exist "venv\Scripts\python.exe" (
  echo [ERRO] Ambiente Python ausente. Execute instalar-windows.bat primeiro.
  pause
  exit /b 1
)
where ollama >nul 2>nul || (echo [ERRO] Instale o Ollama em https://ollama.com/download/windows & pause & exit /b 1)
start "Assistente Hurtz Backend" cmd /k "venv\Scripts\python.exe backend\main.py"
cd overlay
npm start

