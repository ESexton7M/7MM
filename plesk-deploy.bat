@echo off
REM Plesk-Safe Deployment Script for Asana Analytics (Windows)
REM Run this from the root directory: plesk-deploy.bat

echo 🚀 Starting Plesk-safe deployment...
echo 📁 Current directory: %cd%

REM Step 1: Install root dependencies
echo 📦 Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Root npm install failed
    exit /b 1
)

REM Step 2: Install analyzer dependencies
echo 📦 Installing analyzer dependencies...
cd analyzer
call npm install
if %errorlevel% neq 0 (
    echo ❌ Analyzer npm install failed
    exit /b 1
)

REM Step 3: Install server dependencies
echo 📦 Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ❌ Server npm install failed
    exit /b 1
)

REM Step 4: Go back and build
echo 🔨 Building application...
cd ..\..
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ Deployment setup complete!
echo.
echo 🎯 Next steps:
echo 1. Run: npm run server:start
echo 2. Server will start on safe port (8080-8090)
echo 3. Access your app at: http://yoursite.com:PORT
echo.
echo 📊 The server includes:
echo    • Safe port management (no process conflicts)
echo    • Automatic cache refresh every 2 days
echo    • Shared caching for all users
echo.