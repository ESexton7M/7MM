#!/bin/bash

# Remove/Disable .htaccess to fix redirect loop

echo "🔧 Fixing Redirect Loop"
echo "======================="
echo ""

cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs || exit 1

echo "Current directory: $(pwd)"
echo ""

# Check if .htaccess exists
if [ -f ".htaccess" ]; then
    echo "Found .htaccess file"
    echo ""
    echo "Current contents:"
    cat .htaccess
    echo ""
    echo "---"
    echo ""
    
    # Backup the old one
    if [ -f ".htaccess.backup" ]; then
        rm .htaccess.backup
    fi
    cp .htaccess .htaccess.backup
    echo "✅ Backed up to .htaccess.backup"
    
    # Remove it completely
    rm .htaccess
    echo "✅ Removed .htaccess"
    echo ""
    echo "⚠️  .htaccess has been REMOVED"
    echo "   Plesk Node.js doesn't need it"
    echo "   All routing is handled by startup.js/app.js"
else
    echo "No .htaccess file found (this is good for Node.js apps)"
fi

echo ""
echo "================================================"
echo "✅ FIX APPLIED"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Go to Plesk → Node.js"
echo "2. Make sure 'Application Startup File' is set to: startup.js"
echo "3. Click 'Restart App'"
echo ""
echo "Then test: https://analytics.7mountainscreative.com"
echo ""
