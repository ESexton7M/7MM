#!/bin/bash

# Fix permissions for Vite and other Node.js executables on Plesk
echo "Fixing permissions for Node.js executables..."

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Fix permissions for common Node.js executables
if [ -d "node_modules/.bin" ]; then
    echo "Setting execute permissions for node_modules/.bin/*"
    chmod +x node_modules/.bin/*
    
    # Specifically ensure vite has execute permissions
    if [ -f "node_modules/.bin/vite" ]; then
        chmod +x node_modules/.bin/vite
        echo "✓ Vite permissions fixed"
    fi
    
    # Fix other common executables
    for exec in tsc eslint postcss tailwindcss; do
        if [ -f "node_modules/.bin/$exec" ]; then
            chmod +x "node_modules/.bin/$exec"
            echo "✓ $exec permissions fixed"
        fi
    done
else
    echo "node_modules/.bin directory not found. Run 'npm install' first."
    exit 1
fi

echo "Permission fix complete!"
echo ""
echo "You can now run:"
echo "  npm run dev"
echo "  npm run build"
echo "  npm run preview"