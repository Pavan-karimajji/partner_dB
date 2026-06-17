@echo off
echo.
echo  L^&T EPS -- ADAS Partner Evaluation Dashboard
echo  -----------------------------------------------
echo.

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found. Install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

:: Install Flask if not present
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo  Installing Flask...
    python -m pip install flask --quiet
)

:: Run server (opens browser automatically)
echo  Starting server at http://localhost:5000
echo  Press Ctrl+C to stop.
echo.
python "%~dp0server.py"
pause
