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
// REFRESH_INTERVAL_HOURS takes precedence over _DAYS if set. Common values:
// 6, 12, 24. Values that don't evenly divide 24 fall back to the daily
// cron with a rounded day interval.
const REFRESH_INTERVAL_HOURS = process.env.REFRESH_INTERVAL_HOURS
  ? Math.max(1, parseInt(process.env.REFRESH_INTERVAL_HOURS, 10))
  : REFRESH_INTERVAL_DAYS * 24;
const REFRESH_SECRET = process.env.REFRESH_SECRET || '';
const ENRICH_CONCURRENCY = Math.max(1, parseInt(process.env.ENRICH_CONCURRENCY || '5', 10));

const CACHE_EXPIRATION_MS = REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;

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

// =================== duration analysis (pre-computed server-side) ===================
//
// The frontend used to iterate every project + its cached tasks to derive
// the ProjectDuration array shown on the dashboard - that added ~10s to
// every page load. The server now computes the same analysis at refresh
// time and writes it to analyzed.json; the client just reads and displays.
//
// IMPORTANT: keep this in sync with analyzer/src/App.tsx analyzeAllProjects
// (launch-task heuristic, custom-field extraction, weeklyRevenue rules) and
// with analyzer/src/config/projectSkipList.ts.

const PROJECT_SKIP_LIST = new Set([
  'Video and Photo Projects',
  'Altoona ~ Station Sites',
  'Johnstown ~ Station Sites',
  'State College ~ Station Sites',
  'Ticket Requests',
  'Client Updates',
  'Olean ~ Station Sites',
  'CapCity Kitchen',
  'DuBois/Clarion Websites',
  'Lewistown Station Websites',
  'NWPA ~ Station Sites',
  'Scrum Board',
  'Lebanon Station Websites',
  'Elmira Station Websites',
  'Mansfield Station Websites',
  'Frankfort Station Websites',
  'Selinsgrove (+Williamsport',
  'Bloomsburg) Station Websites',
  'Stroudsburg (+ Scranton/Wilkes-Barre) Station Websites',
  'API',
  'Live. Love. Local',
  'Radio Station TV Commercials',
  'DuBois Job Fair',
  'Radio Auction Website',
  'My Baby Bigfoot',
  'Burro E-Commerce Addition',
  'Dev Code Snippets',
  'Parkersburg Station Websites',
  'RadioNOVO APP',
  '7MM Streaming App',
  '7MM 7MC Event Collateral',
  'Davison Snacks T-Shirt Design',
  'Elmira GSM Video',
  'Siteground Website Transfers',
  'Bowling Green Station Websites',
  '7MM Susquehanna Employment Page',
  'Ticket Board',
  'Rockey Auctions (Redesign)',
  '7MM Sports',
  '92 Mix FM',
  'Research & Development',
  '7 Mountains Sports Replay Animation',
  'Project overview',
  'Mock project',
  'Spooky PA landing page',
  '7MM Web Project',
]);

function findCustomField(project, fieldName) {
  if (!project.custom_fields || project.custom_fields.length === 0) return null;
  const wanted = fieldName.toLowerCase();
  return project.custom_fields.find((cf) => (cf.name || '').toLowerCase() === wanted) || null;
}

function getWebsiteType(project) {
  const f = findCustomField(project, 'type');
  if (!f) return 'N/A';
  return f.display_value || f.text_value || 'N/A';
}

function getSalePrice(project) {
  const f = findCustomField(project, 'sale price');
  if (!f) return 'N/A';
  if (f.number_value != null) return f.number_value;
  if (f.display_value) {
    const numeric = parseFloat(String(f.display_value).replace(/[,$]/g, ''));
    if (!isNaN(numeric)) return numeric;
    return f.display_value;
  }
  return f.text_value || 'N/A';
}

function getEcommerce(project) {
  const f = findCustomField(project, 'e-commerce');
  if (!f) return 'No';
  return f.display_value || f.text_value || 'No';
}

function isLaunchName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('launch')) return true;
  if (n.includes('go live') || n.includes('go-live') || n.includes('golive')) return true;
  if (n.includes('project completed') || n.includes('site completed')) return true;
  return (
    /(^|\s)completed(\s|$)/.test(n) &&
    !/\b(form|qa|onboarding|checklist|review)\s+completed\b/.test(n)
  );
}

const WEEKLY_REVENUE_MIN_DAYS = 14;

