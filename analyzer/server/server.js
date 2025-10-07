const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
// Use environment PORT or default to a higher range to avoid conflicts
const PORT = process.env.PORT || process.env.NODE_PORT || 8080;

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Cache file paths
const CACHE_DIR = path.join(__dirname, 'cache');
const PROJECTS_CACHE_FILE = path.join(CACHE_DIR, 'projects.json');
const ANALYZED_CACHE_FILE = path.join(CACHE_DIR, 'analyzed.json');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');

// Cache expiration time (2 days in milliseconds)
const CACHE_EXPIRATION = 2 * 24 * 60 * 60 * 1000;

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch (error) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log('Created cache directory');
  }
}

// Initialize cache directory on startup
ensureCacheDir();

// Cache metadata management
async function getCacheMetadata() {
  try {
    const data = await fs.readFile(CACHE_METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      projectsTimestamp: 0,
      analyzedTimestamp: 0,
      lastRefresh: 0,
      projectCount: 0
    };
  }
}

async function saveCacheMetadata(metadata) {
  await fs.writeFile(CACHE_METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Check if cache is valid
function isCacheValid(timestamp) {
  const now = Date.now();
  return timestamp > 0 && (now - timestamp) < CACHE_EXPIRATION;
}

// API Routes

// Get cache status
app.get('/api/cache/status', async (req, res) => {
  try {
    const metadata = await getCacheMetadata();
    const now = Date.now();
    
    const projectsValid = isCacheValid(metadata.projectsTimestamp);
    const analyzedValid = isCacheValid(metadata.analyzedTimestamp);
    
    let expiresIn = null;
    let isExpired = false;
    
    if (metadata.projectsTimestamp > 0) {
      const expirationMs = CACHE_EXPIRATION - (now - metadata.projectsTimestamp);
      const expirationHours = Math.floor(expirationMs / (60 * 60 * 1000));
      const expirationMinutes = Math.floor((expirationMs % (60 * 60 * 1000)) / (60 * 1000));
      
      if (expirationMs < 0) {
        isExpired = true;
        const overageHours = Math.floor(Math.abs(expirationMs) / (60 * 60 * 1000));
        const overageMinutes = Math.floor((Math.abs(expirationMs) % (60 * 60 * 1000)) / (60 * 1000));
        expiresIn = `Expired ${overageHours}h ${overageMinutes}m ago`;
      } else {
        expiresIn = `${expirationHours}h ${expirationMinutes}m`;
      }
    }
    
    res.json({
      hasData: metadata.projectsTimestamp > 0,
      lastUpdated: metadata.projectsTimestamp > 0 ? new Date(metadata.projectsTimestamp).toLocaleString() : null,
      projectCount: metadata.projectCount,
      expiresIn,
      isPersisted: true,
      isExpired,
      projectsValid,
      analyzedValid,
      lastRefresh: metadata.lastRefresh > 0 ? new Date(metadata.lastRefresh).toLocaleString() : null
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

// Get cached projects
app.get('/api/cache/projects', async (req, res) => {
  try {
    const metadata = await getCacheMetadata();
    
    if (!isCacheValid(metadata.projectsTimestamp)) {
      return res.status(404).json({ error: 'Cache expired or not found' });
    }
    
    const data = await fs.readFile(PROJECTS_CACHE_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading projects cache:', error);
    res.status(404).json({ error: 'Cache not found' });
  }
});

// Get cached analyzed data
app.get('/api/cache/analyzed', async (req, res) => {
  try {
    const metadata = await getCacheMetadata();
    
    if (!isCacheValid(metadata.analyzedTimestamp)) {
      return res.status(404).json({ error: 'Cache expired or not found' });
    }
    
    const data = await fs.readFile(ANALYZED_CACHE_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading analyzed cache:', error);
    res.status(404).json({ error: 'Cache not found' });
  }
});

// Save projects to cache
app.post('/api/cache/projects', async (req, res) => {
  try {
    const projects = req.body;
    
    await fs.writeFile(PROJECTS_CACHE_FILE, JSON.stringify(projects, null, 2));
    
    const metadata = await getCacheMetadata();
    metadata.projectsTimestamp = Date.now();
    metadata.projectCount = Array.isArray(projects) ? projects.length : 0;
    await saveCacheMetadata(metadata);
    
    console.log(`Cached ${metadata.projectCount} projects`);
    res.json({ success: true, timestamp: metadata.projectsTimestamp });
  } catch (error) {
    console.error('Error saving projects cache:', error);
    res.status(500).json({ error: 'Failed to save cache' });
  }
});

// Save analyzed data to cache
app.post('/api/cache/analyzed', async (req, res) => {
  try {
    const analyzedData = req.body;
    
    await fs.writeFile(ANALYZED_CACHE_FILE, JSON.stringify(analyzedData, null, 2));
    
    const metadata = await getCacheMetadata();
    metadata.analyzedTimestamp = Date.now();
    await saveCacheMetadata(metadata);
    
    console.log('Cached analyzed data');
    res.json({ success: true, timestamp: metadata.analyzedTimestamp });
  } catch (error) {
    console.error('Error saving analyzed cache:', error);
    res.status(500).json({ error: 'Failed to save cache' });
  }
});

// Clear cache
app.delete('/api/cache/clear', async (req, res) => {
  try {
    const files = [PROJECTS_CACHE_FILE, ANALYZED_CACHE_FILE];
    
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // File might not exist, which is fine
      }
    }
    
    await saveCacheMetadata({
      projectsTimestamp: 0,
      analyzedTimestamp: 0,
      lastRefresh: 0,
      projectCount: 0
    });
    
    console.log('Cache cleared');
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Auto-refresh endpoint (for cron job)
app.post('/api/cache/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Asana token required' });
    }
    
    console.log('Starting automatic cache refresh...');
    
    // This would contain the refresh logic
    // For now, we'll just update the lastRefresh timestamp
    const metadata = await getCacheMetadata();
    metadata.lastRefresh = Date.now();
    await saveCacheMetadata(metadata);
    
    res.json({ 
      success: true, 
      message: 'Auto-refresh completed',
      timestamp: metadata.lastRefresh
    });
  } catch (error) {
    console.error('Error during auto-refresh:', error);
    res.status(500).json({ error: 'Auto-refresh failed' });
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Schedule automatic cache refresh every 2 days at midnight
cron.schedule('0 0 */2 * *', async () => {
  console.log('Running automatic cache refresh...');
  
  try {
    // Clear expired cache
    const metadata = await getCacheMetadata();
    
    if (!isCacheValid(metadata.projectsTimestamp)) {
      console.log('Cache expired, clearing...');
      
      const files = [PROJECTS_CACHE_FILE, ANALYZED_CACHE_FILE];
      for (const file of files) {
        try {
          await fs.unlink(file);
        } catch (error) {
          // File might not exist
        }
      }
      
      metadata.projectsTimestamp = 0;
      metadata.analyzedTimestamp = 0;
      await saveCacheMetadata(metadata);
    }
    
    metadata.lastRefresh = Date.now();
    await saveCacheMetadata(metadata);
    
    console.log('Automatic cache refresh completed');
  } catch (error) {
    console.error('Error during automatic cache refresh:', error);
  }
});

// Start server with safe port fallback
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Asana Analytics Server running on port ${port}`);
    console.log(`Access your application at: http://localhost:${port}`);
    console.log(`Cache directory: ${CACHE_DIR}`);
    console.log('Automatic cache refresh scheduled for every 2 days at midnight');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use.`);
      
      // Try next available port in safe range (8080-8090)
      if (port < 8090) {
        const nextPort = port + 1;
        console.log(`Trying port ${nextPort}...`);
        startServer(nextPort);
      } else {
        console.error('No available ports in range 8080-8090.');
        console.error('Please set a custom port using: PORT=YOUR_PORT npm start');
        console.error('Example: PORT=9000 npm start');
        process.exit(1);
      }
    } else {
      console.error(`Server error: ${err.message}`);
      process.exit(1);
    }
  });
  
  return server;
}

// Start the server
startServer(PORT);