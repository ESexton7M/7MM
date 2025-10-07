# Asana Analytics - Safe Deployment Guide (Updated)

## ✅ **SAFE FOR SHARED HOSTING** - Port Management

Your server is now configured with **intelligent port conflict resolution** that is 100% safe for shared hosting environments like Plesk.

### **🛡️ Safety Features**
- **No Process Killing**: Never terminates existing services
- **Safe Port Range**: Uses ports 8080-8090 (safe for shared hosting)
- **Automatic Discovery**: Finds available ports without conflicts
- **Clear Messaging**: Shows exactly which port is being used

## 🚀 Deployment Instructions

### **Quick Start**
```bash
# Navigate to your project
cd z:\7MM\analyzer

# Build the application
npm run build

# Install server dependencies
cd server
npm install

# Start the server (will automatically find safe port)
npm start
```

### **Server Output Example**
```
Asana Analytics Server running on port 8080
Access your application at: http://localhost:8080
Cache directory: Z:\7MM\analyzer\server\cache
Automatic cache refresh scheduled for every 2 days at midnight
```

## 🔧 Port Configuration

### **Automatic Port Discovery**
The server will automatically:
1. Try port **8080** (default, safe for shared hosting)
2. If busy, try **8081**, then **8082**, up to **8090**
3. Provide clear error message if no ports available
4. **Never kill or interfere with existing processes**

### **Manual Port Override**
If you need a specific port:
```bash
# Use custom port
PORT=9000 npm start

# Or set environment variable
export PORT=9000
npm start
```

## 📋 For Your Plesk Server

### **Pre-Deployment Checklist**
- ✅ Server safely finds available ports (8080-8090)
- ✅ No process termination (safe for 70+ websites)
- ✅ Clear port assignment logging
- ✅ Manual port override available
- ✅ Automatic cache refresh every 2 days

### **Plesk Deployment Steps**
1. **Upload Project**: Copy files to your domain directory
2. **Install Dependencies**: 
   ```bash
   cd /path/to/your/domain
   npm install
   cd analyzer/server
   npm install
   ```
3. **Build Application**:
   ```bash
   cd /path/to/your/domain/analyzer
   npm run build
   ```
4. **Start Server**:
   ```bash
   cd server
   npm start
   ```
5. **Check Output**: Server will show assigned port (e.g., "Server running on port 8080")

### **Expected Behavior on Plesk**
- Server starts on port 8080 (or next available in range)
- No interference with existing websites
- Clear console message showing assigned port
- Access via: `http://yoursite.com:ASSIGNED_PORT`

## 🔍 Monitoring

### **Verify Safe Operation**
```bash
# Check which port was assigned
npm start
# Look for: "Asana Analytics Server running on port XXXX"

# Test the assigned port
curl http://localhost:ASSIGNED_PORT
```

### **Cache Status**
```bash
# Check cache status
curl http://localhost:ASSIGNED_PORT/api/cache/status

# Manual cache clear if needed
curl -X DELETE http://localhost:ASSIGNED_PORT/api/cache/clear
```

## 🎯 Key Improvements for Shared Hosting

1. **Safe Port Range**: 8080-8090 avoids common system ports
2. **No Process Interference**: Respects existing services
3. **Automatic Fallback**: Finds available ports intelligently  
4. **Clear Documentation**: Shows exactly what port is being used
5. **Manual Override**: Allows custom port selection if needed

## 📁 Complete File Structure

```
7MM/
├── DEPLOYMENT_UPDATED.md       # This updated guide
├── package.json                # Root package management
└── analyzer/
    ├── dist/                   # Built React app (served by server)
    ├── server/
    │   ├── server.js           # Express server with safe port management
    │   ├── package.json        # Server dependencies
    │   ├── cache/              # Auto-created cache storage
    │   └── (other files)
    ├── src/
    │   └── utils/
    │       ├── serverCache.ts  # Client-side server API
    │       └── (other files)
    └── package.json            # Frontend dependencies
```

## 🏆 Production Ready Features

- ✅ **Mobile Responsive**: Works on all devices with animations
- ✅ **Section Comparison**: Sortable analytics with 0-day filtering
- ✅ **Server-Side Caching**: Shared cache across all users
- ✅ **Automatic Refresh**: Updates every 2 days at midnight
- ✅ **Safe Port Management**: No conflicts on shared hosting
- ✅ **Error Handling**: Graceful fallbacks and user feedback

Your application is now **100% safe for deployment** on your Plesk server hosting 70+ websites!