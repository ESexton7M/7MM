#!/bin/bash

# Fix Plesk permissions for cache directories
# Run this on your Plesk server via SSH

echo "🔧 Fixing Plesk permissions for Asana Analytics..."

# Get the current directory
APP_DIR="/var/www/vhosts/analytics.7mountainscreative.com/httpdocs"

echo "📁 Application directory: $APP_DIR"

# Create cache directories if they don't exist
echo "📂 Creating cache directories..."
mkdir -p "$APP_DIR/analyzer/server/cache/project_tasks"

# Set ownership to the web server user (usually psaadm or www-data for Plesk)
# Try common Plesk users
if id "psaadm" &>/dev/null; then
    WEB_USER="psaadm"
elif id "apache" &>/dev/null; then
    WEB_USER="apache"
elif id "www-data" &>/dev/null; then
    WEB_USER="www-data"
else
    # Get the current user as fallback
    WEB_USER=$(whoami)
fi

echo "👤 Setting ownership to user: $WEB_USER"

# Set proper ownership
chown -R "$WEB_USER:$WEB_USER" "$APP_DIR/analyzer/server/cache"

# Set proper permissions (read/write for owner, read for group)
echo "🔐 Setting permissions..."
chmod -R 755 "$APP_DIR/analyzer/server/cache"
chmod -R 755 "$APP_DIR/analyzer/server/cache/project_tasks"

# Ensure the cache directory is writable
chmod -R u+w "$APP_DIR/analyzer/server/cache"

echo "✅ Permissions fixed!"
echo ""
echo "📊 Cache directory status:"
ls -la "$APP_DIR/analyzer/server/cache/"
echo ""
echo "🎯 Next step: Restart your Node.js application in Plesk"
