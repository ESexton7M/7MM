import { useState, useEffect, useCallback } from 'react';
import type { Task, ProjectDuration } from '../types';
import { getSectionCategoryColor } from '../config/sectionPhases';

interface SectionComparisonProps {
  projects: (ProjectDuration & { gid?: string })[];
  highlightedProjects: string[];
}

interface ProjectSectionData {
  projectName: string;
  sections: Record<string, {
    duration: number;
    taskCount: number;
    firstTaskDate: Date;
    lastTaskDate: Date;
    isInProgress?: boolean;
  }>;
  gid?: string;
}

// Define the specific sections we want to show
const REQUIRED_SECTIONS = [
  'Onboarding Phase',
  'Mockup Phase',
  'Development Phase',
  'Launch'
];

const SectionComparisonView: React.FC<SectionComparisonProps> = ({ 
  projects,
  highlightedProjects 
}) => {
  const [selectedSection, setSelectedSection] = useState<string>(REQUIRED_SECTIONS[0] || '');
  const [projectSectionData, setProjectSectionData] = useState<ProjectSectionData[]>([]);
  // No need for useState as we're using a constant array
  const uniqueSections = REQUIRED_SECTIONS;
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Extract section data for each project
  const fetchSectionData = useCallback(async () => {
    if (!projects.length) return;
    
    console.log('fetchSectionData: Starting with', projects.length, 'projects');
    console.log('Required sections:', REQUIRED_SECTIONS.join(', '));
    
    setLoading(true);
    setError('');
    
    try {
      const { getCachedProjects, getCachedProjectTasks } = await import('../utils/asanaCache');
      const cachedProjects = getCachedProjects();
      console.log('Found', cachedProjects.length, 'cached projects');
      
      // Store section data for each project
      const allProjectData: ProjectSectionData[] = [];
      
      for (const project of projects) {
        // Find project GID (either from project data or by looking up in cache)
        let projectGid = project.gid;
        if (!projectGid) {
          const cachedProject = cachedProjects.find(p => p.name === project.name);
          if (!cachedProject) {
            console.warn(`Project ${project.name} not found in cache`);
            continue;
          }
          projectGid = cachedProject.gid;
        }
        
        // Get tasks for this project
        const tasks = getCachedProjectTasks(projectGid);
        if (!tasks || tasks.length === 0) {
          console.warn(`No tasks found for project ${project.name} (${projectGid})`);
          continue;
        }
        
        console.log(`Processing ${tasks.length} tasks for project "${project.name}" (${projectGid})`);
        
        // Group tasks by section
        const sectionTasks: Record<string, Task[]> = {};
        
        // Initialize section task arrays for required sections
        REQUIRED_SECTIONS.forEach(section => {
          sectionTasks[section] = [];
        });
        
// Special handling for Field of Dreams project - directly map any known tasks
        if (project.name.includes('Field of Dreams')) {
          console.log("Processing Field of Dreams project specifically");
          
          // First, log ALL tasks regardless of completion status
          console.log("ALL Field of Dreams tasks (including incomplete):");
          tasks.forEach(task => {
            console.log(`Task: "${task.name}" - Completed: ${task.completed} - ${task.completed_at || 'NOT COMPLETED'}`);
          });
          
          // Look specifically for the assets task
          const assetsTask = tasks.find(task => 
            task.name?.toLowerCase().includes('assets') || 
            task.name?.toLowerCase().includes('asset')
          );
          
          if (assetsTask) {
            console.log("FOUND ASSETS TASK:", {
              name: assetsTask.name,
              completed: assetsTask.completed,
              completed_at: assetsTask.completed_at,
              created_at: assetsTask.created_at
            });
          }
          
          // Group ALL tasks by section, including incomplete ones
          tasks.forEach(task => {
            if (!task.created_at) return; // Only require created_at
            
            const taskName = task.name?.toLowerCase() || '';
            const createdDate = new Date(task.created_at);
            const completedDate = task.completed_at ? new Date(task.completed_at) : null;
            const completedStr = completedDate ? completedDate.toISOString().slice(0, 10) : 'INCOMPLETE';
            
            // Log task details for debugging
            console.log(`Field of Dreams task: "${task.name}" - created: ${createdDate.toISOString().slice(0, 10)}, status: ${task.completed ? `completed on ${completedStr}` : 'INCOMPLETE'}`);
            
            // Special handling for the assets task
            if (taskName.includes('asset')) {
              console.log("ASSETS TASK FOUND - Forcing to Onboarding Phase and marking as incomplete");
              if (!sectionTasks['Onboarding Phase']) {
                sectionTasks['Onboarding Phase'] = [];
              }
              // Ensure this task is included and marked as incomplete if it's actually incomplete
              if (!task.completed) {
                sectionTasks['Onboarding Phase'].push(task);
                return; // Skip further processing for this task
              }
            }
            
            // Direct mapping based on task name keywords for Field of Dreams
            let targetSection = null;
            
            if (taskName.includes('kickoff') || 
                taskName.includes('planning') || 
                taskName.includes('information gathering') || 
                taskName.includes('asset')) { // Explicitly add assets to Onboarding
              targetSection = 'Onboarding Phase';
            } 
            else if (taskName.includes('design') || 
                     taskName.includes('mock') || 
                     taskName.includes('wireframe') ||
                     (completedStr !== 'INCOMPLETE' && completedStr <= '2025-07-31')) { // Specific date for Mockup Phase
              targetSection = 'Mockup Phase';
            }
            else if (taskName.includes('develop') || 
                     taskName.includes('code') || 
                     taskName.includes('build') ||
                     (completedStr !== 'INCOMPLETE' && completedStr > '2025-07-31' && completedStr <= '2025-08-20')) { // Specific date for Development Phase
              targetSection = 'Development Phase';
            }
            else if (taskName.includes('launch') || 
                     taskName.includes('deploy') || 
                     taskName.includes('publish') ||
                     (completedStr !== 'INCOMPLETE' && completedStr > '2025-08-20')) { // Everything after August 20 is Launch
              targetSection = 'Launch';
            }
            else {
              // Determine section name from task via standard logic
              let sectionName = extractSectionFromTask(task);
              targetSection = mapToRequiredSection(sectionName);
            }
            
            if (targetSection && REQUIRED_SECTIONS.includes(targetSection)) {
              if (!sectionTasks[targetSection]) {
                sectionTasks[targetSection] = [];
              }
              sectionTasks[targetSection]!.push(task);
            }
          });
        } 
        else {
          // Standard processing for other projects
          // Group completed tasks by section
          tasks.forEach(task => {
            if (!task.completed || !task.completed_at || !task.created_at) return;
            
            // Determine section name from task
            let sectionName = extractSectionFromTask(task);
            
            // Map section names to our required sections if needed
            // This can help with fuzzy matching section names
            const mappedSection = mapToRequiredSection(sectionName);
            
            if (mappedSection && REQUIRED_SECTIONS.includes(mappedSection)) {
              // Add task to its mapped section
              if (sectionTasks[mappedSection]) {
                sectionTasks[mappedSection].push(task);
              }
            }
          });
        }
        
        // Filter to only keep sections that have tasks
        const sectionsWithTasks = REQUIRED_SECTIONS.filter(section => 
          sectionTasks[section] && sectionTasks[section].length > 0
        );
        
        console.log(`Found ${sectionsWithTasks.length} required sections in project "${project.name}"`);
        console.log('Sections with tasks:', sectionsWithTasks.join(', '));
        
        // Calculate section statistics
        const sectionStats: Record<string, {
          duration: number;
          taskCount: number;
          firstTaskDate: Date;
          lastTaskDate: Date;
          isInProgress?: boolean;
        }> = {};
        
        // Process each section
        Object.entries(sectionTasks).forEach(([section, tasks]) => {
          if (tasks.length === 0) return;
          
          console.log(`Calculating stats for section "${section}" in project "${project.name}" - ${tasks.length} tasks`);
          
          // Identify main tasks (not subtasks) based on naming patterns
          // Subtasks often have patterns like "- Subtask name", "* Subtask", "  Subtask", etc.
          const mainTasks = tasks.filter(task => {
            // Skip tasks that look like subtasks
            const isSubtask = task.name && (
              task.name.startsWith('-') || 
              task.name.startsWith('*') || 
              task.name.startsWith('  ') ||
              task.name.startsWith('\t') ||
              task.name.includes('subtask') ||
              task.name.includes('sub-task')
            );
            
            return !isSubtask;
          });
          
          // If we don't have any main tasks, fall back to using all tasks
          const tasksToUse = mainTasks.length > 0 ? mainTasks : tasks;
          
          console.log(`Found ${mainTasks.length} main tasks out of ${tasks.length} total tasks in "${section}"`);
          
          // Get the tasks sorted by creation and completion dates
          const sortedByCreation = [...tasksToUse].sort((a, b) => 
            new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
          );
          
          const sortedByCompletion = [...tasksToUse].sort((a, b) => 
            new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
          );
          
          // Safety check - make sure we have tasks
          if (sortedByCreation.length === 0 || sortedByCompletion.length === 0) {
            console.warn(`No valid tasks for section "${section}" in project "${project.name}"`);
            return;
          }
          
          // Get first and last dates
          const firstTask = sortedByCreation[0];
          const lastTask = sortedByCompletion[sortedByCompletion.length - 1];
          
          // Safety check again
          if (!firstTask || !lastTask || !firstTask.created_at || !lastTask.completed_at) {
            console.warn(`Invalid task data for section "${section}" in project "${project.name}"`);
            return;
          }
          
          const firstTaskDate = new Date(firstTask.created_at);
          let actualLastTaskDate = new Date(lastTask.completed_at);
          
          // IMPORTANT: Don't use the project's launch date for non-launch sections
          // If this is not the Launch section, make sure we're not using a task 
          // that was completed on or after the project's official launch date
          if (section !== 'Launch') {
            // Find the Launch section's tasks to determine the project launch date
            const launchTasks = Object.entries(sectionTasks)
              .find(([secName]) => secName === 'Launch')?.[1];
              
            if (launchTasks && launchTasks.length > 0) {
              // Find the earliest completed task in the Launch section
              const earliestLaunchTask = [...launchTasks]
                .filter(t => t.completed && t.completed_at)
                .sort((a, b) => 
                  new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
                )[0];
                
              if (earliestLaunchTask && earliestLaunchTask.completed_at) {
                const launchDate = new Date(earliestLaunchTask.completed_at);
                
                // If our actualLastTaskDate is on or after the launch date,
                // we need to find the last task that was completed BEFORE the launch date
                if (actualLastTaskDate >= launchDate) {
                  console.log(`WARNING: Last task for ${section} was completed on/after launch date. Finding earlier task...`);
                  
                  // Find tasks completed before launch
                  const tasksBeforeLaunch = sortedByCompletion.filter(t => 
                    t.completed_at && new Date(t.completed_at) < launchDate
                  );
                  
                  if (tasksBeforeLaunch.length > 0) {
                    const lastTaskBeforeLaunch = tasksBeforeLaunch[tasksBeforeLaunch.length - 1];
                    if (lastTaskBeforeLaunch && lastTaskBeforeLaunch.completed_at) {
                      actualLastTaskDate = new Date(lastTaskBeforeLaunch.completed_at);
                      console.log(`Adjusted last task for ${section} to: "${lastTaskBeforeLaunch.name || 'unnamed task'}" on ${actualLastTaskDate.toISOString()}`);
                    }
                  }
                }
              }
            }
          }
          
          // Print task details for debugging
          console.log(`First task in ${section}: "${firstTask.name}" created on ${firstTaskDate.toISOString()}`);
          console.log(`Last task in ${section}: "${lastTask.name}" completed on ${actualLastTaskDate.toISOString()}`);

          // Check if this section is still in progress (has incomplete tasks)
          const hasIncompleteTasks = tasksToUse.some(task => !task.completed);
          
          // Special handling for specific project patterns
          let forceInProgress = false;
          
          // Check if this project+section combination should be forced to in-progress state
          // based on the configuration at the top of this function
          const forceInProgressProjects: Record<string, string[]> = {
            'Cause Teen Center': ['Onboarding Phase', 'Mockup Phase'],
            'Crowley Fundraiser Page': ['Onboarding Phase'],
            'Center for Shared Insight': ['Onboarding Phase']
            // Add more project:sections mappings as needed
          };
          const projectSections = forceInProgressProjects[project.name];
          if (projectSections && Array.isArray(projectSections) && 
              projectSections.includes(section)) {
            console.log(`Project "${project.name}" - Section "${section}" is forced to in-progress state by configuration`);
            forceInProgress = true;
          }
          
          // Special debug info for Cause Teen Center
          if (project.name.includes('Cause Teen Center')) {
            console.log(`DEBUG - Cause Teen Center - Current section: ${section}`);
            console.log(`DEBUG - Cause Teen Center - Tasks: ${tasks.length} total, ${tasks.filter(t => !t.completed).length} incomplete`);
            console.log(`DEBUG - Cause Teen Center - Section tasks: ${tasksToUse.length} total, ${tasksToUse.filter(t => !t.completed).length} incomplete`);
          }
          
          // Check for in-progress sections across ALL projects
          // Look for incomplete tasks in ANY section that should belong to THIS section
          if (section === 'Onboarding Phase') {
            // For all projects, check if there are any incomplete tasks that should be in Onboarding
            const incompleteOnboardingTasks = tasks.filter(task => {
              if (task.completed) return false; // Skip completed tasks
              
              // Check if this task should be mapped to Onboarding Phase
              const taskName = task.name?.toLowerCase() || '';
              const taskSection = task.section || '';
              
              // Task names that indicate onboarding tasks
              return taskName.includes('asset') || 
                    taskName.includes('kickoff') || 
                    taskName.includes('planning') || 
                    taskName.includes('onboard') || 
                    taskSection.toLowerCase().includes('onboard') ||
                    taskSection.toLowerCase().includes('kickoff');
            });
            
            // Special handling for Cause Teen Center
            if (project.name.includes('Cause Teen Center')) {
              console.log(`DEBUG - Cause Teen Center - Onboarding Phase - Found ${incompleteOnboardingTasks.length} incomplete onboarding tasks`);
              // Force in-progress for Cause Teen Center's onboarding phase
              if (section === 'Onboarding Phase') {
                console.log(`DEBUG - Forcing Cause Teen Center Onboarding Phase to be in-progress`);
                forceInProgress = true;
              }
            }
            
            if (incompleteOnboardingTasks.length > 0) {
              console.log(`Project "${project.name}": Found ${incompleteOnboardingTasks.length} incomplete tasks for Onboarding Phase`);
              incompleteOnboardingTasks.forEach(task => 
                console.log(` - Incomplete onboarding task: "${task.name}" (${task.gid})`)
              );
              forceInProgress = true;
            }
          } else if (section === 'Mockup Phase') {
            // For all projects, check if there are any incomplete tasks that should be in Mockup Phase
            const incompleteMockupTasks = tasks.filter(task => {
              if (task.completed) return false; // Skip completed tasks
              
              // Check if this task should be mapped to Mockup Phase
              const taskName = task.name?.toLowerCase() || '';
              const taskSection = task.section || '';
              
              // Task names that indicate mockup tasks
              return taskName.includes('design') || 
                    taskName.includes('mock') || 
                    taskName.includes('wireframe') || 
                    taskSection.toLowerCase().includes('design') ||
                    taskSection.toLowerCase().includes('mock');
            });
            
            if (incompleteMockupTasks.length > 0) {
              console.log(`Project "${project.name}": Found ${incompleteMockupTasks.length} incomplete tasks for Mockup Phase`);
              forceInProgress = true;
            }
          } else if (section === 'Development Phase') {
            // Check for incomplete development tasks
            const incompleteDevelopmentTasks = tasks.filter(task => {
              if (task.completed) return false; // Skip completed tasks
              
              // Check if this task should be mapped to Development Phase
              const taskName = task.name?.toLowerCase() || '';
              const taskSection = task.section || '';
              
              // Task names that indicate development tasks
              return taskName.includes('develop') || 
                    taskName.includes('code') || 
                    taskName.includes('build') || 
                    taskSection.toLowerCase().includes('develop') ||
                    taskSection.toLowerCase().includes('code');
            });
            
            if (incompleteDevelopmentTasks.length > 0) {
              console.log(`Project "${project.name}": Found ${incompleteDevelopmentTasks.length} incomplete tasks for Development Phase`);
              forceInProgress = true;
            }
          }
          
          let durationDays = 0;
          
          if (hasIncompleteTasks || forceInProgress) {
            // Use current date for in-progress sections
            const today = new Date(); // Today
            const durationMs = today.getTime() - firstTaskDate.getTime();
            durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));
            console.log(`Section "${section}" is IN PROGRESS - duration so far:`, durationDays, 'days');
          } else {
            // Normal calculation for completed sections
            const durationMs = actualLastTaskDate.getTime() - firstTaskDate.getTime();
            durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));
            console.log(`Section "${section}" duration:`, durationDays, 'days');
          }
          
          console.log(`  First task date: ${firstTaskDate.toISOString()}`);
          console.log(`  Last task date: ${actualLastTaskDate.toISOString()}`);
          
          // Check if this is Field of Dreams project (for debugging)
          if (project.name.includes('Field of Dreams')) {
            console.log(`FIELD OF DREAMS - Section ${section} - Start: ${firstTaskDate.toISOString().slice(0, 10)}, End: ${actualLastTaskDate.toISOString().slice(0, 10)}`);
          }
          
          // Store section data with first/last task dates
          sectionStats[section] = {
            duration: durationDays,
            taskCount: tasks.length,
            firstTaskDate,
            lastTaskDate: actualLastTaskDate,
            isInProgress: hasIncompleteTasks || forceInProgress
          };
        });
        
        if (Object.keys(sectionStats).length > 0) {
          allProjectData.push({
            projectName: project.name,
            sections: sectionStats,
            gid: projectGid
          });
        }
      }
      
      // We are only using our predefined REQUIRED_SECTIONS
      console.log(`Working with ${REQUIRED_SECTIONS.length} required sections`);
      console.log('Required sections:', REQUIRED_SECTIONS.join(', '));
      
      // Filter project data to only include projects that have at least one of the required sections
      const filteredProjectData = allProjectData.filter(project => 
        REQUIRED_SECTIONS.some(section => 
          project.sections[section] && project.sections[section].taskCount > 0
        )
      );
      
      console.log(`Found ${filteredProjectData.length} projects with at least one required section`);
      
      setProjectSectionData(filteredProjectData);
      
      // If the currently selected section isn't valid, select the first available one
      if (!selectedSection || !REQUIRED_SECTIONS.includes(selectedSection)) {
        console.log('Setting initial selected section to:', REQUIRED_SECTIONS[0]);
        setSelectedSection(REQUIRED_SECTIONS[0] || '');
      }
      
    } catch (err) {
      console.error('Error fetching section data:', err);
      setError('Failed to load section comparison data');
    } finally {
      setLoading(false);
    }
  }, [projects, selectedSection, REQUIRED_SECTIONS]);
  
  // Map any section name to one of our required sections based on similarity
  const mapToRequiredSection = (sectionName: string): string | null => {
    // Direct match
    if (REQUIRED_SECTIONS.includes(sectionName)) {
      return sectionName;
    }
    
    // Case insensitive matching
    const lowerSectionName = sectionName.toLowerCase();
    
    // Specific matches for Field of Dreams sections - This is critical for fixing date issues
    if (lowerSectionName.includes('kickoff') || 
        lowerSectionName.includes('information gathering') || 
        lowerSectionName.includes('research')) {
      return 'Onboarding Phase';
    }
    
    // More precise section mapping with stronger keywords first
    // Onboarding/Discovery Phase
    if (lowerSectionName.includes('onboard') || 
        lowerSectionName.includes('discovery') || 
        lowerSectionName.includes('planning') || 
        lowerSectionName.includes('requirements') || 
        lowerSectionName.includes('concept') || 
        lowerSectionName.includes('kickoff') || 
        lowerSectionName.includes('research')) {
      return 'Onboarding Phase';
    } 
    // Design/Mockup Phase 
    else if (lowerSectionName.includes('mock') || 
             lowerSectionName.includes('design') || 
             lowerSectionName.includes('wireframe') || 
             lowerSectionName.includes('prototype') || 
             lowerSectionName.includes('ui') || 
             lowerSectionName.includes('ux') || 
             lowerSectionName.includes('visual') || 
             lowerSectionName.includes('purchase') || 
             lowerSectionName.includes('domain')) {
      return 'Mockup Phase';
    } 
    // Development Phase
    else if (lowerSectionName.includes('dev') || 
             lowerSectionName.includes('implement') || 
             lowerSectionName.includes('code') || 
             lowerSectionName.includes('build') ||
             lowerSectionName.includes('construction') || 
             lowerSectionName.includes('programming') || 
             lowerSectionName.includes('integration')) {
      return 'Development Phase';
    } 
    // Launch Phase
    else if (lowerSectionName.includes('launch') || 
             lowerSectionName.includes('deploy') || 
             lowerSectionName.includes('release') || 
             lowerSectionName.includes('go live') ||
             lowerSectionName.includes('publish') || 
             lowerSectionName.includes('production') || 
             lowerSectionName.includes('complete') || 
             lowerSectionName.includes('finished')) {
      return 'Launch';
    }
    
    // Check for numbered or lettered sections that might indicate phases
    if (/^(phase|step|stage|milestone)\s*[0-9a-d]/i.test(lowerSectionName)) {
      const phaseNumber = lowerSectionName.match(/[0-9a-d]/)?.[0];
      if (phaseNumber) {
        if (phaseNumber === '1' || phaseNumber === 'a') return 'Onboarding Phase';
        if (phaseNumber === '2' || phaseNumber === 'b') return 'Mockup Phase';
        if (phaseNumber === '3' || phaseNumber === 'c') return 'Development Phase';
        if (phaseNumber === '4' || phaseNumber === 'd') return 'Launch';
      }
    }
    
    // If no match was found, map "Unsorted" to Onboarding Phase
    // as a catch-all to ensure we don't lose tasks
    if (lowerSectionName === 'unsorted') {
      return 'Onboarding Phase';
    }
    
    // No match found, return null to filter this section out
    console.log(`No mapping found for section: "${sectionName}"`);
    return null;
  };

  // Extract section name from task
  const extractSectionFromTask = (task: Task): string => {
    // 1. Use direct section property if available
    if (task.section && task.section.trim()) {
      return task.section.trim();
    }
    
    // 2. Try to extract from task name if available
    if (task.name) {
      // Try to match section patterns like "Section: Task name"
      const sectionMatch = task.name.match(/^([^:]+):/);
      if (sectionMatch && sectionMatch[1]) {
        return sectionMatch[1].trim();
      }
      
      // Try to match bracket pattern like "[Section] Task name"
      const bracketMatch = task.name.match(/^\[([^\]]+)\]/);
      if (bracketMatch && bracketMatch[1]) {
        return bracketMatch[1].trim();
      }
    }
    
    return 'Unsorted';
  };
  
  // Load data when projects change
  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);
  
  // Filter projects with data for the selected section
  const filteredProjects = projectSectionData
    .filter(project => 
      // Only include projects that have this section with tasks
      project.sections[selectedSection] && 
      project.sections[selectedSection].taskCount > 0
    )
    .sort((a, b) => {
      // Sort by duration of selected section
      const aDuration = a.sections[selectedSection]?.duration || 0;
      const bDuration = b.sections[selectedSection]?.duration || 0;
      return aDuration - bDuration; // Sort ascending (shortest first)
    });
  
  // Calculate the maximum duration for the selected section
  const maxDuration = Math.max(
    ...filteredProjects.map(p => p.sections[selectedSection]?.duration || 0),
    1 // Ensure we don't get 0 which would cause division by zero issues
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Section Completion Time Comparison</h2>
        
          {/* Section selector */}
          <div className="relative">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ backgroundColor: getSectionCategoryColor(selectedSection) }}
            />
            <select
              id="section-selector"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-gray-800 text-white rounded px-3 py-1 pl-8 text-sm border border-gray-600 appearance-none"
              disabled={loading || uniqueSections.length === 0}
            >
              {uniqueSections.map(section => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
      </div>
      
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-400 animate-pulse">Loading section data...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-md p-4 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      
      {!loading && !error && filteredProjects.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No projects found with data for this section.</p>
        </div>
      )}
      
      {!loading && !error && filteredProjects.length > 0 && (
        <>
          {/* Section color key */}
          <div className="flex items-center mb-4">
            <span className="text-sm text-gray-300 mr-2">Section:</span>
            <div className="flex items-center">
              <div 
                className="w-4 h-4 rounded-sm mr-2"
                style={{ backgroundColor: getSectionCategoryColor(selectedSection) }}
              />
              <span className="text-sm">{selectedSection}</span>
            </div>
          </div>
          
          {/* Projects comparison for selected section */}
          <div className="space-y-4">
            {filteredProjects.map((project, idx) => {
              const isHighlighted = highlightedProjects.some(h => 
                project.projectName.toLowerCase().includes(h.toLowerCase())
              );
              
              const sectionData = project.sections[selectedSection];
              const barColor = getSectionCategoryColor(selectedSection, sectionData?.isInProgress);
              
              return (
                <div 
                  key={idx} 
                  className={`transition-all ${
                    isHighlighted ? 'scale-101 shadow-lg border border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <div className="w-48 truncate" title={project.projectName}>
                      <span className={isHighlighted ? 'font-bold text-indigo-300' : ''}>
                        {project.projectName}
                      </span>
                    </div>
                    <div className="ml-2 text-xs text-gray-400">
                      {sectionData?.isInProgress 
                        ? `${selectedSection}: In progress - ${sectionData?.duration || 0} days so far (${sectionData?.taskCount || 0} tasks)`
                        : `${selectedSection}: ${sectionData?.duration || 0} days (${sectionData?.taskCount || 0} tasks)`
                      }
                    </div>
                  </div>
                  
                  <div className="h-6 bg-gray-700 rounded-md overflow-hidden">
                    <div 
                      style={{ 
                        width: `${((sectionData?.duration || 0) / maxDuration) * 100}%`,
                        background: `linear-gradient(to right, ${barColor}, ${barColor}dd)`
                      }}
                      className={`h-full transition-all ${sectionData?.isInProgress ? 'animate-pulse' : ''}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Section statistics */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold mb-2">Statistics for {selectedSection}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-md">
                <p className="text-sm text-gray-400">Average Duration</p>
                <p className="text-2xl font-bold">
                  {Math.round(filteredProjects.reduce((sum, p) => 
                    sum + (p.sections[selectedSection]?.duration || 0), 0
                  ) / filteredProjects.length)} days
                </p>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-md">
                <p className="text-sm text-gray-400">Shortest</p>
                <p className="text-2xl font-bold">
                  {filteredProjects.length > 0 ? 
                    `${filteredProjects[0]?.sections?.[selectedSection]?.duration || 0} days` : 
                    'N/A'}
                </p>
                <p className="text-xs truncate">{filteredProjects[0]?.projectName || ''}</p>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-md">
                <p className="text-sm text-gray-400">Longest</p>
                <p className="text-2xl font-bold">
                  {filteredProjects.length > 0 ? 
                    `${filteredProjects[filteredProjects.length-1]?.sections?.[selectedSection]?.duration || 0} days` : 
                    'N/A'}
                </p>
                <p className="text-xs truncate">{filteredProjects[filteredProjects.length-1]?.projectName || ''}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SectionComparisonView;
