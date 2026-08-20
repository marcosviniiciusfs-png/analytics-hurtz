@echo off
setlocal
cd /d "%~dp0"
py -3.12 --version >nul 2>nul || (echo [INTERVENCAO HUMANA NECESSARIA] Instale Python 3.12 em https://www.python.org/downloads/windows/ marcando Add Python to PATH. & pause & exit /b 1)
py -3.12 -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
cd overlay
npm install
cd ..
where ollama >nul 2>nul || (echo [INTERVENCAO HUMANA NECESSARIA] Instale Ollama: https://ollama.com/download/windows & pause & exit /b 1)
ollama pull llama3.2:3b
echo [OK] Instalacao concluida. Execute iniciar.bat.
pause

