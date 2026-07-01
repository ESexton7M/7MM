/**
 * Asana Analytics Dashboard - Server entry point
 *
 * Serves the built frontend and provides cache-backed read endpoints that the
 * frontend calls. The server itself owns the Asana Personal Access Token and
 * the responsibility of refreshing the cache: a node-cron job runs on a
 * configurable schedule and a POST /api/cache/refresh endpoint lets you
 * trigger a refresh on demand. The browser never holds an Asana token and
 * never calls the Asana API directly.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();

const PORT = process.env.PORT || 8080;
const ASANA_TOKEN = process.env.ASANA_TOKEN || '';
const ASANA_API_BASE = process.env.ASANA_API_BASE || 'https://app.asana.com/api/1.0';
const REFRESH_INTERVAL_DAYS = Math.max(1, parseInt(process.env.REFRESH_INTERVAL_DAYS || '2', 10));
const REFRESH_SECRET = process.env.REFRESH_SECRET || '';
const ENRICH_CONCURRENCY = Math.max(1, parseInt(process.env.ENRICH_CONCURRENCY || '5', 10));

const CACHE_EXPIRATION_MS = REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

const CACHE_DIR = path.join(__dirname, 'analyzer', 'server', 'cache');
const PROJECTS_CACHE_FILE = path.join(CACHE_DIR, 'projects.json');
const ANALYZED_CACHE_FILE = path.join(CACHE_DIR, 'analyzed.json');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');
const PROJECT_TASKS_CACHE_DIR = path.join(CACHE_DIR, 'project_tasks');
const DIST_DIR = path.join(__dirname, 'analyzer', 'dist');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// =================== cache directory + metadata helpers ===================

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(PROJECT_TASKS_CACHE_DIR, { recursive: true });
}

async function getCacheMetadata() {
  try {
    const data = await fs.readFile(CACHE_METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { projectsTimestamp: 0, analyzedTimestamp: 0, lastRefresh: 0, projectCount: 0 };
  }
}

async function saveCacheMetadata(metadata) {
  try {
    await fs.writeFile(CACHE_METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error('[cache] failed to save metadata:', err);
  }
}

function isCacheValid(timestamp) {
  return timestamp > 0 && (Date.now() - timestamp) < CACHE_EXPIRATION_MS;
}

// =================== Asana fetching ===================

function asanaClient() {
  if (!ASANA_TOKEN) {
    throw new Error('ASANA_TOKEN env var is not set on the server');
  }
  return axios.create({
    baseURL: ASANA_API_BASE,
    headers: { Authorization: `Bearer ${ASANA_TOKEN}` },
    timeout: 30000,
  });
}

async function paginatedGet(client, url, params) {
  const out = [];
  let offset = null;
  do {
    const req = { ...params, limit: params.limit || 100 };
    if (offset) req.offset = offset;
    const resp = await client.get(url, { params: req });
    const batch = (resp.data && resp.data.data) || [];
    out.push(...batch);
    offset = (resp.data && resp.data.next_page && resp.data.next_page.offset) || null;
  } while (offset);
  return out;
}

async function fetchAllWorkspaces(client) {
  return paginatedGet(client, '/workspaces', { opt_fields: 'name,gid' });
}

async function fetchProjectsForWorkspace(client, workspaceGid) {
  return paginatedGet(client, '/projects', {
    workspace: workspaceGid,
    opt_fields:
      'name,gid,archived,custom_fields.name,custom_fields.display_value,' +
      'custom_fields.text_value,custom_fields.number_value',
  });
}

async function fetchTasksForProject(client, projectGid) {
  return paginatedGet(client, '/tasks', {
    project: projectGid,
    opt_fields:
      'gid,name,created_at,completed,completed_at,due_on,start_at,start_on,' +
      'custom_fields,projects.gid,projects.name',
  });
}

async function fetchTaskStories(client, taskGid) {
  const resp = await client.get(`/tasks/${taskGid}/stories`, {
    params: { opt_fields: 'created_at,resource_type,resource_subtype,text,type' },
  });
  return (resp.data && resp.data.data) || [];
}

// =================== activity-detection heuristics ===================
// These mirror the carefully-tuned client-side heuristics that previously
// ran in analyzer/src/App.tsx. Keep them in lockstep with the frontend
// derivation logic - changes here will change perceived section durations.

const CREATION_WINDOW_MS = 5 * 60 * 1000;

function findFirstMeaningfulActivity(stories, taskCreatedAt) {
  const taskCreationTime = taskCreatedAt ? new Date(taskCreatedAt).getTime() : 0;
  for (const story of stories) {
    if (!story.created_at) continue;
    const storyTime = new Date(story.created_at).getTime();
    const text = (story.text || '').toLowerCase();
    const subtype = story.resource_subtype || '';
    const isWithinCreationWindow =
      taskCreationTime > 0 && storyTime - taskCreationTime < CREATION_WINDOW_MS;

    // Skip non-meaningful stories
    if (subtype === 'added_to_project') continue;
    if (text.includes('created this task')) continue;
    if (text.includes('added this task')) continue;
    if (text.includes('unassigned') || text.includes('removed assignee')) continue;
    if (text.includes('removed from')) continue;
    if (text.includes('not started')) continue;
    if (text.includes('to do')) continue;
    if (text.includes('backlog')) continue;
    if (subtype === 'due_date_changed') continue;
    if (text.includes('changed the due date')) continue;
    if (text.includes('set the due date')) continue;
    if (subtype === 'name_changed' || subtype === 'description_changed' || subtype === 'notes_changed') continue;

    // Accept meaningful stories
    if (subtype === 'comment_added' || story.type === 'comment') return story.created_at;
    if (subtype === 'marked_complete' || subtype === 'marked_incomplete') return story.created_at;
    if (subtype === 'assigned' || text.includes('assigned to') || text.includes('assigned this task')) {
      return story.created_at;
    }
    if (subtype === 'enum_custom_field_changed') {
      if (
        text.includes('in progress') ||
        text.includes('in review') ||
        text.includes('working') ||
        text.includes('started') ||
        text.includes('active')
      ) {
        return story.created_at;
      }
      continue;
    }
    if (subtype === 'section_changed' || text.includes('moved this task') || text.includes('moved to')) {
      if (text.includes('backlog') || text.includes('inbox') || text.includes('not started')) continue;
      if (isWithinCreationWindow) continue;
      return story.created_at;
    }
    if (subtype === 'attachment_added' || text.includes('attached')) return story.created_at;
    if (subtype === 'subtask_added' || text.includes('subtask')) continue;
  }
  return null;
}

function findFirstAssignmentSimple(stories) {
  const found = stories.find((story) => {
    if (!story.text && story.resource_subtype !== 'assigned') return false;
    const text = (story.text || '').toLowerCase();
    return (
      text.includes('assigned to') ||
      text.includes('assigned this task') ||
      story.resource_subtype === 'assigned'
    );
  });
  return found ? found.created_at : null;
}

async function enrichTasksWithStories(client, tasks, concurrency) {
  const out = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= tasks.length) return;
      const task = tasks[idx];
      try {
        const stories = await fetchTaskStories(client, task.gid);
        out[idx] = {
          ...task,
          first_activity_at: findFirstMeaningfulActivity(stories, task.created_at),
          assigned_at: findFirstAssignmentSimple(stories),
        };
      } catch (err) {
        console.warn(`[refresh] stories fetch failed for task ${task.gid}: ${err.message}`);
        out[idx] = { ...task, first_activity_at: null, assigned_at: null };
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, tasks.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return out;
}

// =================== full refresh orchestration ===================

let refreshInProgress = false;
let lastRefreshError = null;
let lastRefreshResult = null;

async function runFullRefresh({ trigger }) {
  if (refreshInProgress) {
    console.warn(`[refresh] (${trigger}) skipped - another refresh is already running`);
    return { skipped: true };
  }
  if (!ASANA_TOKEN) {
    const msg = 'ASANA_TOKEN env var is not set; cannot refresh';
    console.warn(`[refresh] (${trigger}) ${msg}`);
    lastRefreshError = msg;
    throw new Error(msg);
  }
  refreshInProgress = true;
  lastRefreshError = null;
  const startedAt = Date.now();
  console.log(`[refresh] (${trigger}) starting at ${new Date(startedAt).toISOString()}`);

  try {
    await ensureCacheDir();
    const client = asanaClient();

    const workspaces = await fetchAllWorkspaces(client);
    console.log(`[refresh] found ${workspaces.length} workspace(s)`);

    const allProjects = [];
    for (const ws of workspaces) {
      try {
        const projects = await fetchProjectsForWorkspace(client, ws.gid);
        allProjects.push(...projects.filter((p) => !p.archived));
      } catch (err) {
        console.warn(`[refresh] workspace "${ws.name}" failed: ${err.message}`);
      }
    }
    console.log(`[refresh] fetched ${allProjects.length} non-archived project(s)`);

    await fs.writeFile(PROJECTS_CACHE_FILE, JSON.stringify(allProjects, null, 2));

    let succeeded = 0;
    let failed = 0;
    for (const project of allProjects) {
      try {
        const tasks = await fetchTasksForProject(client, project.gid);
        const enriched = await enrichTasksWithStories(client, tasks, ENRICH_CONCURRENCY);
        const file = path.join(PROJECT_TASKS_CACHE_DIR, `${project.gid}.json`);
        await fs.writeFile(file, JSON.stringify(enriched, null, 2));
        succeeded++;
      } catch (err) {
        failed++;
        console.warn(`[refresh] project "${project.name}" failed: ${err.message}`);
      }
    }

    const finishedAt = Date.now();
    await saveCacheMetadata({
      projectsTimestamp: finishedAt,
      analyzedTimestamp: 0,
      lastRefresh: finishedAt,
      lastRefreshTrigger: trigger,
      lastRefreshDurationMs: finishedAt - startedAt,
      projectCount: allProjects.length,
      projectTasksSucceeded: succeeded,
      projectTasksFailed: failed,
    });

    const result = {
      ok: true,
      trigger,
      projectCount: allProjects.length,
      succeeded,
      failed,
      durationMs: finishedAt - startedAt,
    };
    lastRefreshResult = result;
    console.log(
      `[refresh] (${trigger}) done in ${(result.durationMs / 1000).toFixed(1)}s: ` +
        `${succeeded} project task files written, ${failed} failed`
    );
    return result;
  } catch (err) {
    lastRefreshError = err.message || String(err);
    console.error(`[refresh] (${trigger}) FAILED:`, err);
    throw err;
  } finally {
    refreshInProgress = false;
  }
}

// =================== auth middleware for write endpoints ===================

function requireRefreshSecret(req, res, next) {
  if (!REFRESH_SECRET) return next();
  if (req.get('x-refresh-secret') === REFRESH_SECRET) return next();
  return res.status(401).json({ error: 'invalid refresh secret' });
}

// =================== API ROUTES ===================

app.get('/api/health', async (req, res) => {
  try {
    const metadata = await getCacheMetadata();
    let projectTasksFiles = 0;
    try {
      const files = await fs.readdir(PROJECT_TASKS_CACHE_DIR);
      projectTasksFiles = files.filter((f) => f.endsWith('.json')).length;
    } catch {
      /* directory not present yet */
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        port: PORT,
        environment: process.env.NODE_ENV || 'production',
        nodeVersion: process.version,
      },
      config: {
        hasAsanaToken: Boolean(ASANA_TOKEN),
        asanaApiBase: ASANA_API_BASE,
        refreshIntervalDays: REFRESH_INTERVAL_DAYS,
        refreshSecretRequired: Boolean(REFRESH_SECRET),
        enrichConcurrency: ENRICH_CONCURRENCY,
      },
      cache: {
        projectCount: metadata.projectCount || 0,
        projectTasksFiles,
        lastUpdate:
          metadata.projectsTimestamp > 0 ? new Date(metadata.projectsTimestamp).toISOString() : null,
        isValid: isCacheValid(metadata.projectsTimestamp),
        expiresAt:
          metadata.projectsTimestamp > 0
            ? new Date(metadata.projectsTimestamp + CACHE_EXPIRATION_MS).toISOString()
            : null,
      },
      refresh: {
        inProgress: refreshInProgress,
        lastError: lastRefreshError,
        lastResult: lastRefreshResult,
        lastRefresh: metadata.lastRefresh > 0 ? new Date(metadata.lastRefresh).toISOString() : null,
        lastTrigger: metadata.lastRefreshTrigger || null,
      },
    });
  } catch (err) {
    console.error('[health] error:', err);
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/api/cache/status', async (req, res) => {
  try {
    const metadata = await getCacheMetadata();
    const now = Date.now();
    const projectsValid = isCacheValid(metadata.projectsTimestamp);

    let expiresIn = null;
    let isExpired = false;
    if (metadata.projectsTimestamp > 0) {
      const ms = CACHE_EXPIRATION_MS - (now - metadata.projectsTimestamp);
      const fmt = (totalMs) => {
        const abs = Math.abs(totalMs);
        const hours = Math.floor(abs / 3_600_000);
        const minutes = Math.floor((abs % 3_600_000) / 60_000);
        return `${hours}h ${minutes}m`;
      };
      if (ms < 0) {
        isExpired = true;
        expiresIn = `Expired ${fmt(ms)} ago`;
      } else {
        expiresIn = fmt(ms);
      }
    }

    res.json({
      hasData: metadata.projectsTimestamp > 0,
      lastUpdated:
        metadata.projectsTimestamp > 0 ? new Date(metadata.projectsTimestamp).toLocaleString() : null,
      projectCount: metadata.projectCount || 0,
      expiresIn,
      isPersisted: true,
      isExpired,
      projectsValid,
      analyzedValid: false,
      lastRefresh:
        metadata.lastRefresh > 0 ? new Date(metadata.lastRefresh).toLocaleString() : null,
      refreshInProgress,
      refreshError: lastRefreshError,
      hasToken: Boolean(ASANA_TOKEN),
    });
  } catch (err) {
    console.error('[status] error:', err);
    res.status(500).json({ error: 'Failed to get cache status', message: err.message });
  }
});

