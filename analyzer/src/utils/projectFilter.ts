import { projectSkipList } from '../config/projectSkipList';

/**
 * Filters out projects that should be skipped based on the configured skip list
 * @param projects Array of projects with name property
 * @returns Filtered array of projects with skip list items removed
 */
export function filterSkippedProjects<T extends { name: string }>(projects: T[]): T[] {
  return projects.filter(project => {
    // Skip projects that match names in the skip list
    return !projectSkipList.some(skipName => 
      // Case-insensitive comparison
      project.name.toLowerCase() === skipName.toLowerCase()
    );
  });
}

/**
 * Check if a single project should be skipped
 * @param projectName The name of the project to check
 * @returns True if the project should be skipped, false otherwise
 */
export function shouldSkipProject(projectName: string): boolean {
  return projectSkipList.some(skipName => 
    projectName.toLowerCase() === skipName.toLowerCase()
  );
}
