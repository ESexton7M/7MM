#!/bin/bash

# Kill Node.js processes and free port 8080
# Run this if you get "EADDRINUSE" error

echo "🔪 Killing Node.js processes..."
echo ""

# Find and display processes using port 8080
echo "Processes using port 8080:"
if command -v lsof &> /dev/null; then
    lsof -i :8080 || echo "No processes found on port 8080"
    echo ""
    
    # Get PIDs
    PIDS=$(lsof -t -i :8080)
    if [ ! -z "$PIDS" ]; then
        echo "Killing PIDs: $PIDS"
        kill -9 $PIDS
        echo "✅ Processes killed"
    fi
elif command -v netstat &> /dev/null; then
    netstat -tulpn | grep :8080 || echo "No processes found on port 8080"
fi

echo ""

# Kill any node processes running app.js or startup.js
echo "Killing all Node.js app processes..."
pkill -f 'node.*app.js' && echo "✅ Killed app.js processes" || echo "No app.js processes found"
pkill -f 'node.*startup.js' && echo "✅ Killed startup.js processes" || echo "No startup.js processes found"

echo ""

# Show remaining node processes
echo "Remaining Node.js processes:"
ps aux | grep node | grep -v grep || echo "No Node.js processes running"

echo ""
echo "✅ Done! Port 8080 should now be free."
echo ""
echo "Next steps:"
echo "1. Use Plesk Node.js interface to start your app"
echo "2. OR run: node startup.js (only if NOT using Plesk Node.js)"
