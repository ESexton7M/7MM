import React, { useState, useMemo, useEffect } from 'react';
import type { ProjectDuration, Task } from '../types';
import ProjectDurationChart from './ProjectDurationChart';
import { getSectionCategoryColor } from '../config/sectionPhases';
import { 
  daysToWeeks, 
  formatDurationInWeeks, 
  calculateStatistics, 
  formatNumber 
} from '../utils/statistics';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// Define the specific sections we want to show
const REQUIRED_SECTIONS = [
  'Onboarding Phase',
  'Mockup Phase',
  'Development Phase',
  'Launch'
];

interface ComparisonTabsProps {
  projectDurations: (ProjectDuration & { gid?: string })[];
  highlightedProjects: string[];
  sortMethod: string;
  onProjectClick?: (projectName: string) => void;
}

type ComparisonMode = 'projects' | 'sections';
type TabId = ComparisonMode | string;

const ComparisonTabs: React.FC<ComparisonTabsProps> = ({ projectDurations, highlightedProjects, sortMethod, onProjectClick }) => {
  const [activeTab, setActiveTab] = useState<TabId>('projects');
  // Start with the first required section as the default
  const [selectedSection, setSelectedSection] = useState<string>(REQUIRED_SECTIONS[0] || '');
  // Use our predefined sections instead of fetching from tasks
  const availableSections = REQUIRED_SECTIONS;

  // Helper function to sort section comparison data
  const sortSectionData = (data: any[], sortMethod: string) => {
    const sorted = [...data];
    switch (sortMethod) {
      case 'created-asc':
      case 'created-desc':
        // For sections, we don't have created dates, so fall back to alphabetical
        return sortMethod === 'created-asc' 
          ? sorted.sort((a, b) => a.name.localeCompare(b.name))
          : sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'completed-asc':
        return sorted.sort((a, b) => {
          if (!a.completed || !b.completed) return 0;
          return new Date(a.completed).getTime() - new Date(b.completed).getTime();
        });
      case 'completed-desc':
        return sorted.sort((a, b) => {
          if (!a.completed || !b.completed) return 0;
          return new Date(b.completed).getTime() - new Date(a.completed).getTime();
        });
      case 'alpha-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'alpha-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'duration-desc':
        return sorted.sort((a, b) => b.duration - a.duration);
      case 'duration-asc':
      default:
        return sorted.sort((a, b) => a.duration - b.duration);
    }
  };

  // State to hold section-specific data
  const [projectSectionData, setProjectSectionData] = useState<
    Record<string, { projectName: string; sectionDuration: number; completed: string }>
  >({});

  // We're using predefined sections, but we still need to preload section data
  useEffect(() => {
    const loadSectionData = async () => {
      try {
        // Just a dummy function to set up the initial state
        console.log("Using predefined sections:", REQUIRED_SECTIONS);
        
        // Make sure we have a valid selected section
        if (!selectedSection || !REQUIRED_SECTIONS.includes(selectedSection)) {
          setSelectedSection(REQUIRED_SECTIONS[0] || 'Onboarding Phase');
        }
      } catch (err) {
        console.error('Error loading section data:', err);
      }
    };
    
    loadSectionData();
  }, [projectDurations, selectedSection]);
  
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
    
    return null;
  };

  // Extract section name from task
  const extractSectionFromTask = (task: any): string => {
    let rawSectionName = '';
    
    // 1. Use direct section property if available
    if (task.section && typeof task.section === 'string' && task.section.trim()) {
      rawSectionName = task.section.trim();
    }
    // 2. Try to extract from task name if available
    else if (task.name) {
      // Try to match section patterns like "Section: Task name"
      const sectionMatch = task.name.match(/^([^:]+):/);
      if (sectionMatch && sectionMatch[1]) {
        rawSectionName = sectionMatch[1].trim();
      }
      // Try to match bracket pattern like "[Section] Task name"
      else {
        const bracketMatch = task.name.match(/^\[([^\]]+)\]/);
        if (bracketMatch && bracketMatch[1]) {
          rawSectionName = bracketMatch[1].trim();
        }
      }
    }
    
    // If we found a section name, try to map it to one of our required sections
    if (rawSectionName) {
      const mappedSection = mapToRequiredSection(rawSectionName);
      if (mappedSection) {
        return mappedSection;
      }
    }
    
    // Default to the first required section if nothing was found
    return REQUIRED_SECTIONS[0] || 'Onboarding Phase';
  };

  // Generate section durations when a section is selected
  useEffect(() => {
    // Skip if not in section comparison mode
    if (activeTab !== 'sections' && !activeTab.startsWith('section-')) return;
    
    const fetchSectionData = async () => {
      try {
        const { getCachedProjects, getCachedProjectTasks } = await import('../utils/asanaCache');
        const cachedProjects = getCachedProjects();
        
        const sectionData: Record<string, { 
          projectName: string; 
          sectionDuration: number; 
          completed: string 
        }> = {};
        
        // Process each project to get section-specific durations
        for (const project of projectDurations) {
          // Find project GID
          let projectGid = project.gid;
          if (!projectGid) {
            const cachedProject = cachedProjects.find(p => p.name === project.name);
            if (!cachedProject) continue;
            projectGid = cachedProject.gid;
          }
          
          // Get tasks for this project
          const tasks = getCachedProjectTasks(projectGid);
          if (!tasks || tasks.length === 0) continue;
          
          // Filter for completed tasks in the selected section
          let sectionTasks: Task[] = [];
          
          // Special handling for Field of Dreams project
          if (project.name.includes('Field of Dreams')) {
            console.log(`ComparisonTabs: Processing Field of Dreams tasks for section ${selectedSection}`);
            
            // Filter tasks specifically for Field of Dreams
            sectionTasks = tasks.filter(task => {
              if (!task.completed || !task.completed_at || !task.created_at) return false;
              
              const taskName = task.name?.toLowerCase() || '';
              const completedDate = new Date(task.completed_at);
              const completedStr = completedDate.toISOString().slice(0, 10);
              
              // Direct mapping based on task name keywords and completion dates for Field of Dreams
              if (selectedSection === 'Onboarding Phase') {
                return taskName.includes('kickoff') || 
                       taskName.includes('planning') || 
                       taskName.includes('information gathering');
              } 
              else if (selectedSection === 'Mockup Phase') {
                return (taskName.includes('design') || 
                        taskName.includes('mock') || 
                        taskName.includes('wireframe') ||
                        completedStr <= '2025-07-31'); // Specific date for Mockup Phase
              }
              else if (selectedSection === 'Development Phase') {
                return (taskName.includes('develop') || 
                        taskName.includes('code') || 
                        taskName.includes('build') ||
                        (completedStr > '2025-07-31' && completedStr <= '2025-08-20')); // Specific date for Development Phase
              }
              else if (selectedSection === 'Launch') {
                return (taskName.includes('launch') || 
                        taskName.includes('deploy') || 
                        taskName.includes('publish') ||
                        completedStr > '2025-08-20'); // Everything after August 20 is Launch
              }
              
              return false;
            });
            
            console.log(`Found ${sectionTasks.length} Field of Dreams tasks for ${selectedSection}`);
          } else {
            // Standard processing for other projects
            sectionTasks = tasks.filter(task => {
              if (!task.completed || !task.completed_at || !task.created_at) return false;
              const taskSection = extractSectionFromTask(task);
              return mapToRequiredSection(taskSection) === selectedSection;
            });
          }
          
          if (sectionTasks.length === 0) continue;
          
          // Identify main tasks (not subtasks) based on naming patterns
          // Subtasks often have patterns like "- Subtask name", "* Subtask", "  Subtask", etc.
          const mainTasks = sectionTasks.filter(task => {
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
          const tasksToUse = mainTasks.length > 0 ? mainTasks : sectionTasks;
          console.log(`Project "${project.name}": Found ${mainTasks.length} main tasks out of ${sectionTasks.length} total tasks in "${selectedSection}"`);
          
          // Get the tasks sorted by creation and completion dates
          const sortedByCreation = [...tasksToUse].sort((a, b) => 
            new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
          );
          
          const sortedByCompletion = [...tasksToUse].sort((a, b) => 
            new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
          );
          
          // Safety check - make sure we have tasks
          if (sortedByCreation.length === 0 || sortedByCompletion.length === 0) {
            console.warn(`No valid tasks for section "${selectedSection}" in project "${project.name}"`);
            continue;
          }
          
          // Get first and last tasks
          const firstTask = sortedByCreation[0];
          const lastTask = sortedByCompletion[sortedByCompletion.length - 1];
          
          // Safety check again
          if (!firstTask || !lastTask || !firstTask.created_at || !lastTask.completed_at) {
            console.warn(`Invalid task data for section "${selectedSection}" in project "${project.name}"`);
            continue;
          }
          
          const firstTaskDate = new Date(firstTask.created_at);
          const lastTaskDate = new Date(lastTask.completed_at);
          
          // Print task details for debugging (especially for Field of Dreams)
          if (project.name.includes('Field of Dreams')) {
            console.log(`FIELD OF DREAMS - Section ${selectedSection}:`);
            console.log(`First task: "${firstTask.name}" created on ${firstTaskDate.toISOString().slice(0, 10)}`);
            console.log(`Last task: "${lastTask.name}" completed on ${lastTaskDate.toISOString().slice(0, 10)}`);
          }
          
          const firstTaskTime = firstTaskDate.getTime();
          const lastTaskTime = lastTaskDate.getTime();
          
          // Calculate duration in days
          const durationMs = lastTaskTime - firstTaskTime;
          const durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));
          
          // Store real section data
          sectionData[project.name] = {
            projectName: project.name,
            sectionDuration: durationDays,
            completed: new Date(lastTaskTime).toISOString()
          };
        }
        
        setProjectSectionData(sectionData);
      } catch (err) {
        console.error('Error fetching section data:', err);
      }
    };
    
    fetchSectionData();
  }, [activeTab, selectedSection, projectDurations]);

  // Generate data for section-based comparison
  const sectionComparisonData = useMemo(() => {
    if (activeTab !== 'sections' && !activeTab.startsWith('section-')) return [];
    
    // If viewing a specific section, extract that section name
    const sectionToCompare = activeTab === 'sections' ? selectedSection : 
      activeTab.startsWith('section-') ? activeTab.replace('section-', '') : selectedSection;
    
    // For each project, create a bar data item for the chart
    const unsortedData = projectDurations
      .map(project => {
        const isHighlighted = highlightedProjects.some(h => 
          project.name.toLowerCase().includes(h.toLowerCase())
        );
        
        // Use section-specific duration if available, otherwise use the project's overall duration
        const sectionData = projectSectionData[project.name];
        const duration = sectionData ? sectionData.sectionDuration : project.duration;
        const completedDate = sectionData ? sectionData.completed : project.completed;
        
        return {
          name: project.name,
          duration,
          completed: completedDate,
          highlighted: isHighlighted,
          section: sectionToCompare
        };
      })
      .filter(item => item.duration > 0); // Only include items with valid durations
    
    // Apply sorting using the sortSectionData function
    return sortSectionData(unsortedData, sortMethod);
  }, [activeTab, selectedSection, projectDurations, highlightedProjects, projectSectionData, sortMethod]);

  // Custom tooltip for section comparison
  const SectionTooltip: React.FC<any> = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg shadow-lg">
        <p className="text-gray-200 font-bold mb-1">{data.name}</p>
        <p className="text-gray-300">
          <span className="text-indigo-400 font-semibold">{formatDurationInWeeks(data.duration)}</span> for {data.section}
        </p>
        <p className="text-gray-400 text-xs">
          ({data.duration} days)
        </p>
        {data.completed && (
          <p className="text-gray-400 text-sm mt-1">
            Completed: {new Date(data.completed).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-col sm:flex-row border-b border-gray-700">
        <button
          className={`py-2 px-3 sm:px-4 font-medium text-sm sm:text-base ${
            activeTab === 'projects'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('projects')}
        >
          Project Completion
        </button>
        
        <div className="relative group">
          <button
            className={`py-2 px-3 sm:px-4 font-medium flex items-center text-sm sm:text-base ${
              activeTab === 'sections' || activeTab.startsWith('section-')
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('sections')}
          >
            Section Comparison
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          
          {/* Dropdown for section selection */}
          <div className="absolute left-0 hidden z-10 mt-1 w-44 sm:w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 group-hover:block">
            {availableSections.map((section: string) => (
              <button
                key={section}
                className={`block w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm ${
                  (activeTab === 'sections' && selectedSection === section) || activeTab === `section-${section}`
                    ? 'bg-gray-700 text-blue-400'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => {
                  setSelectedSection(section);
                  setActiveTab(`section-${section}`);
                }}
              >
                <div className="flex items-center">
                  <div
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm mr-2"
                    style={{ backgroundColor: getSectionCategoryColor(section) }}
                  />
                  <span className="truncate">{section}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'projects' && (
          <div className="mt-8">
            <ProjectDurationChart
              durations={projectDurations}
              highlightedProjects={highlightedProjects}
              onProjectClick={onProjectClick}
            />
          </div>
        )}

        {(activeTab === 'sections' || activeTab.startsWith('section-')) && (
          <div className="mt-4">
            <div className="mb-4 flex items-center">
              <span className="text-lg font-semibold mr-2">
                Comparing section: 
              </span>
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-sm mr-2"
                  style={{ backgroundColor: getSectionCategoryColor(selectedSection) }}
                />
                <span>{selectedSection}</span>
              </div>
            </div>

            {sectionComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
                <BarChart
                  data={sectionComparisonData}
                  margin={{ top: 20, right: 15, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis
                    dataKey="name"
                    stroke="#A0AEC0"
                    hide={sectionComparisonData.length > 8}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="#A0AEC0"
                    fontSize={12}
                    label={{
                      value: 'Days',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#E2E8F0',
                      offset: 0,
                      style: { fontWeight: 600, fontSize: 12 }
                    }}
                  />
                  <Tooltip content={<SectionTooltip />} />
                  <Bar
                    dataKey="duration"
                    name={`${selectedSection} Duration`}
                    maxBarSize={40}
                  >
                    {sectionComparisonData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.highlighted ? '#F59E0B' : getSectionCategoryColor(selectedSection)}
                        opacity={highlightedProjects.length > 0 ? (entry.highlighted ? 1 : 0.3) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No projects found with data for {selectedSection}.</p>
              </div>
            )}

            {/* Section statistics */}
            {sectionComparisonData.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Statistics for {selectedSection}</h3>
                
                {(() => {
                  // Calculate comprehensive statistics
                  const durations = sectionComparisonData.map(d => d.duration);
                  const stats = calculateStatistics(durations);
                  const statsInWeeks = {
                    mean: daysToWeeks(stats.mean),
                    median: daysToWeeks(stats.median),
                    range: daysToWeeks(stats.range),
                    skewness: stats.skewness, // Skewness is dimensionless
                    standardDeviation: daysToWeeks(stats.standardDeviation),
                    min: daysToWeeks(stats.min || 0),
                    max: daysToWeeks(stats.max || 0),
                    count: stats.count
                  };
                  
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Mean Duration</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(statsInWeeks.mean)} weeks
                        </p>
                        <p className="text-xs text-gray-500">
                          ({formatNumber(stats.mean)} days)
                        </p>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Median Duration</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(statsInWeeks.median)} weeks
                        </p>
                        <p className="text-xs text-gray-500">
                          ({formatNumber(stats.median)} days)
                        </p>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Range Duration</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(statsInWeeks.range)} weeks
                        </p>
                        <p className="text-xs text-gray-500">
                          ({formatNumber(stats.range)} days)
                        </p>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Skewness</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(statsInWeeks.skewness, 2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {stats.skewness > 0 ? 'Right-skewed' : stats.skewness < 0 ? 'Left-skewed' : 'Symmetric'}
                        </p>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Standard Deviation</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(statsInWeeks.standardDeviation)} weeks
                        </p>
                        <p className="text-xs text-gray-500">
                          ({formatNumber(stats.standardDeviation)} days)
                        </p>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Shortest Duration</p>
                        <p className="text-2xl font-bold">
                          {statsInWeeks.count > 0 ? `${statsInWeeks.min} weeks` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {stats.count > 0 ? `(${formatNumber(stats.min || 0)} days)` : ''}
                        </p>
                        {sectionComparisonData.length > 0 && (
                          <p className="text-xs truncate text-gray-400 mt-1">
                            {sectionComparisonData[0]?.name || ''}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Longest Duration</p>
                        <p className="text-2xl font-bold">
                          {statsInWeeks.count > 0 ? `${statsInWeeks.max} weeks` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {stats.count > 0 ? `(${formatNumber(stats.max || 0)} days)` : ''}
                        </p>
                        {sectionComparisonData.length > 0 && (
                          <p className="text-xs truncate text-gray-400 mt-1">
                            {sectionComparisonData[sectionComparisonData.length-1]?.name || ''}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded-md">
                        <p className="text-sm text-gray-400">Sample Size</p>
                        <p className="text-2xl font-bold">
                          {statsInWeeks.count} projects
                        </p>
                        <p className="text-xs text-gray-500">
                          with {selectedSection} data
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { ComparisonTabs };