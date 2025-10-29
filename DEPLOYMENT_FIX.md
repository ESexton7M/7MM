# 🔧 Script Error Fix + Deployment Options

## Error: `./plesk-full-deploy.sh: line 29: command not found`

**Cause:** Shell compatibility issue with `$?` syntax or missing commands.

**Solution:** Use the simpler deployment script instead.

---

## ✅ 3 Deployment Options (Pick One)

### **Option 1: Simple Deployment Script (RECOMMENDED)**

**Most compatible, easiest to use:**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
chmod +x plesk-simple-deploy.sh
./plesk-simple-deploy.sh
```

This script:
- Uses simpler syntax (more compatible)
- No complex error checking that might fail
- Works on all Linux shells

---

### **Option 2: Manual Step-by-Step**

**If scripts don't work, do this manually:**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# 1. Kill processes
pkill -f 'node.*app.js'
pkill -f 'node.*startup.js'
sleep 2

# 2. Install root dependencies
npm install

# 3. Install analyzer dependencies
cd analyzer
npm install

# 4. Install server dependencies
cd server
npm install
cd ../..

# 5. Build the app
cd analyzer
npm run build
cd ..

# 6. Create cache directory
mkdir -p analyzer/server/cache/project_tasks
chmod -R 755 analyzer/server/cache

# 7. Done!
echo "Deployment complete!"
```

---

### **Option 3: Use Plesk File Manager Terminal**

If SSH isn't available:

1. **Go to Plesk** → File Manager
2. **Navigate to** `httpdocs`
3. **Click "Terminal"** (if available)
4. **Run commands from Option 2** (manual steps)

---

## 🔄 After Deployment

**Regardless of which option you used:**

1. **Go to Plesk Panel** → Your Domain → **Node.js**
2. **Configure:**
   - Application Startup File: `startup.js`
   - Application Mode: `Production`
3. **Click "Restart App"**

---

## ✅ Verify It Works

**Test 1 - API:**
```
https://analytics.7mountainscreative.com/api/health
```

**Test 2 - Website:**
```
https://analytics.7mountainscreative.com
```

**Test 3 - Check Console:**
- Press F12
- No 500 errors
- See ecommerce filter in UI

---

## 📋 Files to Upload

Upload to `httpdocs/` on your Plesk server:

**Required:**
- ✅ `app.js` (updated)
- ✅ `startup.js`
- ✅ `package.json`
- ✅ `.htaccess` (updated)
- ✅ `analyzer/` folder (entire folder with latest code)

**Optional Scripts:**
- ✅ `plesk-simple-deploy.sh` (recommended deployment script)
- ✅ `plesk-simple-deploy.bat` (Windows version)
- ✅ `kill-node-processes.sh` (to fix port conflicts)
- ✅ `fix-plesk-permissions.sh` (to fix cache permissions)

---

## 🆘 Troubleshooting

### **Script won't run**
```bash
# Make it executable
chmod +x plesk-simple-deploy.sh

# Check file format (remove Windows line endings)
dos2unix plesk-simple-deploy.sh

# Or just use manual steps (Option 2 above)
```

### **Permission denied**
```bash
# Run as root or with sudo (if available)
sudo ./plesk-simple-deploy.sh

# Or fix permissions manually
chmod -R 755 analyzer/server/cache
```

### **npm command not found**
```bash
# Check Node.js/npm installation
which npm
node --version

# Use full path if needed
/usr/bin/npm install
```

### **Port 8080 still busy**
```bash
# Kill all node processes
pkill -9 node

# Or find and kill specific PID
lsof -i :8080
kill -9 [PID]
```

---

## 🎯 Quickest Path to Success

1. **Upload** all files to Plesk
2. **SSH** into server
3. **Run** manual steps from Option 2 above
4. **Restart** app in Plesk Node.js interface
5. **Test** your site

No scripts needed if they're giving you trouble!

---

## ✅ Expected Result

After successful deployment:

```bash
✅ Dependencies installed
✅ App built (analyzer/dist/ exists)
✅ Cache directory created
✅ No processes on port 8080
✅ Plesk manages the app
✅ Site loads with latest features
✅ No 500 errors
```

---

## 📞 Still Having Issues?

1. Run the diagnostic: `./plesk-diagnostic.sh`
2. Check Plesk error logs
3. Verify all files were uploaded
4. Make sure npm install completed without errors
5. Ensure build created `analyzer/dist/index.html`
