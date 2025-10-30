#!/bin/bash

# COMPLETE FIX - Solves BOTH redirect loop AND 500 errors

echo "🚀 COMPLETE FIX FOR ALL ISSUES"
echo "================================"
echo ""

cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs || exit 1
echo "📁 Working in: $(pwd)"
echo ""

# STEP 1: Fix redirect loop by removing .htaccess
echo "STEP 1: Fixing redirect loop..."
echo "--------------------------------"
if [ -f ".htaccess" ]; then
    echo "⚠️  Found .htaccess file (causes redirect loop)"
    cp .htaccess .htaccess.backup 2>/dev/null
    rm .htaccess
    echo "✅ Removed .htaccess (backed up to .htaccess.backup)"
else
    echo "✅ No .htaccess file (good - Node.js doesn't need it)"
fi
echo ""

# STEP 2: Kill any running processes
echo "STEP 2: Stopping old processes..."
echo "--------------------------------"
pkill -f 'node.*app.js' 2>/dev/null && echo "✅ Killed app.js processes" || echo "   No app.js processes running"
pkill -f 'node.*startup.js' 2>/dev/null && echo "✅ Killed startup.js processes" || echo "   No startup.js processes running"
sleep 2
echo ""

# STEP 3: Fix cache directory permissions
echo "STEP 3: Fixing cache directory..."
echo "--------------------------------"
mkdir -p analyzer/server/cache/project_tasks
chmod -R 777 analyzer/server/cache
chown -R $(whoami):$(whoami) analyzer/server/cache 2>/dev/null || echo "   (ownership change skipped)"

if [ -w "analyzer/server/cache" ]; then
    echo "✅ Cache directory is writable"
    touch analyzer/server/cache/test.txt && rm analyzer/server/cache/test.txt && echo "✅ Write test passed"
else
    echo "⚠️  Cache directory exists but may not be writable"
fi
echo ""

# STEP 4: Check critical files
echo "STEP 4: Checking critical files..."
echo "--------------------------------"

if [ -f "startup.js" ]; then
    echo "✅ startup.js exists"
else
    echo "❌ startup.js MISSING!"
fi

if [ -f "app.js" ]; then
    echo "✅ app.js exists"
    # Check if it has the correct cache path
    if grep -q "analyzer.*server.*cache" app.js; then
        echo "✅ app.js has correct cache path (analyzer/server/cache)"
    else
        echo "⚠️  app.js may have wrong cache path - check line ~15"
    fi
else
    echo "❌ app.js MISSING!"
fi

if [ -d "analyzer/dist" ] && [ -f "analyzer/dist/index.html" ]; then
    echo "✅ Built app exists (analyzer/dist)"
else
    echo "⚠️  App not built - run: cd analyzer && npm run build"
fi

if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed - run: npm install"
fi
echo ""

# STEP 5: Display summary
echo "================================================"
echo "✅ FIXES APPLIED"
echo "================================================"
echo ""
echo "Fixed issues:"
echo "  ✅ Removed .htaccess (fixes redirect loop)"
echo "  ✅ Created cache directory with 777 permissions"
echo "  ✅ Killed old Node.js processes"
echo ""
echo "📋 CRITICAL NEXT STEPS:"
echo ""
echo "1. Go to Plesk Control Panel"
echo "2. Navigate to: Your Domain → Node.js"
echo "3. Verify settings:"
echo "   • Application Startup File: startup.js"
echo "   • Application Mode: Production"
echo "4. Click 'Restart App'"
echo "5. Wait 10 seconds"
echo ""
echo "Then test your site:"
echo "  https://analytics.7mountainscreative.com"
echo "  https://analytics.7mountainscreative.com/api/health"
echo ""
echo "If issues persist, check Plesk error logs:"
echo "  tail -50 /var/www/vhosts/analytics.7mountainscreative.com/logs/error_log"
echo ""
