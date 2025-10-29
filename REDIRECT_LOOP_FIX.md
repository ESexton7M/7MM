# 🚨 REDIRECT LOOP FIX

## Error: "Request exceeded the limit of 10 internal redirects"

**Cause:** The `.htaccess` file had rewrite rules that created an infinite redirect loop.

**Why it happened:** 
- The `.htaccess` was trying to rewrite all requests to `/analyzer/dist/index.html`
- This caused Apache to keep redirecting to itself infinitely
- With Plesk Node.js, you don't need `.htaccess` rewrites - the Node.js app handles routing

---

## ✅ **FIXED**

I've updated `.htaccess` to remove all rewrite rules.

**Upload the new `.htaccess` file to your server** and the redirect loop will stop.

---

## 📋 **Complete Fix Steps**

### **1. Upload Updated Files**

Upload these to `httpdocs/` on your Plesk server:

✅ **`.htaccess`** (UPDATED - no rewrites)  
✅ **`app.js`** (UPDATED - correct cache path)  
✅ **`emergency-cache-fix.sh`** (creates cache directory)  
✅ **`server-diagnostic.sh`** (diagnoses issues)  
✅ **`plesk-simple-deploy.sh`** (UPDATED - fixed typo)

---

### **2. Run Emergency Cache Fix**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
chmod +x emergency-cache-fix.sh
./emergency-cache-fix.sh
```

---

### **3. Restart Node.js in Plesk**

1. Plesk → Node.js → Click **"Restart App"**

---

### **4. Test**

**Main Site:**
```
https://analytics.7mountainscreative.com
```
Should load without redirect errors ✅

**API Health:**
```
https://analytics.7mountainscreative.com/api/health
```
Should return JSON with `"status": "healthy"` ✅

---

## 🔧 **What Changed in .htaccess**

### **Before (WRONG):**
```apache
RewriteEngine on
RewriteRule ^ /analyzer/dist/index.html [L]  ← Caused infinite loop
```

### **After (CORRECT):**
```apache
# Plesk Node.js Application
# The Node.js app handles all routing
# No Apache rewrite rules needed
```

---

## 📊 **How Routing Works Now**

```
User Request
    ↓
Plesk Node.js Manager
    ↓
startup.js
    ↓
app.js (Express Server)
    ↓
Routes:
  - /api/* → API endpoints
  - /* → Serves analyzer/dist/ (React app)
```

Apache `.htaccess` is NOT involved in routing anymore!

---

## ✅ **Expected Result After Fix**

- ✅ No redirect loop errors
- ✅ Site loads normally
- ✅ API endpoints work
- ✅ No 500 errors (after cache fix)
- ✅ React app loads with latest features

---

## 🚨 **If You Still See Issues**

### **Redirect Loop Still Happening:**
- Make sure new `.htaccess` is uploaded
- Clear browser cache (`Ctrl + Shift + R`)
- Check Plesk hasn't added its own rewrite rules

### **500 Errors on /api/cache/*:**
- Run `./emergency-cache-fix.sh`
- Verify cache directory exists: `ls -la analyzer/server/cache`
- Restart Node.js in Plesk

### **Site Not Loading:**
- Check Node.js is running in Plesk
- Check Plesk error logs
- Verify `startup.js` is set as startup file

---

## 🎯 **Priority Order**

1. **Upload new `.htaccess`** ← Fixes redirect loop
2. **Run `emergency-cache-fix.sh`** ← Fixes 500 errors  
3. **Restart in Plesk** ← Applies changes
4. **Test site** ← Verify everything works

Done! 🎉
