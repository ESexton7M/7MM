# 🚨 COMPLETE PLESK DEPLOYMENT GUIDE - FIX ALL ISSUES

## Current Issues
1. ❌ **Port 8080 already in use** - Multiple Node.js processes running
2. ❌ **500 Internal Server Error** on `/api/health` 
3. ❌ **Old code deployed** - Missing ecommerce filter and latest features

---

## ✅ SOLUTION: Complete Redeployment

### **Step 1: Upload ALL Files to Plesk**

Upload these files via FTP/SFTP or Plesk File Manager to `httpdocs/`:

**Updated Files:**
- ✅ `app.js` (fixed cache directory path)
- ✅ `startup.js`
- ✅ `package.json`
- ✅ `.htaccess` (removed Passenger directives)

**Deployment Scripts:**
- ✅ `plesk-full-deploy.sh` (complete deployment)
- ✅ `plesk-diagnostic.sh` (diagnostic tool)
- ✅ `kill-node-processes.sh` (kill port conflicts)
- ✅ `fix-plesk-permissions.sh` (fix permissions)

**Source Code:** (CRITICAL - contains latest features)
- ✅ Entire `analyzer/` folder with latest source code

---

### **Step 2: Run Complete Deployment Script**

**Via SSH:**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# Make scripts executable
chmod +x plesk-full-deploy.sh
chmod +x plesk-diagnostic.sh
chmod +x kill-node-processes.sh
chmod +x fix-plesk-permissions.sh

# Run the complete deployment
./plesk-full-deploy.sh
```

This script will:
1. ✅ Kill any running Node.js processes (fixes port 8080 conflict)
2. ✅ Install all dependencies (`npm install`)
3. ✅ Build the latest code (`npm run build`)
4. ✅ Create and fix cache directory permissions
5. ✅ Verify everything is ready

---

### **Step 3: Configure Plesk Node.js**

1. **Go to Plesk** → Your Domain → **Node.js**

2. **Set these values:**
   ```
   Application Mode: Production
   Node.js Version: 16.x or higher (22.21.1 is fine)
   Application Startup File: startup.js
   Application Root: /httpdocs (or default)
   ```

3. **Click "Restart App"** or **"Enable Node.js"**

4. **IMPORTANT:** ⚠️ Make sure "npm install" is enabled in Plesk Node.js settings

---

### **Step 4: Verify Deployment**

**Test API:**
```
https://analytics.7mountainscreative.com/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T...",
  "server": {
    "port": 8080,
    "environment": "production"
  },
  "cache": {
    "directory": "/var/www/.../analyzer/server/cache",
    "isValid": true
  }
}
```

**Test main site:**
```
https://analytics.7mountainscreative.com
```

Should show the app with:
- ✅ Ecommerce filter
- ✅ Latest UI updates
- ✅ Working cache status indicator
- ✅ No console errors

---

## 🔧 Troubleshooting

### **Problem: "EADDRINUSE: address already in use :::8080"**

**Cause:** Multiple Node.js processes running or you ran `npm start` manually

**Solution:**
```bash
./kill-node-processes.sh
```

Then restart via Plesk Node.js interface.

**Prevention:** ⚠️ **NEVER** run `npm start` or `node app.js` manually on Plesk. Always use Plesk's Node.js interface!

---

### **Problem: 500 Error on /api/health**

**Possible causes:**
1. Cache directory doesn't exist or has wrong permissions
2. Dependencies not installed
3. Node.js app not running

**Solution:**
```bash
# Run diagnostic
./plesk-diagnostic.sh

# Fix permissions
./fix-plesk-permissions.sh

# Redeploy
./plesk-full-deploy.sh
```

---

### **Problem: Old version of app showing (no ecommerce filter)**

**Cause:** You didn't rebuild the app after uploading new source code

**Solution:**
```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
cd analyzer
npm run build
```

The build creates `analyzer/dist/` with the latest compiled code.

**Verify build date:**
```bash
ls -la analyzer/dist/index.html
```

Should show a recent timestamp (after you uploaded new code).

---

### **Problem: Dependencies missing**

**Solution:**
```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# Install root dependencies
npm install

# Install analyzer dependencies
cd analyzer && npm install

# Install server dependencies
cd server && npm install

# Go back to root
cd ../..
```

---

## 📋 Quick Reference Commands

### **Diagnostic:**
```bash
./plesk-diagnostic.sh              # Check everything
ps aux | grep node                 # See running Node processes
lsof -i :8080                      # See what's using port 8080
```

### **Fix Issues:**
```bash
./kill-node-processes.sh           # Kill port conflicts
./fix-plesk-permissions.sh         # Fix cache permissions
./plesk-full-deploy.sh             # Complete redeployment
```

### **Manual Steps:**
```bash
# Kill processes
pkill -f 'node.*app.js'

# Install deps
npm install
cd analyzer && npm install && cd ..

# Build
cd analyzer && npm run build && cd ..

# Fix permissions
chmod -R 755 analyzer/server/cache
```

---

## ⚙️ How Plesk Node.js Works

### **Correct Setup:**
```
Plesk Node.js Interface
    ↓
Starts: startup.js
    ↓
Loads: app.js (Express server)
    ↓
Serves: analyzer/dist/ (built React app)
    ↓
Accessible at: https://analytics.7mountainscreative.com
```

### **What NOT to do:**
- ❌ Don't run `npm start` manually
- ❌ Don't run `node app.js` manually
- ❌ Don't use `pm2` or other process managers
- ❌ Don't leave old Node processes running

Plesk manages the process for you!

---

## 📁 Required Directory Structure After Deployment

```
httpdocs/
├── app.js                      # Express server (updated)
├── startup.js                  # Plesk entry point
├── package.json                # Dependencies
├── .htaccess                   # Rewrite rules (updated)
├── node_modules/               # ✅ Must exist
│   └── express/                # ✅ Must exist
├── analyzer/
│   ├── dist/                   # ✅ Must be built
│   │   ├── index.html          # ✅ Latest build
│   │   └── assets/             # ✅ JS/CSS files
│   ├── src/                    # Latest source code
│   ├── node_modules/           # ✅ Must exist
│   └── server/
│       ├── cache/              # ✅ Must be writable
│       │   └── project_tasks/  # ✅ Must be writable
│       └── node_modules/       # ✅ Must exist
└── [deployment scripts]
```

---

## ✅ Deployment Checklist

Before considering deployment complete:

- [ ] Latest source code uploaded to server
- [ ] `npm install` completed in root directory
- [ ] `npm install` completed in `analyzer/` directory
- [ ] `npm install` completed in `analyzer/server/` directory
- [ ] `npm run build` completed (creates `analyzer/dist/`)
- [ ] Cache directory exists and is writable
- [ ] All old Node.js processes killed
- [ ] Plesk Node.js configured with `startup.js`
- [ ] Plesk Node.js app restarted
- [ ] `/api/health` returns 200 OK
- [ ] Main site shows latest features (ecommerce filter)
- [ ] Browser console shows no 500 errors
- [ ] Cache status indicator works

---

## 🎯 Quick Fix (TL;DR)

```bash
# 1. Upload all files to server

# 2. SSH into server
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# 3. Run this
chmod +x plesk-full-deploy.sh && ./plesk-full-deploy.sh

# 4. Go to Plesk → Node.js → Restart App

# 5. Test: https://analytics.7mountainscreative.com
```

Done! 🎉
