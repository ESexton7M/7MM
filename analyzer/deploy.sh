#!/bin/bash

# Deployment script for Plesk
echo "Installing server dependencies..."
cd server
npm install

echo "Setting proper permissions..."
chmod +x node_modules/.bin/*

echo "Creating cache directory..."
mkdir -p cache
chmod 755 cache

echo "Building client application..."
cd ..
npm run build

echo "Starting server..."
cd server
npm start