# 🔍 Plesk Deployment Verification Guide

## 📋 **Quick Health Checks**

### **1. Server Status Check**
```bash
# Check if server is running
curl http://yourdomain.com:8080/api/cache/status

# Expected response:
{
  "status": "healthy",
  "cacheDirectory": "/path/to/cache",
  "lastRefresh": "2025-10-07T10:30:00.000Z",
  "nextRefresh": "2025-10-09T00:00:00.000Z",
  "cacheSize": "2.5MB"
}
```

### **2. Visual Verification**
Visit: `http://yourdomain.com:8080`

**✅ Look for these features:**
- Mobile-responsive design (test on phone)
- Section comparison tabs with sorting
- Cache status indicator showing "Server Cache" 
- No 0-day duration projects in analytics
- Smooth viewport animations

### **3. Cache System Test**
```bash
# Test cache endpoints
curl http://yourdomain.com:8080/api/cache/projects
curl http://yourdomain.com:8080/api/cache/analyzed

# Clear cache test
curl -X DELETE http://yourdomain.com:8080/api/cache/clear
```

## 🚀 **New Features to Verify**

### **Server-Side Caching** ✅
- **Before**: Data stored in browser localStorage
- **After**: Data shared across all users via server
- **Test**: Open app in different browsers - should show same data

### **Mobile Responsiveness** ✅
- **Before**: Desktop-only layout
- **After**: Responsive design with animations
- **Test**: Resize browser or use mobile device

### **Section Comparison Sorting** ✅
- **Before**: No sorting options
- **After**: Sort by name, duration, tasks
- **Test**: Click sorting buttons in section comparison view

### **0-Day Project Filtering** ✅
- **Before**: Projects with 0 duration showed in analytics
- **After**: Filtered out automatically
- **Test**: Analytics should exclude very short projects

### **Automatic Cache Refresh** ✅
- **Before**: Manual cache clearing only
- **After**: Auto-refresh every 2 days at midnight
- **Test**: Check console logs for cron job scheduling

## 🔧 **Server Monitoring Commands**

### **Check Server Process**
```bash
# Find the Node.js process
ps aux | grep node
netstat -tulpn | grep :8080

# Check port usage
lsof -i :8080
```

### **View Server Logs**
```bash
# If running in background, check logs
tail -f /path/to/your/logs
# Or check Plesk's Node.js app logs in control panel
```

### **Cache Directory Check**
```bash
# Verify cache files exist
ls -la analyzer/server/cache/
# Should show JSON files: projects.json, analyzed.json, etc.
```

## 📊 **Performance Indicators**

### **Load Time Comparison**
- **Before**: 5-10 seconds (localStorage + API calls)
- **After**: 1-2 seconds (server cache)
- **Test**: Time the initial load

### **Multi-User Test**
- **Before**: Each user processed data separately
- **After**: First user processes, others get instant results
- **Test**: Open app from different devices/browsers

## 🌐 **Browser Testing Checklist**

### **Desktop Browsers**
- [ ] Chrome: Full functionality + responsive design
- [ ] Firefox: Section sorting + cache indicators  
- [ ] Safari: Mobile animations + server cache
- [ ] Edge: Analytics filtering + auto-refresh

### **Mobile Devices**
- [ ] iOS Safari: Touch interactions + viewport animations
- [ ] Android Chrome: Responsive layout + sorting
- [ ] Mobile responsive breakpoints working

## 🎯 **API Endpoint Tests**

Create this test script: `test-endpoints.sh`
```bash
#!/bin/bash
BASE_URL="http://yourdomain.com:8080"

echo "🧪 Testing API Endpoints..."

# Health check
echo "1. Health Check:"
curl -s "$BASE_URL/api/cache/status" | jq .

# Cache status  
echo "2. Cache Status:"
curl -s "$BASE_URL/api/cache/projects/status" | jq .

# Test cache operations
echo "3. Testing Cache Clear:"
curl -X DELETE -s "$BASE_URL/api/cache/clear"

echo "✅ Endpoint tests complete!"
```

## 🚨 **Troubleshooting Signs**

### **❌ Problems to Watch For:**
- Server not responding on any port 8080-8090
- Cache directory not created in `analyzer/server/cache/`
- Still seeing "localStorage" in browser dev tools
- Mobile layout not responsive
- Section sorting buttons not working
- 0-day projects still appearing in analytics

### **✅ Success Indicators:**
- Console shows: "Server running on port 8080"
- Cache status shows server timestamps
- Multiple users see same cached data
- Mobile animations work smoothly
- Section comparisons are sortable
- Analytics exclude short-duration projects

## 🔍 **Browser Developer Tools Check**

Open browser dev tools and verify:

### **Network Tab**
- API calls to `/api/cache/*` endpoints
- No localStorage operations
- Faster load times

### **Application Tab**
- localStorage should be empty or minimal
- No large Asana data stored locally

### **Console Tab**
- No cache-related errors
- Server communication successful

## 📱 **Mobile Verification**

Test these on mobile:
- [ ] Responsive navigation
- [ ] Touch-friendly buttons
- [ ] Smooth viewport animations
- [ ] Readable text at all sizes
- [ ] Section tabs work on touch
- [ ] Analytics charts display properly

## 🎉 **Success Confirmation**

**Your update is working if:**
1. ✅ Server starts on port 8080-8090 without conflicts
2. ✅ Application loads in browser at `http://yourdomain.com:PORT`
3. ✅ Cache status shows "Server Cache" with timestamps
4. ✅ Mobile responsive design works
5. ✅ Section comparison has sorting options
6. ✅ Analytics exclude 0-day projects
7. ✅ Multiple users see shared data
8. ✅ No localhost/localStorage dependencies

Your Asana Analytics is now a full-stack, production-ready application! 🚀