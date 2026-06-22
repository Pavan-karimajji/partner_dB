@echo off
setlocal enabledelayedexpansion

echo.
echo  L^&T EPS -- ADAS Partner Evaluation Dashboard
echo  Installation
echo  -----------------------------------------------
echo.

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found on PATH.
    echo  Install Python 3.10+ from https://www.python.org/downloads/
    echo  and make sure to check "Add Python to PATH" during setup.
    pause
    exit /b 1
)

:: Detect version and warn if older than recommended
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
for /f "tokens=1,2 delims=." %%a in ("%PYVER%") do (
    set PYMAJOR=%%a
    set PYMINOR=%%b
)
echo  Found Python %PYVER%

if %PYMAJOR% LSS 3 (
    echo  WARNING: Python 2 detected. This project needs Python 3.10+.
    echo  Installation will likely fail -- please install a modern Python 3.
) else (
    if %PYMINOR% LSS 10 (
        echo  WARNING: Python %PYVER% is older than the recommended 3.10+.
        echo  Continuing anyway -- upgrade if you run into problems.
    )
)

echo.
echo  Installing dependencies from requirements.txt...
echo.
python -m pip install -r "%~dp0requirements.txt"
if errorlevel 1 (
    echo.
    echo  ERROR: Dependency installation failed. See the output above.
    pause
    exit /b 1
)

echo.
echo  Done. Run start.bat to launch the app.
pause
