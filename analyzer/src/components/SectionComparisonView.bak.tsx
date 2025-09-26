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
  }>;
  gid?: string;
}

const SectionComparisonView: React.FC<SectionComparisonProps> = ({ 
  projects,
  highlightedProjects 
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [projectSectionData, setProjectSectionData] = useState<ProjectSectionData[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const fetchSectionData = useCallback(async () => {
    if (!projects.length) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { getCachedProjects, getCachedProjectTasks } = await import('../utils/asanaCache');
      const cachedProjects = getCachedProjects();
      
      // Track all discovered sections across all projects
      const allSections = new Set<string>();
      const projectData: ProjectSectionData[] = [];
      
      for (const project of projects) {
        // Get project GID
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
        if (!tasks || tasks.length === 0) continue;
        
        console.log(`Processing ${tasks.length} tasks for project "${project.name}"`);
        
        // Organize tasks by section
        const sectionTasks: Record<string, Task[]> = {};
        
        // Group completed tasks by section
        tasks.forEach(task => {
          if (!task.completed || !task.completed_at || !task.created_at) return;
          
          // Determine section name from task
          let sectionName = 'Unsorted';
          
          // 1. Try direct section property
          if (task.section) {
            sectionName = task.section;
          }
          // 2. Try extracting from task name
          else if (task.name) {
            const colonPrefix = task.name.match(/^([^:]+):/);
            const bracketPrefix = task.name.match(/^\[([^\]]+)\]/);
            
            if (colonPrefix && colonPrefix[1]) {
              sectionName = colonPrefix[1].trim();
            } else if (bracketPrefix && bracketPrefix[1]) {
              sectionName = bracketPrefix[1].trim();
            }
          }
          
          // Initialize section's task array if needed
          if (!sectionTasks[sectionName]) {
            sectionTasks[sectionName] = [];
          }
          
          // Add task to its section
          sectionTasks[sectionName].push(task);
          
          // Track this section globally
          allSections.add(sectionName);
        });
        
        // Calculate section statistics
        const sectionStats: Record<string, {
          duration: number;
          taskCount: number;
          firstTaskDate: Date;
          lastTaskDate: Date;
        }> = {};
        
        // Process each section
        Object.entries(sectionTasks).forEach(([section, tasks]) => {
          if (tasks.length === 0) return;
          
          // Find earliest task creation and latest completion
          const creationTimes = tasks.map(t => new Date(t.created_at!).getTime());
          const completionTimes = tasks.map(t => new Date(t.completed_at!).getTime());
          
          const firstTaskTime = Math.min(...creationTimes);
          const lastTaskTime = Math.max(...completionTimes);
          
          const firstTaskDate = new Date(firstTaskTime);
          const lastTaskDate = new Date(lastTaskTime);
          
          // Calculate duration in days
          const durationMs = lastTaskTime - firstTaskTime;
          const durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));
          
          console.log(`Project "${project.name}" - Section "${section}": ${durationDays} days (${tasks.length} tasks)`);
          console.log(`  First: ${firstTaskDate.toISOString()}, Last: ${lastTaskDate.toISOString()}`);
          
          // Store section data
          sectionStats[section] = {
            duration: durationDays,
            taskCount: tasks.length,
            firstTaskDate,
            lastTaskDate
          };
        });
        
        // Add this project's data
        if (Object.keys(sectionStats).length > 0) {
          projectData.push({
            projectName: project.name,
            sections: sectionStats,
            gid: projectGid
          });
        }
      }
      
      // Sort sections alphabetically
      const sortedSections = Array.from(allSections).sort();
      
      console.log(`Found ${sortedSections.length} unique sections across all projects`);
      console.log("Available sections:", sortedSections);
      
      setProjectSectionData(projectData);
      setAvailableSections(sortedSections);
      
      // Set initial selected section if needed
      if (sortedSections.length > 0) {
        if (!selectedSection || !sortedSections.includes(selectedSection)) {
          setSelectedSection(sortedSections[0]);
        }
      }
      
    } catch (err) {
      console.error('Error processing section data:', err);
      setError('Failed to load section comparison data');
    } finally {
      setLoading(false);
    }
  }, [projects, selectedSection]);
  
  // Load data when projects change
  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);
  
  // Filter projects with data for the selected section
  const filteredProjects = projectSectionData
    .filter(project => selectedSection && project.sections[selectedSection])
    .sort((a, b) => {
      const aDuration = a.sections[selectedSection]?.duration || 0;
      const bDuration = b.sections[selectedSection]?.duration || 0;
      return aDuration - bDuration; // Sort by duration (shortest first)
    });
  
  // Calculate maximum duration for chart scaling
  const maxDuration = Math.max(
    ...filteredProjects.map(p => p.sections[selectedSection]?.duration || 0),
    1 // Prevent division by zero
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Section Completion Time</h2>
        
        {/* Section selector */}
        <div className="flex items-center">
          <label htmlFor="section-selector" className="text-sm text-gray-300 mr-3">
            Compare Section:
          </label>
          <select
            id="section-selector"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-600"
            disabled={loading || availableSections.length === 0}
          >
            {availableSections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
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
      
      {!loading && !error && (!selectedSection || filteredProjects.length === 0) && (
        <div className="text-center py-8">
          <p className="text-gray-400">No projects found with data for this section.</p>
        </div>
      )}
      
      {!loading && !error && selectedSection && filteredProjects.length > 0 && (
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
                      {`${selectedSection}: ${sectionData?.duration || 0} days (${sectionData?.taskCount || 0} tasks)`}
                    </div>
                  </div>
                  
                  <div className="h-6 bg-gray-700 rounded-md overflow-hidden">
                    <div 
                      style={{ 
                        width: `${((sectionData?.duration || 0) / maxDuration) * 100}%`,
                        backgroundColor: getSectionCategoryColor(selectedSection)
                      }}
                      className="h-full transition-all"
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
                <p className="text-sm text-gray-400">Average Completion Time</p>
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