@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "backend\requirements.txt" if exist "..\backend\requirements.txt" cd /d "%~dp0.."
title Instalacao do Assistente Hurtz

echo ============================================================
echo  ASSISTENTE HURTZ - INSTALACAO COMPLETA PARA WINDOWS
echo ============================================================
echo.

where winget >nul 2>nul
if errorlevel 1 (
  echo [ERRO] O Windows Package Manager nao foi encontrado.
  echo Atualize o "Instalador de Aplicativo" pela Microsoft Store:
  echo https://apps.microsoft.com/detail/9nblggh4nns1
  pause
  exit /b 1
)

echo [1/6] Instalando Python 3.12...
winget install --exact --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
if errorlevel 1 echo [AVISO] O Python pode ja estar instalado. A validacao sera feita adiante.

echo [2/6] Instalando Node.js LTS...
winget install --exact --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
if errorlevel 1 echo [AVISO] O Node.js pode ja estar instalado. A validacao sera feita adiante.

echo [3/6] Instalando Ollama...
winget install --exact --id Ollama.Ollama --scope user --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
if errorlevel 1 echo [AVISO] O Ollama pode ja estar instalado. A validacao sera feita adiante.

set "PYTHON312=%LocalAppData%\Programs\Python\Python312\python.exe"
if not exist "%PYTHON312%" (
  for /f "delims=" %%P in ('py -3.12 -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON312=%%P"
)
if not exist "%PYTHON312%" (
  echo [ERRO] Python 3.12 nao foi localizado. Reinicie o Windows e execute este arquivo novamente.
  pause
  exit /b 1
)

echo [4/6] Criando ambiente Python e instalando bibliotecas...
"%PYTHON312%" -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
if errorlevel 1 (
  echo [ERRO] Nao foi possivel instalar as bibliotecas Python.
  pause
  exit /b 1
)

echo [5/6] Instalando a interface visual...
set "NPM_CMD=npm.cmd"
if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
pushd overlay
call "%NPM_CMD%" install
if errorlevel 1 (
  popd
  echo [ERRO] Nao foi possivel instalar a interface Electron. Reinicie o Windows e tente novamente.
  pause
  exit /b 1
)
popd

echo [6/6] Baixando o modelo local de inteligencia artificial...
set "OLLAMA_EXE=%LocalAppData%\Programs\Ollama\ollama.exe"
if not exist "%OLLAMA_EXE%" set "OLLAMA_EXE=ollama.exe"
start "" "%OLLAMA_EXE%" app
timeout /t 5 /nobreak >nul
"%OLLAMA_EXE%" pull llama3.2:3b
if errorlevel 1 (
  echo [ERRO] O modelo de IA nao foi baixado. Abra o Ollama e execute este instalador novamente.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  INSTALACAO CONCLUIDA
echo ============================================================
echo Use "ABRIR INTERFACE.bat" para ver a tela.
echo Use "ABRIR ASSISTENTE COMPLETO.bat" para iniciar o sistema.
echo O modelo Whisper sera baixado automaticamente no primeiro uso.
echo.
pause
