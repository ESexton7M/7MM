# 🚀 Plesk Node.js Application Setup Guide

## ⚠️ Important: This is for Plesk's Native Node.js Support (NOT Passenger)

Your Plesk environment uses **native Node.js** management, not Passenger. Follow these steps:

---

## 📋 Step-by-Step Setup in Plesk Control Panel

### 1️⃣ **Access Node.js Settings**
1. Log into your Plesk control panel
2. Go to **Websites & Domains** → `analytics.7mountainscreative.com`
3. Click on **Node.js** (or **Node.js Selector**)

### 2️⃣ **Configure Node.js Application**

Set these values in the Node.js interface:

| Setting | Value |
|---------|-------|
| **Application Mode** | Production |
| **Node.js Version** | 16.x or higher (22.21.1 is installed) |
| **Application Root** | `/httpdocs` or `.` (current directory) |
| **Application URL** | `https://analytics.7mountainscreative.com` |
| **Application Startup File** | `startup.js` |

### 3️⃣ **Install Dependencies**

In the Plesk Node.js interface, there should be a section for **NPM**:

1. Click **NPM Install** or **Run npm install**
2. Wait for it to complete (this installs `express`, `cors`, etc.)

**OR** via SSH:
```bash
cd /var/www/vhosts/analytics.7mountainscreative.com/httpdocs
npm install
cd analyzer && npm install
cd server && npm install
cd ../..
npm run build
```

### 4️⃣ **Start the Application**

In Plesk Node.js interface:
- Click **Enable Node.js** (if not already enabled)
- Click **Restart App** or **Start**

---

## 🔧 **What startup.js Does**

Your `startup.js` file is the entry point that Plesk will use. It should:
1. Start your Express server
2. Serve static files from `analyzer/dist`
3. Handle API routes

---

## 📁 **File Structure**

```
httpdocs/
├── .htaccess              # Simple rewrite rules (NO Passenger directives)
├── startup.js             # Plesk entry point
├── app.js                 # Your Express server
├── package.json           # Root dependencies
└── analyzer/
    ├── dist/              # Built React app
    └── server/            # Backend server (if separate)
```

---

## 🚨 **Common Issues & Solutions**

### **Error: "PassengerStartupFile not allowed here"**
✅ **FIXED** - Removed Passenger directives from `.htaccess`

### **Error: "Cannot find module 'express'"**
**Solution:** Run `npm install` in Plesk Node.js interface or via SSH

### **Port Conflicts**
- Plesk manages ports automatically
- Don't manually specify ports in startup.js
- Plesk will proxy requests to your Node.js app

### **App Not Starting**
1. Check Plesk logs: **Logs** → **Error Log**
2. Verify `startup.js` exists and is correct
3. Make sure `npm install` completed successfully
4. Check Node.js version compatibility

---

## 🎯 **After Setup**

Once configured, your app will be accessible at:
```
https://analytics.7mountainscreative.com
```

No port numbers needed! Plesk handles the proxying automatically.

---

## 📊 **Monitoring**

- **View Logs:** Plesk → Node.js → View Logs
- **Restart App:** Plesk → Node.js → Restart App
- **Check Status:** Plesk shows if app is running/stopped

---

## ✅ **Verification Checklist**

- [ ] Node.js enabled in Plesk
- [ ] Startup file set to `startup.js`
- [ ] NPM dependencies installed
- [ ] Application mode set to "Production"
- [ ] `.htaccess` has NO Passenger directives
- [ ] App is running (green status in Plesk)
- [ ] Site loads at https://analytics.7mountainscreative.com

---

## 🆘 **Need Help?**

If issues persist:
1. Check Plesk error logs
2. Verify `startup.js` is properly configured
3. Ensure all dependencies are installed
4. Contact your hosting provider about Node.js support