function computeProjectDurations(projects, tasksByGid) {
  const durations = [];

  for (const project of projects) {
    if (PROJECT_SKIP_LIST.has(project.name)) continue;
    const tasks = tasksByGid[project.gid];
    if (!Array.isArray(tasks) || tasks.length === 0) continue;

    // Skip projects whose first task lists it under "Video and Photo Projects".
    const firstTaskProjects = tasks[0] && tasks[0].projects;
    if (Array.isArray(firstTaskProjects)) {
      const inVideoPhoto = firstTaskProjects.some(
        (p) => p.name && p.name.toLowerCase() === 'video and photo projects'
      );
      if (inVideoPhoto) continue;
    }

    // Find launch task: tightened keyword match, pick LATEST completed_at.
    let launchTask = null;
    let launchTime = -Infinity;
    for (const t of tasks) {
      if (!t.completed || !t.completed_at || !t.name) continue;
      if (!isLaunchName(t.name)) continue;
      const time = new Date(t.completed_at).getTime();
      if (!isNaN(time) && time > launchTime) {
        launchTask = t;
        launchTime = time;
      }
    }

    const creationTimes = tasks
      .filter((t) => t.created_at && !isNaN(new Date(t.created_at).getTime()))
      .map((t) => new Date(t.created_at).getTime());
    if (creationTimes.length === 0) continue;
    const startTime = Math.min(...creationTimes);
    const startDate = new Date(startTime);

    const type = getWebsiteType(project);
    const salePrice = getSalePrice(project);
    const ecommerce = getEcommerce(project);

    const weeklyRevenueFor = (durationDays) => {
      if (typeof salePrice !== 'number' || salePrice <= 0) return undefined;
      if (durationDays < WEEKLY_REVENUE_MIN_DAYS) return undefined;
      return salePrice / (durationDays / 7);
    };

    if (launchTask) {
      const endTime = new Date(launchTask.completed_at).getTime();
      if (isNaN(endTime)) continue;
      const duration = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24));
      if (duration <= 0) continue;
      durations.push({
        name: project.name,
        gid: project.gid,
        duration,
        created: startDate.toISOString(),
        completed: new Date(endTime).toISOString(),
        type,
        salePrice,
        ecommerce,
        weeklyRevenue: weeklyRevenueFor(duration),
      });
    } else {
      const duration = Math.round((Date.now() - startTime) / (1000 * 60 * 60 * 24));
      durations.push({
        name: project.name,
        gid: project.gid,
        duration,
        created: startDate.toISOString(),
        completed: '',
        inProgress: true,
        type,
        salePrice,
        ecommerce,
        weeklyRevenue: weeklyRevenueFor(duration),
      });
    }
  }

  return durations;
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
    // Keep enriched tasks in memory as we go, so we can compute the analyzed
    // cache without re-reading every cache file after the loop.
    const tasksByGid = {};
    for (const project of allProjects) {
      try {
        const tasks = await fetchTasksForProject(client, project.gid);
        const enriched = await enrichTasksWithStories(client, tasks, ENRICH_CONCURRENCY);
        const file = path.join(PROJECT_TASKS_CACHE_DIR, `${project.gid}.json`);
        await fs.writeFile(file, JSON.stringify(enriched, null, 2));
        tasksByGid[project.gid] = enriched;
        succeeded++;
      } catch (err) {
        failed++;
        console.warn(`[refresh] project "${project.name}" failed: ${err.message}`);
      }
    }

    // Pre-compute the duration analysis so the frontend can serve initial
    // load from cache instead of iterating ~300 projects on every request.
    try {
      const analyzed = computeProjectDurations(allProjects, tasksByGid);
      await fs.writeFile(ANALYZED_CACHE_FILE, JSON.stringify(analyzed, null, 2));
      console.log(`[refresh] computed analyzed cache for ${analyzed.length} project(s)`);
    } catch (err) {
      console.warn('[refresh] analyzed-cache computation failed:', err.message);
    }

    const finishedAt = Date.now();
    await saveCacheMetadata({
      projectsTimestamp: finishedAt,
      analyzedTimestamp: finishedAt,
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
        refreshIntervalHours: REFRESH_INTERVAL_HOURS,
        refreshIntervalDays: REFRESH_INTERVAL_HOURS / 24,
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
  // Pre-computed duration analysis - see computeProjectDurations() above.
  // The client's fast-path reads this directly instead of recomputing.
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
  // Build a cron expression from REFRESH_INTERVAL_HOURS.
  // - Sub-day intervals that evenly divide 24 (2, 3, 4, 6, 8, 12) -> "0 */H * * *"
  // - 24h exactly -> "0 3 * * *" (daily at 03:00, low-traffic)
  // - Multi-day intervals -> "0 3 */D * *" where D = round(H/24)
  // - Anything else that doesn't cleanly express in cron falls back to
  //   the nearest sensible daily schedule.
  let expr;
  let humanLabel;
  if (REFRESH_INTERVAL_HOURS < 24 && 24 % REFRESH_INTERVAL_HOURS === 0) {
    expr = `0 */${REFRESH_INTERVAL_HOURS} * * *`;
    humanLabel = `every ${REFRESH_INTERVAL_HOURS} hour(s)`;
  } else if (REFRESH_INTERVAL_HOURS === 24) {
    expr = '0 3 * * *';
    humanLabel = 'daily at 03:00';
  } else if (REFRESH_INTERVAL_HOURS % 24 === 0) {
    const days = REFRESH_INTERVAL_HOURS / 24;
    expr = `0 3 */${days} * *`;
    humanLabel = `every ${days} day(s) at 03:00`;
  } else {
    // Odd sub-day interval that doesn't divide 24 cleanly; fall back to
    // an approximate daily schedule.
    const days = Math.max(1, Math.round(REFRESH_INTERVAL_HOURS / 24));
    expr = days === 1 ? '0 3 * * *' : `0 3 */${days} * *`;
    humanLabel = `every ${days} day(s) at 03:00 (approximated from ${REFRESH_INTERVAL_HOURS}h)`;
  }
  cron.schedule(expr, () => {
    console.log('[cron] tick', new Date().toISOString());
    runFullRefresh({ trigger: 'cron' }).catch((err) =>
      console.error('[cron] refresh failed:', err)
    );
  });
  console.log(`[cron] scheduled "${expr}" - ${humanLabel}`);
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
