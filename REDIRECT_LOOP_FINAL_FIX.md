# 🚨 STILL GETTING REDIRECT LOOP - FINAL FIX

## The redirect loop is STILL happening because:

1. The `.htaccess` file on the server hasn't been updated/removed yet
2. OR Plesk has its own Apache configuration causing redirects

---

## ✅ **FINAL SOLUTION - Complete Fix Script**

I've created a script that fixes EVERYTHING in one go.

### **Upload and Run This:**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# Make script executable
chmod +x complete-fix.sh

# Run it
./complete-fix.sh
```

**This script will:**
1. ✅ **Remove `.htaccess` completely** (fixes redirect loop)
2. ✅ **Create cache directory with 777 permissions** (fixes 500 errors)
3. ✅ **Kill old processes** (fixes port conflicts)
4. ✅ **Verify all files are in place**

---

## 📋 **Step-by-Step If Script Doesn't Work**

### **Option 1: Via SSH (Manual)**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs

# Remove .htaccess completely
rm .htaccess

# Create cache directory
mkdir -p analyzer/server/cache/project_tasks
chmod -R 777 analyzer/server/cache

# Kill processes
pkill -f node
```

---

### **Option 2: Via Plesk File Manager**

1. **Go to Plesk** → File Manager
2. **Navigate to** `httpdocs/`
3. **Find `.htaccess`** (it might be hidden - enable "Show hidden files")
4. **Delete it** or rename it to `.htaccess.disabled`
5. **Navigate to** `httpdocs/analyzer/server/`
6. **Create folder** `cache` if it doesn't exist
7. **Inside cache, create folder** `project_tasks`
8. **Right-click cache folder** → Permissions → Set to `777`

---

## 🔄 **Then Restart Node.js**

1. **Plesk** → Your Domain → **Node.js**
2. **Verify:**
   - Application Startup File: `startup.js`
   - Application Mode: `Production`
3. **Click "Restart App"**
4. **Wait 15 seconds**

---

## ✅ **Test It Works**

### **Test 1: Site Loads (No Redirect Loop)**
```
https://analytics.7mountainscreative.com
```
**Expected:** Site loads normally ✅

**If still redirect loop:** 
- `.htaccess` is still there or Plesk Apache config has issues
- Try accessing via IP directly to bypass Apache

---

### **Test 2: API Health (No 500 Error)**
```
https://analytics.7mountainscreative.com/api/health
```
**Expected:**
```json
{
  "status": "healthy",
  "cache": {
    "exists": true,
    "writable": true
  }
}
```

**If still 500 error:**
- Cache directory doesn't exist or wrong permissions
- Run: `chmod -R 777 analyzer/server/cache`

---

## 🆘 **If STILL Getting Redirect Loop**

The issue might be Plesk's Apache configuration, not `.htaccess`.

### **Check Plesk Apache Settings:**

1. **Plesk** → **Apache & nginx Settings**
2. **Look for any rewrite rules** under "Additional directives"
3. **Remove any RewriteRule directives** related to your domain

### **Alternative: Use IP Address**

```
http://YOUR_SERVER_IP/
```

If this works but domain doesn't, it's a DNS/Apache proxy issue.

---

## 🎯 **Quick Checklist**

Run through this checklist:

- [ ] Uploaded latest `app.js` to server
- [ ] Removed `.htaccess` file (or it's empty)
- [ ] Created `analyzer/server/cache` directory
- [ ] Set cache permissions to 777
- [ ] Restarted Node.js app in Plesk
- [ ] Verified "startup.js" is set as startup file
- [ ] Waited 15 seconds after restart
- [ ] Cleared browser cache (Ctrl+Shift+R)
- [ ] Tested site in incognito/private window

---

## 📊 **What Should Be on Server**

```
httpdocs/
├── .htaccess              ❌ SHOULD NOT EXIST (or be empty)
├── startup.js             ✅ MUST EXIST
├── app.js                 ✅ MUST EXIST (updated version)
├── package.json           ✅ MUST EXIST
├── node_modules/          ✅ MUST EXIST
│   └── express/           ✅ MUST EXIST
└── analyzer/
    ├── dist/              ✅ MUST EXIST (built app)
    │   └── index.html     ✅ MUST EXIST
    └── server/
        └── cache/         ✅ MUST EXIST (777 permissions)
            └── project_tasks/  ✅ MUST EXIST
```

---

## 🔧 **Files to Upload**

Make sure these are on your server:

1. ✅ `complete-fix.sh` ← **RUN THIS FIRST**
2. ✅ `app.js` (updated version)
3. ✅ `startup.js`
4. ✅ `package.json`
5. ❌ `.htaccess` (DELETE this or leave it empty)

---

## 📞 **Still Not Working?**

If after running `complete-fix.sh` and restarting in Plesk you STILL see the redirect loop:

1. **Check Plesk error logs:**
   ```bash
   tail -100 /var/www/vhosts/analytics.7mountainscreative.com/logs/error_log
   ```

2. **Check if Node.js is actually running:**
   ```bash
   ps aux | grep node
   ```

3. **Try accessing different URLs:**
   - `http://analytics.7mountainscreative.com` (HTTP not HTTPS)
   - `https://analytics.7mountainscreative.com:8080` (direct to Node.js)

4. **Contact Plesk support** - might be server-level Apache config issue

---

## 🎯 **ONE-LINE FIX**

If you just want to fix it quickly:

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs && rm .htaccess && mkdir -p analyzer/server/cache/project_tasks && chmod -R 777 analyzer/server/cache && echo "Done! Now restart in Plesk."
```

Then restart in Plesk!
