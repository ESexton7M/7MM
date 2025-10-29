# 🚨 500 ERROR STILL HAPPENING - ROOT CAUSE ANALYSIS

## The Problem
You're still getting 500 errors on all `/api/cache/*` endpoints even after deployment.

## Most Likely Causes (in order of probability):

### ❌ **1. Cache Directory Doesn't Exist or Has Wrong Permissions**

**Check on server:**
```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
ls -la analyzer/server/cache
```

**If you see "No such file or directory":**
```bash
./emergency-cache-fix.sh
```

**If you see permissions like `drwxr-xr-x` or `755` owned by root:**
```bash
chmod -R 777 analyzer/server/cache
```

---

### ❌ **2. Old app.js Still Running (Not Updated)**

The server might still be running the OLD `app.js` with the wrong cache path (`server/cache` instead of `analyzer/server/cache`).

**Check which app.js is actually running:**
```bash
./server-diagnostic.sh
```

Look at line 3 output - it will show you the cache path the running app is using.

**If it shows `server/cache`** (wrong), you need to:
1. Upload the updated `app.js` (from this workspace)
2. Restart the app in Plesk

---

### ❌ **3. Node.js App Crashed/Not Running**

**Check if Node.js is actually running:**
```bash
ps aux | grep node
```

**If you see NO node processes:**
- The app crashed on startup
- Go to Plesk → Node.js → Check status
- Click "Restart App"
- Check Plesk error logs

---

### ❌ **4. Wrong Working Directory**

The Node.js app might be running from wrong directory.

**Check in server-diagnostic.sh output:**
- `cwd` should be: `/var/www/vhosts/analytics.7mountainscreative.com/httpdocs`
- If it's different, Plesk is configured wrong

**Fix in Plesk:**
- Go to Node.js settings
- Set "Application Root" to `/httpdocs` or leave blank

---

## ✅ COMPLETE FIX PROCEDURE

### **Step 1: Upload Updated Files**

Make sure these files on the server are up to date:
- `app.js` ← **CRITICAL** (must have `analyzer/server/cache` path)
- `startup.js`
- `package.json`

### **Step 2: Run Emergency Cache Fix**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
chmod +x emergency-cache-fix.sh
./emergency-cache-fix.sh
```

This creates the cache directory with 777 permissions.

### **Step 3: Run Full Diagnostic**

```bash
chmod +x server-diagnostic.sh
./server-diagnostic.sh
```

This will show you EXACTLY what's wrong.

### **Step 4: Restart Node.js in Plesk**

1. Go to Plesk → Your Domain → Node.js
2. Click "Restart App"
3. Wait 10 seconds

### **Step 5: Test**

Visit: `https://analytics.7mountainscreative.com/api/health`

**You should see:**
```json
{
  "status": "healthy",
  "cache": {
    "directory": "/var/www/.../analyzer/server/cache",
    "exists": true,
    "writable": true,
    "error": null
  }
}
```

**If you see `"writable": false` or `"exists": false`:**
- Run `emergency-cache-fix.sh` again
- Check Plesk error logs

---

## 🔍 Diagnostic Commands

Run these to find the exact problem:

```bash
# Check if app.js is updated
grep "CACHE_DIR" app.js

# Should show:
# const CACHE_DIR = path.join(__dirname, 'analyzer', 'server', 'cache');

# Check cache directory
ls -la analyzer/server/cache

# Check permissions
ls -ld analyzer/server/cache

# Test write access
touch analyzer/server/cache/test.txt
# If this fails, you have permission problems

# Check what's running
ps aux | grep node

# Check Plesk logs
tail -50 /var/www/vhosts/analytics.7mountainscreative.com/logs/error_log
```

---

## 📋 Quick Checklist

Fix in this order:

- [ ] Upload updated `app.js` to server
- [ ] Run `./emergency-cache-fix.sh`
- [ ] Verify cache directory exists: `ls -la analyzer/server/cache`
- [ ] Verify cache is writable: `touch analyzer/server/cache/test.txt`
- [ ] Restart Node.js in Plesk
- [ ] Test `/api/health` endpoint
- [ ] Check for errors in browser console

---

## 🆘 If Nothing Works

### **Last Resort Fix:**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# Kill everything
pkill -9 node

# Create cache with maximum permissions
mkdir -p analyzer/server/cache/project_tasks
chmod -R 777 analyzer/server/cache

# Reinstall dependencies (in case something's corrupted)
rm -rf node_modules
npm install

rm -rf analyzer/node_modules
cd analyzer && npm install && cd ..

# Rebuild
cd analyzer && npm run build && cd ..

# Restart in Plesk
# Go to Plesk → Node.js → Restart App
```

Then test again.

---

## 📊 What the Diagnostic Should Show

When you run `./server-diagnostic.sh`, you should see:

```
✅ Cache directory EXISTS
drwxrwxrwx ... analyzer/server/cache
✅ YES - Directory is writable
✅ Successfully created test file

{
  "status": "healthy",
  "cache": {
    "exists": true,
    "writable": true
  }
}
```

If you see ANYTHING different, that's your problem!

---

## 🎯 Most Common Issue

**99% of the time, it's one of these:**

1. **Cache directory doesn't exist** → Run `emergency-cache-fix.sh`
2. **Wrong permissions** → Run `chmod -R 777 analyzer/server/cache`
3. **Old app.js still running** → Upload new app.js + restart in Plesk
4. **App crashed on startup** → Check Plesk logs + fix error + restart

Run the diagnostic script and it will tell you which one!
