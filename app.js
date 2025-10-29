const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Use environment PORT or default
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Cache file paths - use analyzer/server/cache for consistency
const CACHE_DIR = path.join(__dirname, 'analyzer', 'server', 'cache');
const PROJECTS_CACHE_FILE = path.join(CACHE_DIR, 'projects.json');
const ANALYZED_CACHE_FILE = path.join(CACHE_DIR, 'analyzed.json');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');
const PROJECT_TASKS_CACHE_DIR = path.join(CACHE_DIR, 'project_tasks');

// Cache expiration time (2 days in milliseconds)
const CACHE_EXPIRATION = 2 * 24 * 60 * 60 * 1000;

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
    console.log('Cache directory exists:', CACHE_DIR);
  } catch (error) {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      console.log('Created cache directory:', CACHE_DIR);
    } catch (mkdirError) {
      console.error('Failed to create cache directory:', mkdirError);
      throw mkdirError;
    }
  }
  
  try {
    await fs.access(PROJECT_TASKS_CACHE_DIR);
    console.log('Project tasks cache directory exists');
  } catch (error) {
    try {
      await fs.mkdir(PROJECT_TASKS_CACHE_DIR, { recursive: true });
      console.log('Created project tasks cache directory');
    } catch (mkdirError) {
      console.error('Failed to create project tasks cache directory:', mkdirError);
      throw mkdirError;
    }
  }
}

// Initialize cache directory on startup
ensureCacheDir().catch(console.error);

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
  try {
    await fs.writeFile(CACHE_METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Error saving cache metadata:', error);
  }
}

// Check if cache is valid
function isCacheValid(timestamp) {
  const now = Date.now();
  return timestamp > 0 && (now - timestamp) < CACHE_EXPIRATION;
}

// API Routes

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: {
        port: PORT,
        environment: process.env.NODE_ENV || 'production'
      },
      cache: {
        directory: CACHE_DIR,
        isValid: true
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get cache status
app.get('/api/cache/status', async (req, res) => {
  try {
    // Ensure cache directory exists before checking status
    await ensureCacheDir();
    
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
    console.error('Cache directory:', CACHE_DIR);
    res.status(500).json({ 
      error: 'Failed to get cache status',
      message: error.message,
      cacheDir: CACHE_DIR
    });
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

// Get cached project tasks
app.get('/api/cache/project/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasksCacheFile = path.join(PROJECT_TASKS_CACHE_DIR, `${projectId}.json`);
    
    // Check if file exists and is valid
    try {
      const stats = await fs.stat(tasksCacheFile);
      const fileAge = Date.now() - stats.mtime.getTime();
      
      if (fileAge > CACHE_EXPIRATION) {
        return res.status(404).json({ error: 'Project tasks cache expired' });
      }
      
      const data = await fs.readFile(tasksCacheFile, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(404).json({ error: 'Project tasks not cached' });
    }
  } catch (error) {
    console.error('Error reading project tasks cache:', error);
    res.status(500).json({ error: 'Failed to read project tasks cache' });
  }
});

// Save projects to cache
app.post('/api/cache/projects', async (req, res) => {
  try {
    // Ensure cache directory exists before writing
    await ensureCacheDir();
    
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
    console.error('Cache directory:', CACHE_DIR);
    res.status(500).json({ 
      error: 'Failed to save cache',
      message: error.message,
      cacheDir: CACHE_DIR
    });
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

// Save project tasks to cache
app.post('/api/cache/project/:projectId/tasks', async (req, res) => {
  try {
    // Ensure cache directory exists before writing
    await ensureCacheDir();
    
    const { projectId } = req.params;
    const tasks = req.body;
    const tasksCacheFile = path.join(PROJECT_TASKS_CACHE_DIR, `${projectId}.json`);
    
    await fs.writeFile(tasksCacheFile, JSON.stringify(tasks, null, 2));
    
    console.log(`Cached tasks for project ${projectId}`);
    res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error('Error saving project tasks cache:', error);
    console.error('Cache directory:', PROJECT_TASKS_CACHE_DIR);
    res.status(500).json({ 
      error: 'Failed to save project tasks cache',
      message: error.message,
      cacheDir: PROJECT_TASKS_CACHE_DIR
    });
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
    
    // Clear project tasks cache directory
    try {
      const taskFiles = await fs.readdir(PROJECT_TASKS_CACHE_DIR);
      for (const file of taskFiles) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(PROJECT_TASKS_CACHE_DIR, file));
        }
      }
      console.log('Cleared project tasks cache');
    } catch (error) {
      // Directory might not exist or be empty
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

// Serve static files from the analyzer/dist directory
app.use(express.static(path.join(__dirname, 'analyzer', 'dist')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'analyzer', 'dist', 'index.html'));
});

// For Plesk/Passenger, export the app
module.exports = app;

// If running directly (not through Passenger), start the server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Asana Analytics Server running on port ${PORT}`);
    console.log(`Cache directory: ${CACHE_DIR}`);
  });
}