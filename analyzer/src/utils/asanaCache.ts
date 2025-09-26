/**
 * Caching mechanism for Asana API data
 * This reduces API calls and allows sharing data across users
 * Cache is persisted in localStorage to survive page refreshes and app restarts
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

// Cache key for localStorage
const CACHE_KEY = 'asana_cache_v1';

// Initialize cache from localStorage or create empty cache
function initializeCache(): CachedAsanaData {
  try {
    // Check if localStorage is available
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedCache = localStorage.getItem(CACHE_KEY);
      if (storedCache) {
        console.log('Loading cache from localStorage');
        return JSON.parse(storedCache);
      }
    }
  } catch (err) {
    console.warn('Failed to load cache from localStorage:', err);
  }

  // Default empty cache
  return {
    timestamp: 0,
    projects: [],
    projectTasks: {},
    analyzedData: {
      projectDurations: [],
      lastUpdated: 0
    }
  };
}

// Initialize cache
let asanaCache: CachedAsanaData = initializeCache();

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
 * Save the current cache state to localStorage
 */
function saveCache(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(asanaCache));
      console.log('Cache saved to localStorage');
    }
  } catch (err) {
    console.warn('Failed to save cache to localStorage:', err);
  }
}

/**
 * Store projects in the cache
 */
export function cacheProjects(projects: Task[]): void {
  asanaCache.projects = projects;
  asanaCache.timestamp = Date.now();
  saveCache();
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
  saveCache();
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
  saveCache();
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
  
  // Also clear from localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CACHE_KEY);
      console.log('Cache cleared from localStorage');
    }
  } catch (err) {
    console.warn('Failed to clear cache from localStorage:', err);
  }
}

/**
 * Get cache status information
 */
export function getCacheStatus(): {
  hasData: boolean,
  lastUpdated: string | null,
  projectCount: number,
  expiresIn: string | null,
  isPersisted: boolean
} {
  const now = Date.now();
  const hasData = asanaCache.timestamp > 0;
  let lastUpdated = null;
  let expiresIn = null;
  let isPersisted = false;
  
  try {
    // Check if localStorage has the cache
    if (typeof window !== 'undefined' && window.localStorage) {
      isPersisted = Boolean(localStorage.getItem(CACHE_KEY));
    }
  } catch (err) {
    console.warn('Failed to check localStorage persistence:', err);
  }
  
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
    expiresIn,
    isPersisted
  };
}