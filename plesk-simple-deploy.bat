@echo off
REM Simple Plesk Deployment - Windows Version
REM Upload this to your Plesk server and run it via Plesk terminal

echo ========================================
echo Plesk Deployment Starting...
echo ========================================
echo.

cd /d "C:\inetpub\vhosts\analytics.7mountainscreative.com\httpdocs" 2>nul
if errorlevel 1 cd /d "%CD%"

echo Current directory: %CD%
echo.

REM Kill existing Node processes (Windows)
echo 1. Stopping existing processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

REM Install root dependencies
echo 2. Installing root dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Root npm install failed
    pause
    exit /b 1
)
echo.

REM Install analyzer dependencies
echo 3. Installing analyzer dependencies...
cd analyzer
call npm install
if errorlevel 1 (
    echo ERROR: Analyzer npm install failed
    pause
    exit /b 1
)
echo.

REM Install server dependencies
echo 4. Installing server dependencies...
cd server
call npm install
cd ..\..
echo.

REM Build the app
echo 5. Building application...
cd analyzer
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
cd ..
echo.

REM Create cache directory
echo 6. Setting up cache...
if not exist "analyzer\server\cache\project_tasks" mkdir "analyzer\server\cache\project_tasks"
echo.

REM Verify
echo 7. Verifying...
if exist "analyzer\dist\index.html" (
    echo [OK] Build successful - index.html exists
) else (
    echo [ERROR] Build failed - index.html not found
)

if exist "node_modules\express\package.json" (
    echo [OK] Express installed
) else (
    echo [ERROR] Express not installed
)

if exist "analyzer\server\cache" (
    echo [OK] Cache directory exists
) else (
    echo [ERROR] Cache directory missing
)

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Go to Plesk -^> Node.js
echo 2. Set startup file: startup.js
echo 3. Click 'Restart App'
echo.
echo Then visit: https://analytics.7mountainscreative.com
echo.
pause
