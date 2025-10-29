# 🚀 QUICK START - Fix Everything Now

## Your Current Issues:
1. ❌ Port 8080 conflict (EADDRINUSE)
2. ❌ 500 errors on API calls
3. ❌ Old code deployed (no ecommerce filter)

---

## ✅ 3-Step Fix

### **STEP 1: Upload Files**
Upload these to your Plesk server via FTP/File Manager:
- `app.js` (UPDATED)
- `startup.js`
- `package.json`
- `.htaccess` (UPDATED)
- `plesk-full-deploy.sh`
- `kill-node-processes.sh`
- Entire `analyzer/` folder (LATEST CODE)

---

### **STEP 2: Run Deployment (via SSH)**

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
chmod +x plesk-full-deploy.sh
./plesk-full-deploy.sh
```

**This will:**
- Kill the process using port 8080 ✅
- Install all dependencies ✅
- Build latest code (with ecommerce filter) ✅
- Fix cache permissions ✅

---

### **STEP 3: Restart via Plesk**

1. Go to **Plesk Panel** → Your Domain → **Node.js**
2. Set **Application Startup File:** `startup.js`
3. Click **"Restart App"**

---

## ✅ Test It Works

**API Health Check:**
```
https://analytics.7mountainscreative.com/api/health
```
Should return: `{"status": "healthy", ...}`

**Main Site:**
```
https://analytics.7mountainscreative.com
```
Should show app with ecommerce filter

**Browser Console (F12):**
No 500 errors!

---

## 🆘 If Port Still Busy

```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
chmod +x kill-node-processes.sh
./kill-node-processes.sh
```

Then restart in Plesk.

---

## ⚠️ CRITICAL: Never Do This

**DON'T** run these commands on Plesk:
```bash
npm start          # ❌ Creates port conflict
node app.js        # ❌ Creates port conflict  
npm run start      # ❌ Creates port conflict
```

**ALWAYS** use Plesk's Node.js interface to start/stop your app!

---

## 📋 Files You Need to Upload

From your local `Z:\7MM\`:

```
✅ app.js (updated cache path)
✅ startup.js
✅ package.json
✅ .htaccess (no Passenger)
✅ plesk-full-deploy.sh
✅ kill-node-processes.sh
✅ fix-plesk-permissions.sh
✅ analyzer/ (entire folder with latest code)
```

---

## That's It!

After Step 2 finishes, you'll see:
```
✅ DEPLOYMENT SUCCESSFUL!
```

Then do Step 3 (restart in Plesk) and you're done! 🎉
