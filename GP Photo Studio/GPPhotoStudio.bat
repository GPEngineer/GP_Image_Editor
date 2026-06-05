@echo off
title GP Photo Studio Launcher

echo ==========================================
echo        GP Photo Studio 2.0.0 STARTER
echo ==========================================
echo.

cd /d "%~dp0"

REM ==============================
REM 1. CHECK PYTHON
REM ==============================
where python >nul 2>nul
if %errorlevel%==0 (
    set SERVER=python
    goto RUN
)

echo [INFO] Python NIE jest zainstalowany.

choice /C YN /M "Czy chcesz kontynuowac i sprobowac instalacji Node fallback (Y/N)?"
if %errorlevel%==2 goto WARNING

REM ==============================
REM 2. FALLBACK NODE SERVER
REM ==============================
where node >nul 2>nul
if %errorlevel%==0 (
    echo [INFO] Uzywam Node.js fallback server...
    start http://localhost:8080
    npx http-server . -p 8080
    pause
    exit
)

echo [ERROR] Brak Python i Node.
goto WARNING

REM ==============================
REM 3. RUN PYTHON SERVER
REM ==============================
:RUN
echo [OK] Uruchamiam lokalny serwer Python...
echo.

start http://localhost:8000
python -m http.server 8000
pause
exit

REM ==============================
REM 4. WARNING SECTION
REM ==============================
:WARNING
echo.
echo ==========================================
echo   UWAGA - BRAK SERWERA LOKALNEGO
echo ==========================================
echo.

echo Aplikacja moze nie dzialac poprawnie bez:
echo - Python (zalecane)
echo - Node.js (fallback)
echo.

choice /C YN /M "Czy mimo to uruchomic przegladarke? (Y/N)"
if %errorlevel%==1 (
    start index.html
) else (
    echo Anulowano.
)

pause
