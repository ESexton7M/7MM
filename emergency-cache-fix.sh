#!/bin/bash

# Emergency Cache Fix - Force create with maximum permissions

echo "🚨 Emergency Cache Directory Fix"
echo "================================="
echo ""

cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs || exit 1

echo "Current directory: $(pwd)"
echo ""

# Remove old cache if it exists (in wrong location)
if [ -d "server/cache" ]; then
    echo "⚠️  Found old cache directory at server/cache (wrong location)"
    echo "   This should be at analyzer/server/cache"
fi
echo ""

# Create cache directory with full permissions
echo "Creating cache directory..."
mkdir -p analyzer/server/cache/project_tasks

echo "Setting maximum permissions (777)..."
chmod -R 777 analyzer/server/cache

echo "Setting ownership to current user..."
chown -R $(whoami):$(whoami) analyzer/server/cache 2>/dev/null || echo "(skipped - no sudo access)"

echo ""
echo "✅ Cache directory created/fixed"
echo ""

# Verify
echo "Verification:"
ls -la analyzer/server/cache/
echo ""
ls -ld analyzer/server/cache

echo ""
echo "Testing write access..."
touch analyzer/server/cache/test-file.txt && echo "✅ Write test PASSED" || echo "❌ Write test FAILED"
rm analyzer/server/cache/test-file.txt 2>/dev/null

echo ""
echo "================================================"
echo "Next step: Restart your Node.js app in Plesk"
echo "================================================"
