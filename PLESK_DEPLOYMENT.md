# 🚀 Plesk Deployment Guide - Simplified

## ✅ **SAFE FOR SHARED HOSTING** - No Process Conflicts

This deployment is designed specifically for Plesk shared hosting environments and will **never interfere** with your existing 70+ websites.

## 📋 **One-Command Deployment**

From your domain's root directory in Plesk, run **ONE** of these commands:

### **Option 1: Using NPM Scripts (Recommended)**
```bash
npm run deploy:plesk
```

### **Option 2: Using Deployment Script**
```bash
# Linux/Unix Plesk
chmod +x plesk-deploy.sh
./plesk-deploy.sh

# Windows Plesk  
plesk-deploy.bat
```

### **Option 3: Manual Step-by-Step**
```bash
# All from root directory - no cd to server needed
npm install
cd analyzer && npm install
cd server && npm install  
cd ../..
npm run build
npm run server:start
```

## 🎯 **What Each Command Does**

1. **`npm install`** - Installs root dependencies
2. **`cd analyzer && npm install`** - Installs frontend dependencies  
3. **`cd server && npm install`** - Installs server dependencies
4. **`cd ../..`** - Returns to root directory
5. **`npm run build`** - Builds the React application
6. **`npm run server:start`** - Starts the Express server

## 🛡️ **Safety Features**

### **Port Management**
- ✅ **Starts on port 8080** (safe for shared hosting)
- ✅ **Auto-tries 8081, 8082, etc.** if needed (up to 8090)
- ✅ **Never kills existing processes**
- ✅ **Shows assigned port** in console output

### **Expected Output**
```
Asana Analytics Server running on port 8080
Access your application at: http://localhost:8080
Cache directory: /path/to/your/domain/analyzer/server/cache
Automatic cache refresh scheduled for every 2 days at midnight
```

## 🌐 **Accessing Your Application**

After deployment, access your app at:
```
http://yourdomain.com:8080
```
(Replace `8080` with whatever port the server shows in the console)

## 🔧 **Available Commands from Root Directory**

```bash
# Install everything
npm run deploy:plesk

# Build the application  
npm run build

# Start the server
npm run server:start

# Start in development mode
npm run server:dev

# Install only server dependencies
npm run install:server
```

## 📁 **File Structure After Deployment**

```
yourdomain.com/
├── plesk-deploy.sh         # Deployment script (Linux)
├── plesk-deploy.bat        # Deployment script (Windows)
├── package.json            # Root commands
└── analyzer/
    ├── dist/               # Built React app (auto-created)
    ├── server/
    │   ├── server.js       # Express server with safe ports
    │   ├── package.json    # Server dependencies
    │   └── cache/          # Cache storage (auto-created)
    └── src/                # Source code
```

## 🎉 **Features Included**

- ✅ **Mobile Responsive Design** with smooth animations
- ✅ **Section Comparison Sorting** for analytics
- ✅ **0-Day Project Filtering** for cleaner data
- ✅ **Server-Side Caching** shared across all users
- ✅ **Automatic Cache Refresh** every 2 days at midnight
- ✅ **Safe Port Management** for shared hosting

## 🚨 **Troubleshooting**

### **If npm commands don't work from root:**
```bash
# Navigate to each directory manually
npm install
cd analyzer
npm install  
cd server
npm install
cd ../..
npm run build
cd analyzer/server
npm start
```

### **If port conflicts occur:**
The server will automatically try ports 8080-8090 and show you which one it uses.

### **To use a specific port:**
```bash
PORT=9000 npm run server:start
```

## 🏆 **Production Ready**

Your application is now ready for production with:
- Enterprise-level safety for shared hosting
- Automatic cache management
- Mobile-responsive design
- Real-time analytics with shared data

**No more complex directory navigation needed!** Everything runs from the root directory.