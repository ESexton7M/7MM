/**
 * Caching mechanism for Asana API data
 * This reduces API calls and allows sharing data across users
 */

import type { Task } from '../types';

interface CachedAsanaData {
  timestamp: number;
  projects: Task[];
  projectTasks: Record<string, Task[]>;
  analyzedData: {
    projectDurations: any[];
    lastUpdated: number;
  };
}

// In-memory cache (will be lost on server restart)
let asanaCache: CachedAsanaData = {
  timestamp: 0,
  projects: [],
  projectTasks: {},
  analyzedData: {
    projectDurations: [],
    lastUpdated: 0
  }
};

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Check if the cache is valid (not expired)
 */
export function isCacheValid(): boolean {
  const now = Date.now();
  return asanaCache.timestamp > 0 && (now - asanaCache.timestamp) < CACHE_EXPIRATION;
}

/**
 * Store projects in the cache
 */
export function cacheProjects(projects: Task[]): void {
  asanaCache.projects = projects;
  asanaCache.timestamp = Date.now();
}

/**
 * Get projects from cache
 */
export function getCachedProjects(): Task[] {
  return asanaCache.projects;
}

/**
 * Store project tasks in the cache
 */
export function cacheProjectTasks(projectId: string, tasks: Task[]): void {
  asanaCache.projectTasks[projectId] = tasks;
}

/**
 * Get project tasks from cache
 */
export function getCachedProjectTasks(projectId: string): Task[] | null {
  return asanaCache.projectTasks[projectId] || null;
}

/**
 * Store analyzed project data
 */
export function cacheAnalyzedData(projectDurations: any[]): void {
  asanaCache.analyzedData = {
    projectDurations,
    lastUpdated: Date.now()
  };
}

/**
 * Get analyzed project data
 */
export function getCachedAnalyzedData(): any[] | null {
  return asanaCache.analyzedData.projectDurations;
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  asanaCache = {
    timestamp: 0,
    projects: [],
    projectTasks: {},
    analyzedData: {
      projectDurations: [],
      lastUpdated: 0
    }
  };
}

/**
 * Get cache status information
 */
export function getCacheStatus(): {
  hasData: boolean,
  lastUpdated: string | null,
  projectCount: number,
  expiresIn: string | null
} {
  const now = Date.now();
  const hasData = asanaCache.timestamp > 0;
  let lastUpdated = null;
  let expiresIn = null;
  
  if (hasData) {
    lastUpdated = new Date(asanaCache.timestamp).toLocaleString();
    const expirationMs = CACHE_EXPIRATION - (now - asanaCache.timestamp);
    const expirationHours = Math.floor(expirationMs / (60 * 60 * 1000));
    const expirationMinutes = Math.floor((expirationMs % (60 * 60 * 1000)) / (60 * 1000));
    expiresIn = `${expirationHours}h ${expirationMinutes}m`;
  }
  
  return {
    hasData,
    lastUpdated,
    projectCount: asanaCache.projects.length,
    expiresIn
  };
}