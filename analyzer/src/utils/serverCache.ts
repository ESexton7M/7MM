/**
 * Server-side caching mechanism for Asana API data
 * This reduces API calls by storing data on the server
 * and allows sharing cached data across all users
 */

import type { Task } from '../types';

interface CacheStatus {
  hasData: boolean;
  lastUpdated: string | null;
  projectCount: number;
  expiresIn: string | null;
  isPersisted: boolean;
  isExpired: boolean;
  lastRefresh?: string | null;
}

// API base URL - defaults to same origin, can be overridden via environment
const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Check if the server cache is valid
 */
export async function isCacheValid(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/status`);
    if (!response.ok) return false;
    
    const status: CacheStatus = await response.json();
    return status.hasData && !status.isExpired;
  } catch (error) {
    console.warn('Failed to check cache validity:', error);
    return false;
  }
}

/**
 * Clear expired cache on the server
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/status`);
    if (!response.ok) return;
    
    const status: CacheStatus = await response.json();
    if (status.isExpired) {
      console.log('Cache expired, clearing...');
      await fetch(`${API_BASE}/api/cache/clear`, { method: 'DELETE' });
    }
  } catch (error) {
    console.warn('Failed to clear expired cache:', error);
  }
}

/**
 * Store projects in the server cache
 */
export async function cacheProjects(projects: Task[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projects),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cache projects: ${response.statusText}`);
    }
    
    console.log('Projects cached on server');
  } catch (error) {
    console.warn('Failed to cache projects on server:', error);
  }
}

/**
 * Get projects from server cache
 */
export async function getCachedProjects(): Promise<Task[]> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/projects`);
    if (!response.ok) return [];
    
    const projects = await response.json();
    console.log('Using cached projects from server');
    return projects;
  } catch (error) {
    console.warn('Failed to get cached projects from server:', error);
    return [];
  }
}

/**
 * Store project tasks in the server cache
 */
export async function cacheProjectTasks(projectId: string, tasks: Task[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/project/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tasks),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cache project tasks: ${response.statusText}`);
    }
    
    console.log(`Project tasks for ${projectId} cached on server`);
  } catch (error) {
    console.warn(`Failed to cache tasks for project ${projectId}:`, error);
  }
}

/**
 * Get project tasks from server cache
 */
export async function getCachedProjectTasks(projectId: string): Promise<Task[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/project/${projectId}/tasks`);
    if (!response.ok) {
      return null;
    }
    
    const tasks = await response.json();
    console.log(`Using cached tasks for project ${projectId} from server`);
    return tasks;
  } catch (error) {
    console.warn(`Failed to get cached tasks for project ${projectId}:`, error);
    return null;
  }
}

/**
 * Store analyzed project data on the server
 */
export async function cacheAnalyzedData(projectDurations: any[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/analyzed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectDurations),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cache analyzed data: ${response.statusText}`);
    }
    
    console.log('Analyzed data cached on server');
  } catch (error) {
    console.warn('Failed to cache analyzed data on server:', error);
  }
}

/**
 * Get analyzed project data from server cache
 */
export async function getCachedAnalyzedData(): Promise<any[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/analyzed`);
    if (!response.ok) return null;
    
    const analyzedData = await response.json();
    console.log('Using cached analyzed data from server');
    return analyzedData;
  } catch (error) {
    console.warn('Failed to get cached analyzed data from server:', error);
    return null;
  }
}

/**
 * Clear the entire server cache
 */
export async function clearCache(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/clear`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear cache: ${response.statusText}`);
    }
    
    console.log('Server cache cleared');
  } catch (error) {
    console.warn('Failed to clear server cache:', error);
  }
}

/**
 * Get cache status information from server
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  try {
    const response = await fetch(`${API_BASE}/api/cache/status`);
    if (!response.ok) {
      return {
        hasData: false,
        lastUpdated: null,
        projectCount: 0,
        expiresIn: null,
        isPersisted: false,
        isExpired: false,
      };
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Failed to get cache status from server:', error);
    return {
      hasData: false,
      lastUpdated: null,
      projectCount: 0,
      expiresIn: null,
      isPersisted: false,
      isExpired: false,
    };
  }
}