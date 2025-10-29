# 🚨 Plesk 500 Error - Cache Directory Fix

## Problem
You're getting **500 Internal Server Error** on all `/api/cache/*` endpoints because the server cannot create or write to the cache directory.

---

## ✅ Solution: Fix File Permissions

### **Option 1: Via Plesk File Manager** (No SSH needed)

1. **Log into Plesk** → Go to your domain
2. **Open File Manager**
3. **Navigate to:** `httpdocs/analyzer/server/`
4. **Create directory:** `cache` (if it doesn't exist)
5. **Inside cache, create:** `project_tasks` folder
6. **Right-click on `cache` folder** → **Change Permissions**
7. **Set permissions to:** `755` or `777` (if 755 doesn't work)
8. **Check:** "Apply to subdirectories"
9. **Click OK**

### **Option 2: Via SSH** (Recommended)

Upload `fix-plesk-permissions.sh` to your server and run:

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
chmod +x fix-plesk-permissions.sh
./fix-plesk-permissions.sh
```

### **Option 3: Manual SSH Commands**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# Create directories
mkdir -p analyzer/server/cache/project_tasks

# Set permissions
chmod -R 755 analyzer/server/cache
chmod -R u+w analyzer/server/cache

# Set ownership (replace with your web user)
chown -R psaadm:psaadm analyzer/server/cache
```

**Note:** The web user might be `psaadm`, `apache`, `www-data`, or your FTP username. Check with your hosting provider.

---

## 🔄 After Fixing Permissions

1. **Restart Node.js App** in Plesk:
   - Go to **Node.js** settings
   - Click **"Restart App"**

2. **Clear Browser Cache** and reload:
   - Press `Ctrl + Shift + R` (Windows)
   - Press `Cmd + Shift + R` (Mac)

3. **Check if errors are gone** in browser console (F12)

---

## 🧪 Verify the Fix

After restarting, visit:
```
https://analytics.7mountainscreative.com/api/health
```

You should see:
```json
{
  "status": "healthy",
  "cache": {
    "directory": "/var/www/vhosts/.../analyzer/server/cache",
    "isValid": true
  }
}
```

---

## 🔍 Check Server Logs

If still having issues, check Plesk logs:

1. **Plesk Panel** → Your Domain → **Logs**
2. **Look for errors** mentioning:
   - `EACCES` (permission denied)
   - `ENOENT` (directory not found)
   - Cache directory paths

The error will show which directory has permission issues.

---

## 📁 Required Directory Structure

Your server should have:
```
httpdocs/
├── app.js
├── startup.js
├── package.json
└── analyzer/
    ├── dist/              # Built React app
    └── server/
        └── cache/         # ⚠️ Needs write permissions
            ├── projects.json
            ├── analyzed.json
            ├── metadata.json
            └── project_tasks/   # ⚠️ Needs write permissions
                └── [project files].json
```

---

## ⚠️ Common Issues

### **Issue: Permission Denied (EACCES)**
**Solution:** Permissions are too restrictive. Use `chmod 755` or `777`

### **Issue: Directory Not Found (ENOENT)**
**Solution:** Create the directories manually:
```bash
mkdir -p analyzer/server/cache/project_tasks
```

### **Issue: Wrong User Ownership**
**Solution:** Change ownership to web server user:
```bash
chown -R psaadm:psaadm analyzer/server/cache
```

### **Issue: SELinux Blocking (CentOS/RHEL)**
**Solution:** Allow httpd to write:
```bash
chcon -R -t httpd_sys_rw_content_t analyzer/server/cache
```

---

## 🎯 What Changed

**Before:** Cache directory was incorrectly set to `server/cache`  
**After:** Cache directory correctly set to `analyzer/server/cache`

This matches your actual directory structure where the cache already exists.

---

## ✅ Expected Behavior After Fix

- ✅ No more 500 errors in browser console
- ✅ Cache status indicator shows green
- ✅ Server can save/load cached data
- ✅ Multiple users share the same cache
- ✅ Performance improves with caching

---

## 🆘 Still Having Issues?

If you still see 500 errors after fixing permissions:

1. **Check the detailed error message** in the API response (now includes more info)
2. **Look at Plesk error logs** for the exact error
3. **Verify Node.js is running** (check Plesk Node.js status)
4. **Ensure `npm install` completed** successfully
5. **Try creating a test file** in the cache directory to verify write access

**Test write access:**
```bash
touch analyzer/server/cache/test.txt
# If this fails, you have permission issues
```
