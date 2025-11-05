import { useState, useEffect, useCallback, useRef } from 'react';

// Import components
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import DashboardView from './components/DashboardView';
import GoogleLogin from './components/GoogleLogin';
import CacheStatusIndicator from './components/CacheStatusIndicator';
import { ComparisonTabs } from './components/ComparisonTabs';
import { AnimatedSection } from './hooks/useAnimations';
import { 
  calculateStatistics, 
  daysToWeeks, 
  formatNumber 
} from './utils/statistics';

// Import types
import type { 
  Task, 
  ProjectData, 
  ProjectDuration,
  Stats,
  CustomFieldValue
} from './types';

// Import environment utilities
import { loadEnvConfig } from './utils/env';


// --- Main App Component ---
export default function App() {
    // Load environment configuration
    const envConfig = loadEnvConfig();
    const ASANA_API_BASE = envConfig.ASANA_API_BASE;
    
    // State for authentication and project selection
    const [token] = useState<string>(envConfig.ASANA_TOKEN);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [projects, setProjects] = useState<Task[]>([]);
    const [selectedProjectGid, setSelectedProjectGid] = useState<string>('');
    const [projectData, setProjectData] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    
    // State for cross-project analysis
    const [projectDurations, setProjectDurations] = useState<ProjectDuration[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    
    // Section analytics are now handled in ComparisonTabs component

    // Sorting and filtering state for project comparison
    const [projectSort, setProjectSort] = useState<string>('duration-asc');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [highlightQuery, setHighlightQuery] = useState<string>('');
    const [highlightedProjects, setHighlightedProjects] = useState<string[]>([]);
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [ecommerceFilter, setEcommerceFilter] = useState<string>('all');

    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: '', // Will be set to a default in useEffect
        end: ''    // Will be set to a default in useEffect
    });
    const [filteredDurations, setFilteredDurations] = useState<typeof projectDurations>([]);
    
    // Ref for scrolling to project select section
    const projectSelectRef = useRef<HTMLDivElement>(null);

    // Update date range when quarters change
    useEffect(() => {
        // Default start date to 5 years ago
        const defaultStart = new Date();
        defaultStart.setFullYear(defaultStart.getFullYear() - 5);
        
        // Default end date to future
        const defaultEnd = new Date();
        defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
        
        setDateRange({
            start: defaultStart.toISOString().split('T')[0] ?? '',
            end: defaultEnd.toISOString().split('T')[0] ?? ''
        });

        // Automatically fetch projects if token is available
        if (token) {
            handleFetchProjects();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filter and sort projects based on search, date range, and sort criteria
    useEffect(() => {
        if (projectDurations.length > 0) {
            let filtered = [...projectDurations];
            
            // Apply search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(project => 
                    project.name.toLowerCase().includes(query)
                );
            }
            
            // Apply type filter
            if (typeFilter && typeFilter !== 'all') {
                filtered = filtered.filter(project => {
                    const projectType = String(project.type || 'N/A');
                    const filterValue = String(typeFilter);
                    return projectType.toLowerCase() === filterValue.toLowerCase();
                });
            }
            
            // Apply e-commerce filter
            if (ecommerceFilter && ecommerceFilter !== 'all') {
                console.log('Applying e-commerce filter:', ecommerceFilter);
                filtered = filtered.filter(project => {
                    const projectEcommerce = String(project.ecommerce || 'No');
                    console.log(`Project: ${project.name}, E-commerce value: "${projectEcommerce}", Filter: "${ecommerceFilter}", Match: ${projectEcommerce === ecommerceFilter}`);
                    return projectEcommerce === ecommerceFilter;
                });
                console.log('Filtered count after e-commerce filter:', filtered.length);
            }
            
            // Apply date range filter
            if (dateRange.start || dateRange.end) {
                filtered = filtered.filter(project => {
                    // Skip filtering if created date is null
                    if (!project.created) return true;
                    
                    const projectDate = new Date(project.created);
                    const isAfterStart = !dateRange.start || projectDate >= new Date(dateRange.start);
                    const isBeforeEnd = !dateRange.end || projectDate <= new Date(dateRange.end);
                    return isAfterStart && isBeforeEnd;
                });
            }
            
            setFilteredDurations(filtered);
        }
    }, [projectDurations, searchQuery, dateRange, projectSort, typeFilter, ecommerceFilter]);

    // Handle highlight updates
    useEffect(() => {
        if (highlightQuery.trim()) {
            const queries = highlightQuery.toLowerCase().split(',').map(q => q.trim());
            setHighlightedProjects(
                queries.filter(q => q.length > 0)
            );
        } else {
            setHighlightedProjects([]);
        }
    }, [highlightQuery]);

    // Auto-run analyzeAllProjects when sort changes and there is data
    useEffect(() => {
        if (projectDurations.length > 0) {
            analyzeAllProjects();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectSort]);
    
    // Auto-run analyzeAllProjects when projects are fetched
    useEffect(() => {
        if (projects.length > 0 && !analyzing && !projectDurations.length) {
            // Add a short delay before starting analysis to ensure UI updates
            // This gives the user visual feedback that projects loaded first
            const timer = setTimeout(() => {
                analyzeAllProjects();
            }, 500);
            return () => clearTimeout(timer);
        }
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projects]);





    // Automatically re-run analyzeAllProjects when sort method changes and projects have been analyzed at least once
    // Place this after analyzeAllProjects is defined
    // Helper: Extract section from task name (customize as needed)
    function getSectionFromTask(task: Task): string {
        // Example: Task name contains section, e.g. "Section: Onboarding - ..."
        if (!task.name) return 'Unknown';
        // Try to match 'Section: <name>' or '<name> Section' or '[Section] <name>'
        const match = task.name.match(/Section[:\s-]+([\w ]+)/i);
        if (match && typeof match[1] === 'string') return match[1].trim();
        // Fallback: use first word as section
        const fallback = task.name.match(/^(\w+)/);
        return (fallback && typeof fallback[1] === 'string') ? fallback[1] : 'Unknown';
    }

    // Helper: Calculate both total and incremental completion times per section
    const calculateSectionDurations = useCallback((tasks: Task[]): {
        totalDurations: { section: string; avgDuration: number }[];
        incrementalDurations: { section: string; avgDuration: number }[];
    } => {
        // First, organize tasks by section and calculate their durations
        const sectionMap: Record<string, { durations: number[]; completionDates: Date[] }> = {};
        
        tasks.forEach(task => {
            if (task.completed && task.completed_at && task.created_at) {
                const section = getSectionFromTask(task);
                const created = new Date(task.created_at);
                const completed = new Date(task.completed_at);
                const duration = (completed.getTime() - created.getTime()) / (1000 * 3600 * 24); // days
                
                if (!sectionMap[section]) {
                    sectionMap[section] = { durations: [], completionDates: [] };
                }
                sectionMap[section].durations.push(duration);
                sectionMap[section].completionDates.push(completed);
            }
        });

        // Calculate average total durations for each section
        const totalDurations = Object.entries(sectionMap).map(([section, data]) => ({
            section,
            avgDuration: data.durations.length > 0 
                ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
                : 0
        }));

        // Sort sections by average completion date
        const sectionsByTime = Object.entries(sectionMap)
            .map(([section, data]) => ({
                section,
                avgCompletionTime: data.completionDates.reduce((a, b) => a + b.getTime(), 0) / data.completionDates.length
            }))
            .sort((a, b) => a.avgCompletionTime - b.avgCompletionTime);

        // Calculate incremental durations
        const incrementalDurations = sectionsByTime.map((sectionInfo, index) => {
            const currentTotal = totalDurations.find(d => d.section === sectionInfo.section)?.avgDuration ?? 0;
            let previousTotal = 0;
            const prevSectionObj = index > 0 ? sectionsByTime[index - 1] : undefined;
            if (prevSectionObj && typeof prevSectionObj.section === 'string') {
                previousTotal = totalDurations.find(d => d.section === prevSectionObj.section)?.avgDuration ?? 0;
            }
            return {
                section: sectionInfo.section,
                avgDuration: Math.max(0, currentTotal - previousTotal) // Ensure we don't return negative values
            };
        });

        return {
            totalDurations: totalDurations.sort((a, b) => b.avgDuration - a.avgDuration),
            incrementalDurations
        };
    }, []);

    // Helper: Calculate span from first to last completion in each section
    const calculateSectionCompletionSpans = useCallback((tasks: Task[]): { section: string; span: number }[] => {
        const sectionMap: Record<string, Date[]> = {};
        tasks.forEach(task => {
            if (task.completed && task.completed_at) {
                const section = getSectionFromTask(task);
                const completed = new Date(task.completed_at);
                if (!sectionMap[section]) sectionMap[section] = [];
                sectionMap[section].push(completed);
            }
        });
        return Object.entries(sectionMap).map(([section, completions]) => {
            if (completions.length < 2) return { section, span: 0 };
            const min = Math.min(...completions.map(d => d.getTime()));
            const max = Math.max(...completions.map(d => d.getTime()));
            return {
                section,
                span: Math.round((max - min) / (1000 * 3600 * 24))
            };
        }).sort((a, b) => b.span - a.span);
    }, []);

    // Helper: Extract website type from custom fields
    const getWebsiteType = useCallback((project: any): string => {
        // Debug: log the project custom fields
        console.log('Project custom fields for', project.name, ':', project.custom_fields);
        
        // Check project-level custom fields first
        if (project.custom_fields && project.custom_fields.length > 0) {
            const typeField = project.custom_fields.find((cf: CustomFieldValue) => 
                cf.name?.toLowerCase() === 'type'
            );
            console.log('Found type field:', typeField);
            if (typeField) {
                return typeField.display_value || typeField.text_value || 'N/A';
            }
        }
        return 'N/A';
    }, []);

    // Helper: Extract sale price from custom fields
    const getSalePrice = useCallback((project: any): number | string => {
        // Check project-level custom fields first
        if (project.custom_fields && project.custom_fields.length > 0) {
            const priceField = project.custom_fields.find((cf: CustomFieldValue) => 
                cf.name?.toLowerCase() === 'sale price'
            );
            console.log('Found price field:', priceField);
            if (priceField) {
                if (priceField.number_value !== undefined && priceField.number_value !== null) {
                    return priceField.number_value;
                }
                if (priceField.display_value) {
                    // Try to parse the display value as a number if it looks like currency
                    const numericValue = parseFloat(priceField.display_value.replace(/[,$]/g, ''));
                    if (!isNaN(numericValue)) {
                        return numericValue;
                    }
                    return priceField.display_value;
                }
                if (priceField.text_value) {
                    return priceField.text_value;
                }
            }
        }
        return 'N/A';
    }, []);

    // Helper: Extract E-commerce field from custom fields
    const getEcommerce = useCallback((project: any): string => {
        // Check project-level custom fields
        if (project.custom_fields && project.custom_fields.length > 0) {
            const ecommerceField = project.custom_fields.find((cf: CustomFieldValue) => 
                cf.name?.toLowerCase() === 'e-commerce'
            );
            if (ecommerceField) {
                const value = ecommerceField.display_value || ecommerceField.text_value;
                console.log('E-commerce field value for', project.name, ':', value);
                // Return the value or default to 'No' if field exists but has no value
                return value || 'No';
            }
        }
        console.log('No e-commerce field found for', project.name, ', defaulting to No');
        return 'No';
    }, []);

    // Helper: Process dashboard data
    const processDataForDashboard = useCallback((tasks: Task[]) => {
        let completedCount = 0;
        const completionTimes: number[] = [];
        const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const tasksCompletedByDay = dayOfWeek.map(day => ({ name: day, completed: 0 }));
        const tasksCreatedByDay = dayOfWeek.map(day => ({ name: day, created: 0 }));
        const today = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        tasks.forEach((task: Task) => {
            const createdAt = new Date(task.created_at);
            const createdDay = createdAt.getDay();
            if (createdDay >= 0 && createdDay < tasksCreatedByDay.length && createdAt > oneWeekAgo) {
                if (tasksCreatedByDay[createdDay]) tasksCreatedByDay[createdDay].created++;
            }
            if (task.completed && task.completed_at) {
                completedCount++;
                const completedAt = new Date(task.completed_at);
                const completedDay = completedAt.getDay();
                if (completedDay >= 0 && completedDay < tasksCompletedByDay.length && completedAt > oneWeekAgo) {
                    if (tasksCompletedByDay[completedDay]) tasksCompletedByDay[completedDay].completed++;
                }
                const timeDiff = completedAt.getTime() - createdAt.getTime();
                completionTimes.push(timeDiff / (1000 * 3600 * 24)); // in days
            }
        });
        const totalCompletionTime = completionTimes.reduce((acc, time) => acc + time, 0);
        const avgCompletionTimeDays = completionTimes.length > 0
            ? Math.round(totalCompletionTime / completionTimes.length)
            : 0;
        const stats: Stats = {
            totalTasks: tasks.length,
            completedTasks: completedCount,
            pendingTasks: tasks.length - completedCount,
            avgCompletionTimeDays
        };
        const taskTableData = tasks.map((task: Task) => ({
            ...task,
            created_at: new Date(task.created_at).toLocaleDateString(),
            completed_at: task.completed_at ? new Date(task.completed_at).toLocaleDateString() : null,
        })).sort((a: Task, b: Task) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    // Section durations are now handled in the ComparisonTabs component
        setProjectData({
            stats,
            taskTableData,
            tasksCompletedByDay,
            tasksCreatedByDay
        });
    }, [calculateSectionDurations, calculateSectionCompletionSpans]);

    // Helper to calculate project durations with sorting
    const analyzeAllProjects = useCallback(async () => {
        if (!token) {
            setAnalysisError('Please enter your Asana Personal Access Token.');
            return;
        }
        setAnalyzing(true);
        setAnalysisError('');
        try {
            // Import the project filter utility and server cache utilities
            const { filterSkippedProjects } = await import('./utils/projectFilter');
            const { 
                isCacheValid, 
                getCachedProjects, 
                cacheProjects,
                getCachedProjectTasks,
                cacheProjectTasks,
                getCachedAnalyzedData,
                cacheAnalyzedData,
                clearExpiredCache
            } = await import('./utils/serverCache');
            
            // Clear expired cache first
            await clearExpiredCache();
            
            // First check if we have valid cached analysis data
            const cachedAnalyzedData = await getCachedAnalyzedData();
            if (await isCacheValid() && cachedAnalyzedData && cachedAnalyzedData.length > 0) {
                console.log('Using cached analyzed data');
                // Filter out 0-day projects from cached data and sort based on current sort preference
                const filtered = cachedAnalyzedData.filter(project => project.duration > 0);
                const sorted = [...filtered];
                sortProjectDurations(sorted, projectSort);
                setProjectDurations(sorted);
                setAnalyzing(false);
                return;
            }
            
            // Check if we have valid cached projects
            let projectsList = [];
            if (await isCacheValid() && (await getCachedProjects()).length > 0) {
                console.log('Using cached project data');
                projectsList = filterSkippedProjects(await getCachedProjects());
            } else {
                // Step 1: Fetch all workspaces to ensure we don't miss any projects
                const workspacesResponse = await fetch(`${ASANA_API_BASE}/workspaces?opt_fields=name,gid`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!workspacesResponse.ok) throw new Error(`API Error: ${workspacesResponse.statusText}`);
                const workspacesResult = await workspacesResponse.json();
                
                // Step 2: Fetch projects from each workspace
                const allProjects = [];
                for (const workspace of workspacesResult.data) {
                    const projectsResponse = await fetch(`${ASANA_API_BASE}/projects?workspace=${workspace.gid}&opt_fields=name,gid,archived,custom_fields.name,custom_fields.display_value,custom_fields.text_value,custom_fields.number_value`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (projectsResponse.ok) {
                        const projectsResult = await projectsResponse.json();
                        // Only include non-archived projects
                        const activeProjects = projectsResult.data.filter((p: Task & { archived?: boolean }) => !p.archived);
                        allProjects.push(...activeProjects);
                    } else {
                        console.warn(`Could not fetch projects for workspace ${workspace.name}: ${projectsResponse.statusText}`);
                    }
                }
                
                // Cache the raw projects data
                await cacheProjects(allProjects);
                
                // Step 3: Apply skip list filtering
                projectsList = filterSkippedProjects(allProjects);
                console.log(`Found ${allProjects.length} total projects, analyzing ${projectsList.length} after filtering`);
            }
            
            // Step 4: Fetch all tasks for each project with retry logic
            const allTasksResults = [];
            for (const project of projectsList) {
                try {
                    // First check the cache for this project's tasks
                    let projectTasks = await getCachedProjectTasks(project.gid);
                    
                    if (!projectTasks) {
                        // Fetch tasks if not in cache
                        const tasksResponse = await fetch(`${ASANA_API_BASE}/tasks?project=${project.gid}&opt_fields=created_at,completed,completed_at,name,custom_fields,projects&limit=100`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (tasksResponse.ok) {
                            const tasksResult = await tasksResponse.json();
                            projectTasks = tasksResult.data || [];
                            // Cache these tasks
                            await cacheProjectTasks(project.gid, projectTasks as Task[]);
                        } else {
                            console.warn(`Could not fetch tasks for project ${project.name}: ${tasksResponse.statusText}`);
                            projectTasks = [];
                        }
                    }
                    
                    allTasksResults.push({
                        project,
                        tasks: projectTasks
                    });
                } catch (err) {
                    console.error(`Error fetching tasks for project ${project.name}:`, err);
                    // Add empty result to maintain array index alignment
                    allTasksResults.push({ project, tasks: [] });
                }
            }
            
            // Step 5: Calculate durations with robust error handling
            const durations: ProjectDuration[] = [];
            
            allTasksResults.forEach((result) => {
                const { project, tasks } = result;
                
                // Skip if no tasks or invalid data
                if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
                    return;
                }
                
                // Filter out projects from "Video and Photo Projects" group
                if (tasks.length > 0 && tasks[0]?.projects && tasks[0].projects.length > 0) {
                    const isVideoPhotoProject = tasks[0].projects.some(p => 
                        p.name && p.name.toLowerCase() === 'video and photo projects'
                    );
                    if (isVideoPhotoProject) {
                        return; // Skip this project
                    }
                }
                
                // Look for "Launch" or "Completed" task that is marked as completed
                const launchTask = tasks.find((t: Task) => {
                    return t.completed && 
                           t.completed_at && 
                           t.name && 
                           (
                               t.name.toLowerCase().includes('launch') || 
                               t.name.toLowerCase().includes('completed') ||
                               t.name.toLowerCase().includes('go live')
                           );
                });
                
                // Only include projects that have a completed launch task
                if (launchTask) {
                    try {
                        // Get the earliest creation date of any task in the project
                        const creationDates = tasks
                            .filter((t: Task) => t.created_at && !isNaN(new Date(t.created_at).getTime()))
                            .map((t: Task) => new Date(t.created_at));
                        
                        if (creationDates.length > 0) {
                            const startDate = new Date(Math.min(...creationDates.map(d => d.getTime())));
                            const endDate = new Date(launchTask.completed_at || '');
                            
                            // Ensure dates are valid and duration is positive
                            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                                const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                
                                if (duration > 0) { // Exclude projects completed in 0 days
                                    // Extract type, sale price, and ecommerce from project custom fields
                                    const type = getWebsiteType(project);
                                    const salePrice = getSalePrice(project);
                                    const ecommerce = getEcommerce(project);
                                    
                                    // Calculate weekly revenue if salePrice is a valid number
                                    let weeklyRevenue: number | undefined;
                                    if (typeof salePrice === 'number' && salePrice > 0 && duration > 0) {
                                        const durationInWeeks = duration / 7;
                                        weeklyRevenue = salePrice / durationInWeeks;
                                    }
                                    
                                    durations.push({
                                        name: project.name,
                                        duration,
                                        created: startDate.toISOString(),
                                        completed: endDate.toISOString(),
                                        type,
                                        salePrice,
                                        ecommerce,
                                        weeklyRevenue
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error calculating duration for project ${project.name}:`, error);
                    }
                }
            });
            
            // Step 6: Apply sorting logic
            const sorted = [...durations];
            sortProjectDurations(sorted, projectSort);
            
            // Cache the analyzed data
            await cacheAnalyzedData(durations);
            
            setProjectDurations(sorted);
        } catch (e) {
            setAnalysisError((e instanceof Error && e.message) ? e.message : 'Analysis failed.');
            console.error('Analysis error:', e);
        }
        setAnalyzing(false);
    }, [token, projectSort, ASANA_API_BASE]);
    
    // Helper function to sort project durations
    const sortProjectDurations = (durations: ProjectDuration[], sortMethod: string) => {
        switch (sortMethod) {
            case 'created-asc':
                durations.sort((a, b) => {
                    if (!a.created || !b.created) return 0;
                    return new Date(a.created).getTime() - new Date(b.created).getTime();
                });
                break;
            case 'created-desc':
                durations.sort((a, b) => {
                    if (!a.created || !b.created) return 0;
                    return new Date(b.created).getTime() - new Date(a.created).getTime();
                });
                break;
            case 'completed-asc':
                durations.sort((a, b) => {
                    if (!a.completed || !b.completed) return 0;
                    return new Date(a.completed).getTime() - new Date(b.completed).getTime();
                });
                break;
            case 'completed-desc':
                durations.sort((a, b) => {
                    if (!a.completed || !b.completed) return 0;
                    return new Date(b.completed).getTime() - new Date(a.completed).getTime();
                });
                break;
            case 'alpha-asc':
                durations.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'alpha-desc':
                durations.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'type-asc':
                durations.sort((a, b) => {
                    const typeA = String(a.type || 'N/A');
                    const typeB = String(b.type || 'N/A');
                    return typeA.localeCompare(typeB);
                });
                break;
            case 'type-desc':
                durations.sort((a, b) => {
                    const typeA = String(a.type || 'N/A');
                    const typeB = String(b.type || 'N/A');
                    return typeB.localeCompare(typeA);
                });
                break;
            case 'price-asc':
                durations.sort((a, b) => {
                    const priceA = typeof a.salePrice === 'number' ? a.salePrice : -1;
                    const priceB = typeof b.salePrice === 'number' ? b.salePrice : -1;
                    return priceA - priceB;
                });
                break;
            case 'price-desc':
                durations.sort((a, b) => {
                    const priceA = typeof a.salePrice === 'number' ? a.salePrice : -1;
                    const priceB = typeof b.salePrice === 'number' ? b.salePrice : -1;
                    return priceB - priceA;
                });
                break;
            case 'ecommerce-asc':
                durations.sort((a, b) => {
                    const ecomA = String(a.ecommerce || 'No');
                    const ecomB = String(b.ecommerce || 'No');
                    return ecomA.localeCompare(ecomB);
                });
                break;
            case 'ecommerce-desc':
                durations.sort((a, b) => {
                    const ecomA = String(a.ecommerce || 'No');
                    const ecomB = String(b.ecommerce || 'No');
                    return ecomB.localeCompare(ecomA);
                });
                break;
            case 'duration-desc':
                durations.sort((a, b) => b.duration - a.duration);
                break;
            case 'duration-asc':
            default:
                durations.sort((a, b) => a.duration - b.duration);
                break;
        }
    };

    // ASANA_API_BASE is already defined above

    const handleFetchProjects = async (forceRefresh = false) => {
        if (!token) {
            setError('Please enter your Asana Personal Access Token.');
            return;
        }
        setLoading(true);
        setError('');
        setProjects([]);
        setProjectData(null);
        try {
            // Import the project filter utility and server cache utilities
            const { filterSkippedProjects } = await import('./utils/projectFilter');
            const { 
                isCacheValid, 
                getCachedProjects, 
                cacheProjects,
                clearCache,
                clearExpiredCache
            } = await import('./utils/serverCache');
            
            // Clear expired cache first
            await clearExpiredCache();
            
            // Check cache first if not forcing refresh
            if (!forceRefresh && await isCacheValid() && (await getCachedProjects()).length > 0) {
                console.log('Using cached projects');
                const cachedProjects = await getCachedProjects();
                const filteredProjects = filterSkippedProjects(cachedProjects);
                
                // Sort projects alphabetically by name
                const sortedProjects = [...filteredProjects].sort((a, b) => 
                    a.name.localeCompare(b.name)
                );
                
                setProjects(sortedProjects);
                if (sortedProjects.length > 0) {
                    setSelectedProjectGid(sortedProjects[0]?.gid || '');
                } else {
                    setError("No projects found in the cache.");
                }
                setLoading(false);
                return;
            }
            
            // Force refresh requested or cache invalid, clear the cache
            if (forceRefresh) {
                await clearCache();
            }
            
            // Fetch all workspaces first
            const workspacesResponse = await fetch(`${ASANA_API_BASE}/workspaces?opt_fields=name,gid`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!workspacesResponse.ok) throw new Error(`API Error: ${workspacesResponse.statusText}`);
            const workspacesResult = await workspacesResponse.json();
            
            // Fetch projects from each workspace
            const allProjects = [];
            for (const workspace of workspacesResult.data) {
                const projectsResponse = await fetch(`${ASANA_API_BASE}/projects?workspace=${workspace.gid}&opt_fields=name,gid,archived,custom_fields.name,custom_fields.display_value,custom_fields.text_value,custom_fields.number_value`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (projectsResponse.ok) {
                    const projectsResult = await projectsResponse.json();
                    // Only include non-archived projects
                    const activeProjects = projectsResult.data.filter((p: Task & { archived?: boolean }) => !p.archived);
                    allProjects.push(...activeProjects);
                } else {
                    console.warn(`Could not fetch projects for workspace ${workspace.name}: ${projectsResponse.statusText}`);
                }
            }
            
            // Cache the fetched projects
            await cacheProjects(allProjects);
            
            // Filter out projects in the skip list
            const filteredProjects = filterSkippedProjects(allProjects);
            console.log(`Found ${allProjects.length} total projects, showing ${filteredProjects.length} after filtering`);
            
            // Sort projects alphabetically by name
            const sortedProjects = [...filteredProjects].sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            
            setProjects(sortedProjects);
            if (sortedProjects.length > 0) {
                setSelectedProjectGid(sortedProjects[0].gid);
            } else {
                setError("No projects found in your Asana workspace.");
            }
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unknown error occurred');
            }
        }
        setLoading(false);
    };
    
    useEffect(() => {
        const fetchProjectTasks = async () => {
            if (!selectedProjectGid || !token) return;
            setLoading(true);
            setError('');
            setProjectData(null);
            try {
                // Import cache utilities
                const { 
                    getCachedProjectTasks,
                    cacheProjectTasks
                } = await import('./utils/asanaCache');
                
                // Check if we have cached tasks for this project
                const cachedTasks = getCachedProjectTasks(selectedProjectGid);
                
                if (cachedTasks && cachedTasks.length > 0) {
                    console.log(`Using cached tasks for project ${selectedProjectGid}`);
                    
                    // Fetch assignment dates from stories for cached tasks
                    const tasksWithAssignments = await Promise.all(
                        cachedTasks.map(async (task) => {
                            try {
                                const storiesResponse = await fetch(`${ASANA_API_BASE}/tasks/${task.gid}/stories?opt_fields=created_at,resource_type,resource_subtype,text`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (storiesResponse.ok) {
                                    const storiesData = await storiesResponse.json();
                                    console.log(`Stories for task ${task.name}:`, storiesData.data.slice(0, 5));
                                    
                                    // Find the first assignment story
                                    const assignmentStory = storiesData.data.find((story: any) => {
                                        if (!story.text) return false;
                                        const text = story.text.toLowerCase();
                                        return (
                                            text.includes('assigned to') ||
                                            text.includes('assigned this task') ||
                                            (story.resource_subtype === 'assigned')
                                        );
                                    });
                                    
                                    if (assignmentStory) {
                                        console.log(`Found assignment date for ${task.name}: ${assignmentStory.created_at}`);
                                        return { ...task, assigned_at: assignmentStory.created_at };
                                    } else {
                                        console.log(`No assignment story found for ${task.name}`);
                                    }
                                }
                            } catch (err) {
                                console.warn(`Could not fetch stories for task ${task.gid}:`, err);
                            }
                            return task;
                        })
                    );
                    
                    processDataForDashboard(tasksWithAssignments);
                    setLoading(false);
                    return;
                }
                
                // No cached data, fetch from API
                // 1. Fetch all task GIDs for the project
                const taskListResponse = await fetch(`${ASANA_API_BASE}/projects/${selectedProjectGid}/tasks?opt_fields=gid`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!taskListResponse.ok) throw new Error(`Failed to fetch tasks: ${taskListResponse.statusText}`);
                const taskListResult = await taskListResponse.json();
                
                // 2. Fetch full details for each task concurrently
                const taskDetailPromises = taskListResult.data.map(async (task: Task) => {
                    const taskResponse = await fetch(`${ASANA_API_BASE}/tasks/${task.gid}?opt_fields=name,created_at,due_on,completed,completed_at,start_at,start_on`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const taskData = await taskResponse.json();
                    
                    // Fetch task stories to find first assignment date
                    try {
                        const storiesResponse = await fetch(`${ASANA_API_BASE}/tasks/${task.gid}/stories?opt_fields=created_at,resource_type,resource_subtype,text`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (storiesResponse.ok) {
                            const storiesData = await storiesResponse.json();
                            console.log(`Stories for task ${taskData.data.name}:`, storiesData.data.slice(0, 5));
                            
                            // Find the first assignment story - look for various patterns
                            const assignmentStory = storiesData.data.find((story: any) => {
                                if (!story.text) return false;
                                const text = story.text.toLowerCase();
                                return (
                                    text.includes('assigned to') ||
                                    text.includes('assigned this task') ||
                                    (story.resource_subtype === 'assigned')
                                );
                            });
                            
                            if (assignmentStory) {
                                taskData.data.assigned_at = assignmentStory.created_at;
                                console.log(`Found assignment date for ${taskData.data.name}: ${assignmentStory.created_at}`);
                            } else {
                                console.log(`No assignment story found for ${taskData.data.name}`);
                            }
                        }
                    } catch (err) {
                        console.warn(`Could not fetch stories for task ${task.gid}:`, err);
                    }
                    
                    return taskData;
                });
                const taskDetailResults = await Promise.all(taskDetailPromises);
                const tasks = taskDetailResults.map((res: { data: Task }) => res.data);
                
                // 3. Cache the tasks
                cacheProjectTasks(selectedProjectGid, tasks);
                
                // 4. Process data for charts and tables
                processDataForDashboard(tasks);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Unknown error occurred');
                }
            }
            setLoading(false);
        };
        fetchProjectTasks();
    }, [selectedProjectGid, token, processDataForDashboard, ASANA_API_BASE]);

    // Handler for clicking a project in the chart - scrolls to project selector and selects it
    const handleProjectClick = useCallback((projectName: string) => {
        // Find the project by name
        const project = projects.find(p => p.name === projectName);
        if (project) {
            // Set the selected project
            setSelectedProjectGid(project.gid);
            
            // Scroll to the project select section at the top of the viewport
            if (projectSelectRef.current) {
                projectSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Add a brief highlight effect
                projectSelectRef.current.style.transition = 'box-shadow 0.3s';
                projectSelectRef.current.style.boxShadow = '0 0 20px 4px rgba(129, 140, 248, 0.6)';
                setTimeout(() => {
                    if (projectSelectRef.current) {
                        projectSelectRef.current.style.boxShadow = '';
                    }
                }, 1500);
            }
        }
    }, [projects]);




    interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
}

const handleLoginSuccess = (credentialResponse: GoogleCredentialResponse) => {
        console.log('Login Success:', credentialResponse);
        // Here you can decode the JWT token to get user info if needed
        const token = credentialResponse.credential;
        if (token) {
            setIsAuthenticated(true);
            // You can store the token in localStorage if you want to persist the session
            localStorage.setItem('googleToken', token);
        }
    };

    const handleLoginError = () => {
        console.error('Login Failed');
        setIsAuthenticated(false);
        localStorage.removeItem('googleToken');
    };

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('googleToken');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                <AnimatedSection delay={0}>
                    <header className="text-center relative">
                        <div className="flex flex-col items-center justify-center mb-2">
                            <img 
                                src={import.meta.env.BASE_URL + '7mC.png'} 
                                alt="7 Mountains Creative Logo" 
                                className="h-12 w-12 sm:h-16 sm:w-16 object-contain mb-2" 
                            />
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">
                                7 Mountains Creative Analytics
                            </h1>
                        </div>
                        <p className="text-gray-400 text-base sm:text-lg">Visualize your project data and timelines.</p>
                        {isAuthenticated && (
                            <button 
                                onClick={() => {
                                    setIsAuthenticated(false);
                                    localStorage.removeItem('googleToken');
                                }}
                                className="absolute top-0 right-0 px-3 py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                            >
                                Sign Out
                            </button>
                        )}
                    </header>
                </AnimatedSection>

                {!isAuthenticated ? (
                    <AnimatedSection delay={200}>
                        <div className="flex flex-col items-center justify-center mt-6 sm:mt-8">
                            <div className="card p-6 sm:p-8 w-full max-w-md">
                                <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Sign in to continue</h2>
                                <div className="flex justify-center">
                                    <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError} />
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                ) : (
                    <div className="space-y-6 md:space-y-8">

                {/* Removed Asana token section. Only show fetch button and errors. */}
                <AnimatedSection delay={100}>
                    <div className="card">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <button
                                onClick={() => handleFetchProjects(projects.length > 0)}
                                disabled={loading}
                                className="btn-primary w-full sm:w-auto flex-grow flex items-center justify-center"
                            >
                                {loading && !projects.length ? 'Fetching...' : projects.length ? 'Refresh Projects' : 'Fetch Projects'}
                            </button>
                            <CacheStatusIndicator />
                        </div>
                        {error && <ErrorDisplay message={error} />}
                        {loading && !analyzing && <div className="text-center mt-3 text-indigo-300 animate-pulse">Loading projects...</div>}
                        {!loading && analyzing && projects.length > 0 && !projectDurations.length && <div className="text-center mt-3 text-indigo-300 animate-pulse">Auto-analyzing projects...</div>}
                    </div>
                </AnimatedSection>

                {/* Cross-Project Duration Comparison Section */}
                <AnimatedSection delay={200}>
                    <div className="card mt-6 sm:mt-8">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-0">Project & Section Comparisons</h2>
                                <button
                                    onClick={analyzeAllProjects}
                                    disabled={analyzing}
                                    className="btn-primary w-full sm:w-auto flex items-center justify-center"
                                >
                                    {analyzing ? 'Analyzing...' : projectDurations.length > 0 ? 'Re-Analyze Projects' : 'Analyze All Projects'}
                                </button>
                            </div>

                        <div className="grid grid-cols-1 gap-y-6">
                            {/* Search and Filter Controls */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-6">
                                {/* Search Projects */}
                                <div className="w-full">
                                    <label htmlFor="project-search" className="block text-sm font-medium text-gray-300 mb-2">Search Projects</label>
                                    <input
                                        id="project-search"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by project name..."
                                        className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                    />
                                </div>

                                {/* Date Range */}
                                <div className="w-full">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                                    <div className="grid grid-cols-2 gap-x-2">
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        />
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                {/* Sort */}
                                <div className="w-full">
                                    <label htmlFor="project-sort" className="block text-sm font-medium text-gray-300 mb-2">Sort Projects By</label>
                                    <select
                                        id="project-sort"
                                        value={projectSort}
                                        onChange={e => setProjectSort(e.target.value)}
                                        className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                    >
                                        <option value="duration-asc">Shortest Duration</option>
                                        <option value="duration-desc">Longest Duration</option>
                                        <option value="created-asc">Oldest Creation Date</option>
                                        <option value="created-desc">Newest Creation Date</option>
                                        <option value="completed-asc">Oldest Completion Date</option>
                                        <option value="completed-desc">Newest Completion Date</option>
                                        <option value="type-asc">Type (A-Z)</option>
                                        <option value="type-desc">Type (Z-A)</option>
                                        <option value="price-asc">Price (Low to High)</option>
                                        <option value="price-desc">Price (High to Low)</option>
                                        <option value="ecommerce-asc">E-commerce (A-Z)</option>
                                        <option value="ecommerce-desc">E-commerce (Z-A)</option>
                                        <option value="alpha-asc">A-Z</option>
                                        <option value="alpha-desc">Z-A</option>
                                    </select>
                                </div>

                                {/* Type Filter */}
                                <div className="w-full">
                                    <label htmlFor="type-filter" className="block text-sm font-medium text-gray-300 mb-2">Filter by Type</label>
                                    <select
                                        id="type-filter"
                                        value={typeFilter}
                                        onChange={e => setTypeFilter(e.target.value)}
                                        className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="Landing Page">Landing Page</option>
                                        <option value="Small Website">Small Website</option>
                                        <option value="Large Website">Large Website</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>

                                {/* E-commerce Filter */}
                                <div className="w-full">
                                    <label htmlFor="ecommerce-filter" className="block text-sm font-medium text-gray-300 mb-2">Filter by E-commerce</label>
                                    <select
                                        id="ecommerce-filter"
                                        value={ecommerceFilter}
                                        onChange={e => setEcommerceFilter(e.target.value)}
                                        className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                    >
                                        <option value="all">All Projects</option>
                                        <option value="Yes">E-commerce</option>
                                        <option value="No">No E-commerce</option>
                                    </select>
                                </div>
                            </div>

                            {/* Highlight Projects */}
                            <div className="w-full">
                                <label htmlFor="highlight-search" className="block text-sm font-medium text-gray-300 mb-2">
                                    Highlight Projects
                                    <span className="text-gray-400 text-xs ml-2">(comma-separated)</span>
                                </label>
                                <input
                                    id="highlight-search"
                                    type="text"
                                    value={highlightQuery}
                                    onChange={(e) => setHighlightQuery(e.target.value)}
                                    placeholder="Project1, Project2, Project3..."
                                    className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                />
                            </div>
                        </div>

                        {analysisError && <p className="text-red-400 mt-4 text-center">{analysisError}</p>}
                        {filteredDurations.length > 0 ? (
                            <div className="mt-8">
                                <ComparisonTabs
                                  projectDurations={filteredDurations}
                                  highlightedProjects={highlightedProjects}
                                  sortMethod={projectSort}
                                  onProjectClick={handleProjectClick}
                                />
                                
                                {/* Overall Project Statistics - Integrated in same section */}
                                <div className="mt-8 pt-6 border-t border-gray-700">
                                    <h3 className="text-xl font-bold mb-6 text-center">Overall Project Statistics</h3>
                                    
                                    {(() => {
                                        // Calculate comprehensive statistics for all projects
                                        const allDurations = filteredDurations.map(p => p.duration);
                                        const stats = calculateStatistics(allDurations);
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Mean Duration</p>
                                                    <p className="text-2xl font-bold text-indigo-400">
                                                        {formatNumber(statsInWeeks.mean)} weeks
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        ({formatNumber(stats.mean)} days)
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Median Duration</p>
                                                    <p className="text-2xl font-bold text-green-400">
                                                        {formatNumber(statsInWeeks.median)} weeks
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        ({formatNumber(stats.median)} days)
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Range Duration</p>
                                                    <p className="text-2xl font-bold text-purple-400">
                                                        {formatNumber(statsInWeeks.range)} weeks
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        ({formatNumber(stats.range)} days)
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Skewness</p>
                                                    <p className="text-2xl font-bold text-amber-400">
                                                        {formatNumber(statsInWeeks.skewness, 2)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {stats.skewness > 0 ? 'Right-skewed' : stats.skewness < 0 ? 'Left-skewed' : 'Symmetric'}
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Standard Deviation</p>
                                                    <p className="text-2xl font-bold text-orange-400">
                                                        {formatNumber(statsInWeeks.standardDeviation)} weeks
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        ({formatNumber(stats.standardDeviation)} days)
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Shortest Project</p>
                                                    <p className="text-2xl font-bold text-cyan-400">
                                                        {statsInWeeks.count > 0 ? `${statsInWeeks.min} weeks` : 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {stats.count > 0 ? `(${formatNumber(stats.min || 0)} days)` : ''}
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Longest Project</p>
                                                    <p className="text-2xl font-bold text-rose-400">
                                                        {statsInWeeks.count > 0 ? `${statsInWeeks.max} weeks` : 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {stats.count > 0 ? `(${formatNumber(stats.max || 0)} days)` : ''}
                                                    </p>
                                                </div>
                                                
                                                <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700 text-center">
                                                    <p className="text-sm font-medium text-gray-400 mb-2">Sample Size</p>
                                                    <p className="text-2xl font-bold text-gray-200">
                                                        {statsInWeeks.count} projects
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        analyzed in this dataset
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 mt-8">No projects found matching your criteria.</p>
                        )}
                    </div>
                    {/* Project dropdown in its own card section below */}
                </div>
                </AnimatedSection>
                {projects.length > 0 && (
                    <AnimatedSection delay={300}>
                        <div ref={projectSelectRef} className="card mt-6 sm:mt-8">
                            <label htmlFor="project-select" className="block text-sm font-medium text-gray-300 mb-2">Select a Project</label>
                            <div className="relative">
                                <select
                                    id="project-select"
                                    value={selectedProjectGid}
                                    onChange={(e) => setSelectedProjectGid(e.target.value)}
                                    className="select-field bg-gray-800 text-white text-base sm:text-lg border border-indigo-500 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                                    style={{ minWidth: '220px', fontWeight: 600, letterSpacing: '0.02em' }}
                                >
                                    {projects.map((p: Task) => <option key={p.gid} value={p.gid} className="bg-gray-900 text-white">{p.name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>

                )}

                

                {/* Section stats are now integrated into the comparison tabs */}
                {(loading || analyzing) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.18)' }}>
                        <div className="flex flex-col items-center">
                            <LoadingSpinner />
                            <span className="mt-4 text-lg text-gray-200 font-semibold animate-pulse">
                                {analyzing ? 'Analyzing data...' : 'Loading...'}
                            </span>
                        </div>
                    </div>
                )}
                {!loading && !analyzing && projectData && (
                    <AnimatedSection delay={400}>
                        <DashboardView projectData={projectData} />
                    </AnimatedSection>
                )}
                    </div>
                )}
            </div>
        </div>
    );
}

