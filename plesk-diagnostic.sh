#!/bin/bash

# Plesk Diagnostic and Fix Script
# Run this to diagnose and fix deployment issues

echo "🔍 Plesk Deployment Diagnostic Tool"
echo "===================================="
echo ""

APP_DIR="/var/www/vhosts/analytics.7mountainscreative.com/httpdocs"
cd "$APP_DIR" || exit 1

echo "📁 Current directory: $(pwd)"
echo ""

# Check Node.js version
echo "1️⃣ Node.js Version:"
node --version
echo ""

# Check if processes are running on port 8080
echo "2️⃣ Checking for processes using port 8080:"
if command -v lsof &> /dev/null; then
    lsof -i :8080 || echo "Port 8080 is free"
elif command -v netstat &> /dev/null; then
    netstat -tulpn | grep :8080 || echo "Port 8080 is free"
else
    echo "Cannot check port (lsof/netstat not available)"
fi
echo ""

# Check for any running node processes
echo "3️⃣ All Node.js processes running:"
ps aux | grep node | grep -v grep || echo "No node processes found"
echo ""

# Check if dependencies are installed
echo "4️⃣ Checking dependencies:"
if [ -d "node_modules" ]; then
    echo "✅ Root node_modules exists"
    if [ -f "node_modules/express/package.json" ]; then
        echo "✅ Express is installed"
    else
        echo "❌ Express is NOT installed"
    fi
else
    echo "❌ Root node_modules does NOT exist"
fi

if [ -d "analyzer/node_modules" ]; then
    echo "✅ analyzer/node_modules exists"
else
    echo "❌ analyzer/node_modules does NOT exist"
fi

if [ -d "analyzer/server/node_modules" ]; then
    echo "✅ analyzer/server/node_modules exists"
else
    echo "❌ analyzer/server/node_modules does NOT exist"
fi
echo ""

# Check if build exists
echo "5️⃣ Checking build:"
if [ -d "analyzer/dist" ]; then
    echo "✅ analyzer/dist exists"
    if [ -f "analyzer/dist/index.html" ]; then
        echo "✅ Built index.html exists"
        # Check build date
        BUILD_DATE=$(stat -c %y "analyzer/dist/index.html" 2>/dev/null || stat -f "%Sm" "analyzer/dist/index.html" 2>/dev/null)
        echo "   Built on: $BUILD_DATE"
    else
        echo "❌ Built index.html does NOT exist"
    fi
else
    echo "❌ analyzer/dist does NOT exist - App not built!"
fi
echo ""

# Check cache directory
echo "6️⃣ Checking cache directory:"
if [ -d "analyzer/server/cache" ]; then
    echo "✅ Cache directory exists"
    ls -la analyzer/server/cache/ | head -10
    echo "   Permissions:"
    ls -ld analyzer/server/cache
    if [ -w "analyzer/server/cache" ]; then
        echo "✅ Cache directory is writable"
    else
        echo "❌ Cache directory is NOT writable"
    fi
else
    echo "❌ Cache directory does NOT exist"
fi
echo ""

# Check important files
echo "7️⃣ Checking important files:"
for file in "app.js" "startup.js" "package.json" ".htaccess"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is MISSING"
    fi
done
echo ""

# Check Plesk Node.js configuration (if accessible)
echo "8️⃣ Plesk Node.js Info:"
if [ -f "/var/www/vhosts/analytics.7mountainscreative.com/conf/nodeapp.json" ]; then
    echo "Plesk Node.js config found:"
    cat /var/www/vhosts/analytics.7mountainscreative.com/conf/nodeapp.json
else
    echo "Plesk Node.js config not found (normal if managed via panel)"
fi
echo ""

echo "================================================"
echo "🎯 RECOMMENDATIONS:"
echo "================================================"
echo ""

# Provide recommendations
NEEDS_BUILD=false
NEEDS_INSTALL=false
NEEDS_PERMISSIONS=false
NEEDS_PORT_FIX=false

if [ ! -d "analyzer/dist" ] || [ ! -f "analyzer/dist/index.html" ]; then
    NEEDS_BUILD=true
fi

if [ ! -d "node_modules" ]; then
    NEEDS_INSTALL=true
fi

if [ -d "analyzer/server/cache" ] && [ ! -w "analyzer/server/cache" ]; then
    NEEDS_PERMISSIONS=true
fi

if lsof -i :8080 &> /dev/null || netstat -tulpn 2>/dev/null | grep -q :8080; then
    NEEDS_PORT_FIX=true
fi

if [ "$NEEDS_INSTALL" = true ]; then
    echo "⚠️  Dependencies not installed. Run:"
    echo "    npm install"
    echo "    cd analyzer && npm install"
    echo "    cd server && npm install"
    echo ""
fi

if [ "$NEEDS_BUILD" = true ]; then
    echo "⚠️  App not built. Run:"
    echo "    cd analyzer && npm run build"
    echo ""
fi

if [ "$NEEDS_PERMISSIONS" = true ]; then
    echo "⚠️  Cache directory not writable. Run:"
    echo "    ./fix-plesk-permissions.sh"
    echo ""
fi

if [ "$NEEDS_PORT_FIX" = true ]; then
    echo "⚠️  Port 8080 is in use. Kill existing process:"
    echo "    pkill -f 'node.*app.js'"
    echo "    OR use Plesk panel to stop the app first"
    echo ""
fi

echo "📝 For Plesk deployment, you should:"
echo "   1. Stop any manually started Node.js processes"
echo "   2. Use Plesk Node.js interface to manage the app"
echo "   3. Set startup file to: startup.js"
echo "   4. Let Plesk handle the port (don't run npm start manually)"
echo ""

echo "🔄 To properly deploy, run:"
echo "    ./plesk-full-deploy.sh"
echo ""