app.get('/api/cache/projects', async (req, res) => {
  try {
    const metadata = await getCacheMetadata();
    if (!isCacheValid(metadata.projectsTimestamp)) {
      return res.status(404).json({ error: 'Cache expired or not found' });
    }
    const data = await fs.readFile(PROJECTS_CACHE_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('[cache/projects] error:', err);
    res.status(404).json({ error: 'Cache not found' });
  }
});

app.get('/api/cache/analyzed', async (req, res) => {
  // analyzed.json is no longer populated by the server (the frontend computes
  // it cheaply from the projects + project_tasks caches). The endpoint stays
  // for backwards compatibility but will normally return 404 so the client
  // falls through to compute fresh.
  try {
    const metadata = await getCacheMetadata();
    if (!isCacheValid(metadata.analyzedTimestamp)) {
      return res.status(404).json({ error: 'Cache expired or not found' });
    }
    const data = await fs.readFile(ANALYZED_CACHE_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Cache not found' });
  }
});

app.get('/api/cache/project/:projectId/tasks', async (req, res) => {
  try {
    const file = path.join(PROJECT_TASKS_CACHE_DIR, `${req.params.projectId}.json`);
    const data = await fs.readFile(file, 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Project tasks cache not found' });
  }
});

app.post('/api/cache/refresh', requireRefreshSecret, (req, res) => {
  if (!ASANA_TOKEN) {
    return res.status(500).json({ error: 'ASANA_TOKEN is not configured on the server' });
  }
  if (refreshInProgress) {
    return res.status(409).json({ error: 'Refresh already in progress' });
  }
  // Fire-and-forget so the HTTP request returns quickly; clients poll
  // /api/cache/status to know when it's done.
  runFullRefresh({ trigger: 'manual' }).catch((err) => {
    console.error('[refresh] manual trigger failed:', err);
  });
  res.status(202).json({ accepted: true, message: 'refresh started' });
});

app.delete('/api/cache/clear', requireRefreshSecret, async (req, res) => {
  try {
    await ensureCacheDir();
    for (const file of [PROJECTS_CACHE_FILE, ANALYZED_CACHE_FILE]) {
      try {
        await fs.unlink(file);
      } catch {
        /* ok */
      }
    }
    try {
      const files = await fs.readdir(PROJECT_TASKS_CACHE_DIR);
      for (const f of files) {
        if (f.endsWith('.json')) {
          await fs.unlink(path.join(PROJECT_TASKS_CACHE_DIR, f));
        }
      }
    } catch {
      /* ok */
    }
    await saveCacheMetadata({
      projectsTimestamp: 0,
      analyzedTimestamp: 0,
      lastRefresh: 0,
      projectCount: 0,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[clear] error:', err);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// =================== static file serving ===================

app.use(express.static(DIST_DIR));
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// =================== startup tasks ===================

ensureCacheDir().catch((err) => console.error('[cache] init failed:', err));

(async function maybeRefreshOnStartup() {
  if (!ASANA_TOKEN) {
    console.warn('[startup] ASANA_TOKEN not configured - cache will not auto-refresh');
    return;
  }
  try {
    const md = await getCacheMetadata();
    if (!isCacheValid(md.projectsTimestamp)) {
      console.log('[startup] cache stale or missing - kicking off background refresh');
      runFullRefresh({ trigger: 'startup' }).catch((err) =>
        console.error('[startup] background refresh failed:', err)
      );
    } else {
      const ageHours = (Date.now() - md.projectsTimestamp) / 3_600_000;
      console.log(`[startup] cache is fresh (${ageHours.toFixed(1)}h old) - no refresh needed`);
    }
  } catch (err) {
    console.error('[startup] cache check failed:', err);
  }
})();

(function scheduleCron() {
  if (!ASANA_TOKEN) {
    console.warn('[cron] ASANA_TOKEN not configured - cron will not be scheduled');
    return;
  }
  // Run at 03:00 server time every N days (low-traffic window).
  const expr = REFRESH_INTERVAL_DAYS === 1 ? '0 3 * * *' : `0 3 */${REFRESH_INTERVAL_DAYS} * *`;
  cron.schedule(expr, () => {
    console.log('[cron] tick', new Date().toISOString());
    runFullRefresh({ trigger: 'cron' }).catch((err) =>
      console.error('[cron] refresh failed:', err)
    );
  });
  console.log(`[cron] scheduled "${expr}" (every ${REFRESH_INTERVAL_DAYS} day(s) at 03:00)`);
})();

// =================== server start with port fallback ===================

module.exports = app;

function startServer(port, retries = 10) {
  const server = app.listen(port, () => {
    console.log(`Asana Analytics Server listening on port ${port}`);
    console.log(`Static files: ${DIST_DIR}`);
    console.log(`Cache directory: ${CACHE_DIR}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      server.close();
      startServer(port + 1, retries - 1);
    } else if (err.code === 'EADDRINUSE') {
      console.error(`No available port found starting from ${PORT}`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
  return server;
}

startServer(PORT);
