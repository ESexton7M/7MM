#!/bin/bash

# Simple Plesk Deployment Script
# Minimal commands, maximum compatibility

echo "🚀 Plesk Deployment Starting..."
echo ""

# Change to app directory
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs || exit 1
echo "📁 Working in: $(pwd)"
echo ""

# Kill existing processes
echo "1️⃣ Stopping existing processes..."
pkill -f 'node.*app.js' 2>/dev/null && echo "   Killed app.js processes" ||a echo "   No app.js processes"
pkill -f 'node.*startup.js' 2>/dev/null && echo "   Killed startup.js processes" || echo "   No startup.js processes"
sleep 2
echo ""

# Install root dependencies
echo "2️⃣ Installing root dependencies..."
npm install
echo ""

# Install analyzer dependencies
echo "3️⃣ Installing analyzer dependencies..."
cd analyzer
npm install
echo ""

# Install server dependencies
echo "4️⃣ Installing server dependencies..."
cd server
npm install
cd ../..
echo ""

# Build the app
echo "5️⃣ Building application..."
cd analyzer
npm run build
cd ..
echo ""

# Create cache directory
echo "6️⃣ Setting up cache..."
mkdir -p analyzer/server/cache/project_tasks
chmod -R 755 analyzer/server/cache 2>/dev/null || true
chmod -R u+w analyzer/server/cache 2>/dev/null || true
echo ""

# Verify
echo "7️⃣ Verifying..."
echo ""

if [ -f "analyzer/dist/index.html" ]; then
    echo "✅ Build successful - index.html exists"
else
    echo "❌ Build failed - index.html not found"
fi

if [ -f "node_modules/express/package.json" ]; then
    echo "✅ Express installed"
else
    echo "❌ Express not installed"
fi

if [ -d "analyzer/server/cache" ]; then
    echo "✅ Cache directory exists"
else
    echo "❌ Cache directory missing"
fi

echo ""
echo "✅ ================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "✅ ================================================"
echo ""
echo "Next steps:"
echo "1. Go to Plesk → Node.js"
echo "2. Set startup file: startup.js"
echo "3. Click 'Restart App'"
echo ""
echo "Then visit: https://analytics.7mountainscreative.com"
echo ""
