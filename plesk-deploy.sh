#!/bin/bash

# Plesk-Safe Deployment Script for Asana Analytics
# Run this from the root directory: ./plesk-deploy.sh

echo "🚀 Starting Plesk-safe deployment..."
echo "📁 Current directory: $(pwd)"

# Step 1: Install root dependencies
echo "📦 Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Root npm install failed"
    exit 1
fi

# Step 2: Install analyzer dependencies
echo "📦 Installing analyzer dependencies..."
cd analyzer
npm install
if [ $? -ne 0 ]; then
    echo "❌ Analyzer npm install failed"
    exit 1
fi

# Step 3: Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "❌ Server npm install failed"
    exit 1
fi

# Step 4: Go back and build
echo "🔨 Building application..."
cd ../..
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Deployment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Run: npm run server:start"
echo "2. Server will start on safe port (8080-8090)"
echo "3. Access your app at: http://yoursite.com:PORT"
echo ""
echo "📊 The server includes:"
echo "   • Safe port management (no process conflicts)"
echo "   • Automatic cache refresh every 2 days"
echo "   • Shared caching for all users"
echo ""