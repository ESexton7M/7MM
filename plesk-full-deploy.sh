#!/bin/bash

# Complete Plesk Deployment Script
# This will: stop running processes, install deps, build, fix permissions, and restart

set -e  # Exit on any error

echo "🚀 Complete Plesk Deployment"
echo "============================"
echo ""

APP_DIR="/var/www/vhosts/analytics.7mountainscreative.com/httpdocs"
cd "$APP_DIR" || exit 1

echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Stop any running Node.js processes
echo "1️⃣ Stopping existing Node.js processes..."
pkill -f 'node.*app.js' 2>/dev/null || echo "   No processes to kill"
pkill -f 'node.*startup.js' 2>/dev/null || echo "   No startup processes"
sleep 2
echo "   ✅ Processes stopped"
echo ""

# Step 2: Install dependencies
echo "2️⃣ Installing dependencies..."
echo "   Installing root dependencies..."
npm install --production || {
    echo "   ❌ Root npm install failed"
    exit 1
}

echo "   Installing analyzer dependencies..."
cd analyzer || exit 1
npm install || {
    echo "   ❌ Analyzer npm install failed"
    exit 1
}

echo "   Installing server dependencies..."
cd server || exit 1
npm install --production || {
    echo "   ❌ Server npm install failed"
    exit 1
}

cd ../.. || exit 1
echo "   ✅ All dependencies installed"
echo ""

# Step 3: Build the application
echo "3️⃣ Building application..."
cd analyzer || exit 1
npm run build || {
    echo "   ❌ Build failed"
    exit 1
}

cd .. || exit 1
echo "   ✅ Build completed successfully"
echo "   Built files in: analyzer/dist/"
echo ""

# Step 4: Create and fix cache directory permissions
echo "4️⃣ Setting up cache directory..."
mkdir -p analyzer/server/cache/project_tasks

# Detect web server user
if id "psaadm" &>/dev/null; then
    WEB_USER="psaadm"
elif id "apache" &>/dev/null; then
    WEB_USER="apache"
elif id "www-data" &>/dev/null; then
    WEB_USER="www-data"
else
    WEB_USER=$(whoami)
fi

echo "   Setting ownership to: $WEB_USER"
chown -R "$WEB_USER:$WEB_USER" analyzer/server/cache 2>/dev/null || echo "   (skipped - no sudo)"

echo "   Setting permissions..."
chmod -R 755 analyzer/server/cache
chmod -R u+w analyzer/server/cache

echo "   ✅ Cache directory configured"
echo ""

# Step 5: Verify deployment
echo "5️⃣ Verifying deployment..."
ISSUES_FOUND=false

if [ ! -f "analyzer/dist/index.html" ]; then
    echo "   ❌ Build output missing!"
    ISSUES_FOUND=true
else
    echo "   ✅ Build output exists"
fi

if [ ! -f "node_modules/express/package.json" ]; then
    echo "   ❌ Express not installed!"
    ISSUES_FOUND=true
else
    echo "   ✅ Express installed"
fi

if [ ! -d "analyzer/server/cache" ]; then
    echo "   ❌ Cache directory missing!"
    ISSUES_FOUND=true
else
    echo "   ✅ Cache directory exists"
fi

echo ""

if [ "$ISSUES_FOUND" = true ]; then
    echo "❌ Deployment completed with issues"
    echo "   Please review the errors above"
    exit 1
fi

# Step 6: Display next steps
echo "✅ ================================================"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "✅ ================================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Go to Plesk Control Panel"
echo "   → Websites & Domains"
echo "   → analytics.7mountainscreative.com"
echo "   → Node.js"
echo ""
echo "2️⃣  Configure Node.js settings:"
echo "   • Application Mode: Production"
echo "   • Node.js Version: 16.x or higher"
echo "   • Application Startup File: startup.js"
echo "   • Document Root: public_html or httpdocs"
echo ""
echo "3️⃣  Click 'Restart App' or 'Enable Node.js'"
echo ""
echo "4️⃣  Visit your site:"
echo "   https://analytics.7mountainscreative.com"
echo ""
echo "5️⃣  Test the API:"
echo "   https://analytics.7mountainscreative.com/api/health"
echo ""
echo "⚠️  IMPORTANT: Do NOT run 'npm start' manually!"
echo "    Let Plesk manage the Node.js process."
echo ""
echo "📊 Deployment Summary:"
echo "   • Dependencies: ✅ Installed"
echo "   • Build: ✅ Completed"
echo "   • Cache: ✅ Configured"
echo "   • Ready: ✅ Yes"
echo ""
