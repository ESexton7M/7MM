import { projectSkipList } from '../config/projectSkipList';

/**
 * List of project groups to exclude
 */
const excludedProjectGroups = [
  "Video and Photo Projects"
];

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
 * Filters out projects based on their project group membership
 * @param projects Array of projects with potential projects array
 * @returns Filtered array excluding projects in excluded groups
 */
export function filterProjectsByGroup<T extends { projects?: Array<{ gid: string; name: string }> }>(projects: T[]): T[] {
  return projects.filter(project => {
    if (!project.projects || project.projects.length === 0) {
      return true; // Keep projects with no group membership
    }
    
    // Check if any of the project's groups are in the excluded list
    return !project.projects.some(projectGroup => 
      excludedProjectGroups.some(excludedGroup => 
        projectGroup.name.toLowerCase() === excludedGroup.toLowerCase()
      )
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
