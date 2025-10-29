#!/bin/bash

# Check what's actually running on your Plesk server

echo "🔍 Server Diagnostic Check"
echo "=========================="
echo ""

cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs || exit 1

echo "1️⃣ Current Directory:"
pwd
echo ""

echo "2️⃣ Cache Directory Status:"
echo "Expected location: $(pwd)/analyzer/server/cache"
echo ""

if [ -d "analyzer/server/cache" ]; then
    echo "✅ Cache directory EXISTS"
    ls -la analyzer/server/cache/
    echo ""
    echo "Permissions:"
    ls -ld analyzer/server/cache
    echo ""
    echo "Owner:"
    stat -c "%U:%G" analyzer/server/cache 2>/dev/null || stat -f "%Su:%Sg" analyzer/server/cache 2>/dev/null
    echo ""
    echo "Can we write to it?"
    if [ -w "analyzer/server/cache" ]; then
        echo "✅ YES - Directory is writable"
        
        # Try to actually create a file
        touch analyzer/server/cache/test-write.txt 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Successfully created test file"
            rm analyzer/server/cache/test-write.txt
        else
            echo "❌ Failed to create test file (permission denied)"
        fi
    else
        echo "❌ NO - Directory is NOT writable"
    fi
else
    echo "❌ Cache directory does NOT exist"
    echo ""
    echo "Creating it now..."
    mkdir -p analyzer/server/cache/project_tasks
    chmod -R 777 analyzer/server/cache
    echo "✅ Created with 777 permissions"
fi
echo ""

echo "3️⃣ Checking app.js cache path:"
grep "CACHE_DIR = " app.js | head -1
echo ""

echo "4️⃣ Node.js Process Info:"
ps aux | grep node | grep -v grep
echo ""

echo "5️⃣ Test API Health Endpoint:"
curl -s https://analytics.7mountainscreative.com/api/health | python -m json.tool 2>/dev/null || curl -s https://analytics.7mountainscreative.com/api/health
echo ""
echo ""

echo "6️⃣ Test Cache Status Endpoint:"
curl -s https://analytics.7mountainscreative.com/api/cache/status 2>&1
echo ""
echo ""

echo "7️⃣ Check Plesk Error Logs (last 20 lines):"
if [ -f "/var/www/vhosts/analytics.7mountainscreative.com/logs/error_log" ]; then
    tail -20 /var/www/vhosts/analytics.7mountainscreative.com/logs/error_log
else
    echo "Error log not found"
fi
echo ""

echo "================================================"
echo "DIAGNOSTIC COMPLETE"
echo "================================================"
