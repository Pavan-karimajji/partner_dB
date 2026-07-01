@echo off
echo.
echo  L^&T EPS -- ADAS Partner Evaluation Dashboard
echo  -----------------------------------------------
echo.

:: Use the venv's Python if it exists, otherwise fall back to system Python
set PYEXE=%~dp0.venv\Scripts\python.exe
if not exist "%PYEXE%" (
    echo  No .venv found -- run installation.bat first for an isolated environment.
    set PYEXE=python
)

:: Check Python is available
"%PYEXE%" --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found. Install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

:: Install Flask if not present
"%PYEXE%" -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo  Installing Flask...
    "%PYEXE%" -m pip install flask --quiet
)

:: Run server (opens browser automatically)
echo  Starting server at http://localhost:5000
echo  Press Ctrl+C to stop.
echo.
"%PYEXE%" "%~dp0server.py"
pause
