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

// First-activity-detection used to live here and run from the browser.
// It now lives on the server (see app.js: findFirstMeaningfulActivity) so
// the token never reaches the client. Cached task data already includes
// `first_activity_at` and `assigned_at` populated by the server's cron job.

// --- Main App Component ---
export default function App() {
    // State for authentication and project selection.
    // All Asana fetching now happens server-side; the frontend reads from
    // /api/cache/* and never holds an Asana token.
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [refreshMessage, setRefreshMessage] = useState<string>('');
    const [projects, setProjects] = useState<Task[]>([]);
    const [selectedProjectGid, setSelectedProjectGid] = useState<string>('');
    const [projectData, setProjectData] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    
    // State for cross-project analysis
    const [projectDurations, setProjectDurations] = useState<ProjectDuration[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    
    // Store all fetched project tasks for ComparisonTabs to use (avoids re-fetching)
    const [allProjectTasks, setAllProjectTasks] = useState<Record<string, Task[]>>({});
    
    // Section analytics are now handled in ComparisonTabs component

    // Sorting and filtering state for project comparison
    const [projectSort, setProjectSort] = useState<string>('duration-asc');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [highlightQuery, setHighlightQuery] = useState<string>('');
    const [highlightedProjects, setHighlightedProjects] = useState<string[]>([]);
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [ecommerceFilter, setEcommerceFilter] = useState<string>('all');
    const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(true);

    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: '', // Will be set to a default in useEffect
        end: ''    // Will be set to a default in useEffect
    });
    const [dateFilterMode, setDateFilterMode] = useState<'started' | 'completed' | 'either'>('either');
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

        // Load whatever is in the server cache on mount. Refresh from
        // Asana is the server's job (cron + manual trigger via "Refresh
        // from Asana" button).
        handleFetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clear all filters
    const handleClearFilters = () => {
        setSearchQuery('');
        setHighlightQuery('');
        setTypeFilter('all');
        setEcommerceFilter('all');
        setDateFilterMode('either');
        setShowCompletedOnly(true);
        
        // Reset to default date range (5 years ago to 1 year future)
        const defaultStart = new Date();
        defaultStart.setFullYear(defaultStart.getFullYear() - 5);
        const defaultEnd = new Date();
        defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
        
        setDateRange({
            start: defaultStart.toISOString().split('T')[0] ?? '',
            end: defaultEnd.toISOString().split('T')[0] ?? ''
        });
    };

    // Handle date range changes with validation
    const handleDateChange = (field: 'start' | 'end', value: string) => {
        const newDateRange = { ...dateRange, [field]: value };
        
        // Validate: start date should not be after end date
        if (newDateRange.start && newDateRange.end) {
            const startDate = new Date(newDateRange.start);
            const endDate = new Date(newDateRange.end);
            
            if (startDate > endDate) {
                // If start is after end, adjust the other date
                if (field === 'start') {
                    newDateRange.end = value; // Set end to match start
                } else {
                    newDateRange.start = value; // Set start to match end
                }
            }
        }
        
        setDateRange(newDateRange);
    };

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
                filtered = filtered.filter(project => {
                    const projectEcommerce = String(project.ecommerce || 'No');
                    return projectEcommerce === ecommerceFilter;
                });
            }
            
            // Apply date range filter
            if (dateRange.start || dateRange.end) {
                filtered = filtered.filter(project => {
                    const createdDate = project.created ? new Date(project.created) : null;
                    const completedDate = project.completed ? new Date(project.completed) : null;
                    
                    const checkDateInRange = (date: Date | null) => {
                        if (!date) return false;
                        const isAfterStart = !dateRange.start || date >= new Date(dateRange.start);
                        const isBeforeEnd = !dateRange.end || date <= new Date(dateRange.end);
                        return isAfterStart && isBeforeEnd;
                    };
                    
                    switch (dateFilterMode) {
                        case 'started':
                            return checkDateInRange(createdDate);
                        case 'completed':
                            return checkDateInRange(completedDate);
                        case 'either':
                            return checkDateInRange(createdDate) || checkDateInRange(completedDate);
                        default:
                            return true;
                    }
                });
            }
            
            // Apply completed filter
            if (showCompletedOnly) {
                filtered = filtered.filter(project => project.completed && project.completed.trim() !== '');
            }
            
            setFilteredDurations(filtered);
        }
    }, [projectDurations, searchQuery, dateRange, projectSort, typeFilter, ecommerceFilter, dateFilterMode, showCompletedOnly]);

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





    // Section duration / span calculations live in ComparisonTabs now;
    // the helpers that used to live here (getSectionFromTask,
    // calculateSectionDurations, calculateSectionCompletionSpans) were dead.

    // Helper: Extract website type from custom fields
    const getWebsiteType = useCallback((project: any): string => {
        // Debug: log the project custom fields
        
        // Check project-level custom fields first
        if (project.custom_fields && project.custom_fields.length > 0) {
            const typeField = project.custom_fields.find((cf: CustomFieldValue) => 
                cf.name?.toLowerCase() === 'type'
            );
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
                // Return the value or default to 'No' if field exists but has no value
                return value || 'No';
            }
        }
        return 'No';
    }, []);

    // Helper: Process dashboard data
    const processDataForDashboard = useCallback((tasks: Task[]) => {
        let completedCount = 0;
        const completionTimes: number[] = [];
        const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const tasksCompletedByDay = dayOfWeek.map(day => ({ name: day, completed: 0 }));
        const tasksCreatedByDay = dayOfWeek.map(day => ({ name: day, created: 0 }));

        let earliestCreatedDate: Date | null = null;
        let latestCompletedDate: Date | null = null;

        tasks.forEach((task: Task) => {
            const createdAt = new Date(task.created_at);
            if (isNaN(createdAt.getTime())) return;

            if (!earliestCreatedDate || createdAt < earliestCreatedDate) {
                earliestCreatedDate = createdAt;
            }

            // Day-of-week histogram across the project's entire lifetime
            // (the previous "last 7 days" window was effectively meaningless
            // for older/completed projects - one task per day-of-week at most).
            const createdDay = createdAt.getDay();
            if (createdDay >= 0 && createdDay < tasksCreatedByDay.length) {
                if (tasksCreatedByDay[createdDay]) tasksCreatedByDay[createdDay].created++;
            }
            if (task.completed && task.completed_at) {
                completedCount++;
                const completedAt = new Date(task.completed_at);
                if (isNaN(completedAt.getTime())) return;

                if (!latestCompletedDate || completedAt > latestCompletedDate) {
                    latestCompletedDate = completedAt;
                }

                const completedDay = completedAt.getDay();
                if (completedDay >= 0 && completedDay < tasksCompletedByDay.length) {
                    if (tasksCompletedByDay[completedDay]) tasksCompletedByDay[completedDay].completed++;
                }
                const timeDiff = completedAt.getTime() - createdAt.getTime();
                completionTimes.push(timeDiff / (1000 * 3600 * 24)); // in days
            }
        });

        let projectDurationDays = 0;
        if (earliestCreatedDate && latestCompletedDate) {
            const durationMs = (latestCompletedDate as Date).getTime() - (earliestCreatedDate as Date).getTime();
            projectDurationDays = Math.round(durationMs / (1000 * 3600 * 24));
        }

        const totalCompletionTime = completionTimes.reduce((acc, time) => acc + time, 0);
        const avgCompletionTimeDays = completionTimes.length > 0
            ? Math.round(totalCompletionTime / completionTimes.length)
            : 0;
        const stats: Stats = {
            totalTasks: tasks.length,
            completedTasks: completedCount,
            pendingTasks: tasks.length - completedCount,
            avgCompletionTimeDays,
            totalCompletionTimeDays: projectDurationDays
        };
        // Sort by the original ISO created_at (parseable across all locales),
        // THEN format for display. The previous version parsed
        // toLocaleDateString() output back through new Date(), which is
        // locale-dependent and silently produces wrong/Invalid dates on
        // non-US locales.
        const taskTableData = [...tasks]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((task: Task) => ({
                ...task,
                created_at: new Date(task.created_at).toLocaleDateString(),
                completed_at: task.completed_at ? new Date(task.completed_at).toLocaleDateString() : null,
            }));
        setProjectData({
            stats,
            taskTableData,
            tasksCompletedByDay,
            tasksCreatedByDay
        });
    }, []);

    // Build project duration analytics from server-cached data only.
    // The server fetches Asana on a cron schedule and on-demand via
    // POST /api/cache/refresh; the client never holds a token.
    const analyzeAllProjects = useCallback(async () => {
        setAnalyzing(true);
        setAnalysisError('');
        try {
            const { filterSkippedProjects } = await import('./utils/projectFilter');
            const {
                isCacheValid,
                getCachedProjects,
                getCachedProjectTasks,
                getCachedAnalyzedData,
            } = await import('./utils/serverCache');

            if (!(await isCacheValid())) {
                setAnalysisError('Server cache is empty or expired. Click "Refresh from Asana" to populate it.');
                setAnalyzing(false);
                return;
            }

            // Fast path: if the server already computed the duration
            // analysis during its last refresh, use it directly instead of
            // re-iterating every project + its cached tasks (~10s for 300
            // projects). Per-project tasks are still lazily loaded by
            // ComparisonTabs when the user opens a comparison view.
            const cachedAnalyzed = await getCachedAnalyzedData();
            if (cachedAnalyzed && Array.isArray(cachedAnalyzed) && cachedAnalyzed.length > 0) {
                const sorted = [...cachedAnalyzed] as ProjectDuration[];
                sortProjectDurations(sorted, projectSort);
                setProjectDurations(sorted);
                setAnalyzing(false);
                return;
            }

            const cachedProjects = await getCachedProjects();
            if (cachedProjects.length === 0) {
                setAnalysisError('No projects found in the server cache. Click "Refresh from Asana" to populate it.');
                setAnalyzing(false);
                return;
            }
            const projectsList = filterSkippedProjects(cachedProjects);

            // Pull tasks per project from the cache. Tasks are pre-enriched
            // server-side with first_activity_at and assigned_at.
            const allTasksResults: { project: Task; tasks: Task[] }[] = [];
            for (const project of projectsList) {
                try {
                    const tasks = await getCachedProjectTasks(project.gid);
                    allTasksResults.push({ project, tasks: tasks || [] });
                } catch (err) {
                    console.warn(`Failed to load cached tasks for project ${project.name}:`, err);
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
                
                // Find the launch task: a completed task whose name clearly marks
                // it as a project endpoint. "completed" alone is too broad (matches
                // "Completed Onboarding Form" etc.), so we only accept it as a
                // standalone word or as part of "project/site completed". Among
                // multiple matches we pick the LATEST completed_at, not the first
                // by array order.
                const isLaunchName = (name: string) => {
                    const n = name.toLowerCase();
                    if (n.includes('launch')) return true;
                    if (n.includes('go live') || n.includes('go-live') || n.includes('golive')) return true;
                    if (n.includes('project completed') || n.includes('site completed')) return true;
                    // "completed" as a whole word, but not preceded by "form/qa/onboarding/etc."
                    return /(^|\s)completed(\s|$)/.test(n) && !/\b(form|qa|onboarding|checklist|review)\s+completed\b/.test(n);
                };
                const launchTask = tasks
                    .filter((t: Task) => t.completed && t.completed_at && t.name && isLaunchName(t.name))
                    .reduce<Task | null>((best, t) => {
                        if (!best) return t;
                        const tTime = new Date(t.completed_at || '').getTime();
                        const bestTime = new Date(best.completed_at || '').getTime();
                        return tTime > bestTime ? t : best;
                    }, null);

                const creationDates = tasks
                    .filter((t: Task) => t.created_at && !isNaN(new Date(t.created_at).getTime()))
                    .map((t: Task) => new Date(t.created_at));

                if (creationDates.length === 0) return;
                try {
                    const startDate = new Date(Math.min(...creationDates.map(d => d.getTime())));
                    if (isNaN(startDate.getTime())) return;

                    const type = getWebsiteType(project);
                    const salePrice = getSalePrice(project);
                    const ecommerce = getEcommerce(project);

                    // weeklyRevenue is misleading for very short engagements
                    // (dividing by a fraction of a week explodes the figure), so
                    // only compute it once the project has run at least 14 days.
                    const WEEKLY_REVENUE_MIN_DAYS = 14;
                    const weeklyRevenueFor = (duration: number): number | undefined => {
                        if (typeof salePrice !== 'number' || salePrice <= 0) return undefined;
                        if (duration < WEEKLY_REVENUE_MIN_DAYS) return undefined;
                        return salePrice / (duration / 7);
                    };

                    if (launchTask) {
                        const endDate = new Date(launchTask.completed_at || '');
                        if (isNaN(endDate.getTime())) return;
                        const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (duration <= 0) return;
                        durations.push({
                            name: project.name,
                            gid: project.gid,
                            duration,
                            created: startDate.toISOString(),
                            completed: endDate.toISOString(),
                            type,
                            salePrice,
                            ecommerce,
                            weeklyRevenue: weeklyRevenueFor(duration),
                        });
                    } else {
                        const today = new Date();
                        const duration = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
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
                } catch (error) {
                    console.error(`Error calculating duration for project ${project.name}:`, error);
                }
            });
            
            const sorted = [...durations];
            sortProjectDurations(sorted, projectSort);

            // Hand tasks to ComparisonTabs so it doesn't have to re-load them.
            const tasksMap: Record<string, Task[]> = {};
            allTasksResults.forEach(result => {
                if (result.project.gid && result.tasks && result.tasks.length > 0) {
                    tasksMap[result.project.gid] = result.tasks as Task[];
                }
            });
            setAllProjectTasks(tasksMap);

            setProjectDurations(sorted);
        } catch (e) {
            setAnalysisError((e instanceof Error && e.message) ? e.message : 'Analysis failed.');
            console.error('Analysis error:', e);
        }
        setAnalyzing(false);
    }, [projectSort, getWebsiteType, getSalePrice, getEcommerce]);
    
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
                    const aHas = typeof a.salePrice === 'number';
                    const bHas = typeof b.salePrice === 'number';
                    // Unpriced (N/A) always sorts last in both directions.
                    if (!aHas && !bHas) return 0;
                    if (!aHas) return 1;
                    if (!bHas) return -1;
                    return (a.salePrice as number) - (b.salePrice as number);
                });
                break;
            case 'price-desc':
                durations.sort((a, b) => {
                    const aHas = typeof a.salePrice === 'number';
                    const bHas = typeof b.salePrice === 'number';
                    if (!aHas && !bHas) return 0;
                    if (!aHas) return 1;
                    if (!bHas) return -1;
                    return (b.salePrice as number) - (a.salePrice as number);
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

    // Load the project list from the server cache. The optional argument is
    // kept for back-compat with the previous Asana-fetching signature; it is
    // ignored. To pull fresh data from Asana, use handleServerRefresh().
    const handleFetchProjects = async (_forceRefresh = false) => {
        void _forceRefresh;
        setLoading(true);
        setError('');
        setProjects([]);
        setProjectData(null);
        try {
            const { filterSkippedProjects } = await import('./utils/projectFilter');
            const { getCachedProjects, isCacheValid } = await import('./utils/serverCache');

            const cachedProjects = await getCachedProjects();
            if (cachedProjects.length === 0) {
                if (await isCacheValid()) {
                    setError('Server cache is empty. Click "Refresh from Asana" to populate it.');
                } else {
                    setError('Server cache is empty or expired. Click "Refresh from Asana" to populate it.');
                }
                setLoading(false);
                return;
            }

            const filteredProjects = filterSkippedProjects(cachedProjects);
            const sortedProjects = [...filteredProjects].sort((a, b) => a.name.localeCompare(b.name));
            setProjects(sortedProjects);
            if (sortedProjects.length > 0) {
                setSelectedProjectGid(sortedProjects[0]?.gid || '');
            } else {
                setError('No projects matched the visible-projects filter.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        setLoading(false);
    };

    // Ask the server to refresh its Asana cache. Fire-and-forget on the
    // server side; we poll cache status to know when it's done, then reload.
    const handleServerRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        setRefreshMessage('Starting server-side refresh...');
        setError('');
        setAnalysisError('');
        try {
            const startResp = await fetch('/api/cache/refresh', { method: 'POST' });
            if (startResp.status === 401) {
                throw new Error('Server requires a refresh secret. Configure REFRESH_SECRET and pass it via header.');
            }
            if (!startResp.ok && startResp.status !== 202 && startResp.status !== 409) {
                const body = await startResp.json().catch(() => ({}));
                throw new Error(body.error || `Refresh request failed (${startResp.status})`);
            }

            const { getCacheStatus } = await import('./utils/serverCache');
            let elapsed = 0;
            const POLL_MS = 5000;
            const MAX_MS = 20 * 60 * 1000;
            while (elapsed < MAX_MS) {
                await new Promise(r => setTimeout(r, POLL_MS));
                elapsed += POLL_MS;
                const status = await getCacheStatus() as { refreshInProgress?: boolean; refreshError?: string | null };
                if (status && status.refreshInProgress === false) {
                    if (status.refreshError) {
                        throw new Error(`Refresh failed: ${status.refreshError}`);
                    }
                    setRefreshMessage(`Refresh complete - ${status.projectCount ?? 0} projects cached.`);
                    await handleFetchProjects();
                    await analyzeAllProjects();
                    setTimeout(() => setRefreshMessage(''), 8000);
                    return;
                }
                setRefreshMessage(`Refreshing from Asana... (${Math.round(elapsed / 1000)}s elapsed)`);
            }
            throw new Error('Server-side refresh timed out after 20 minutes.');
        } catch (err) {
            setRefreshMessage('');
            setError(err instanceof Error ? err.message : 'Refresh failed');
        } finally {
            setRefreshing(false);
        }
    };
    
    useEffect(() => {
        const fetchProjectTasks = async () => {
            if (!selectedProjectGid) return;
            setLoading(true);
            setError('');
            setProjectData(null);
            try {
                const { getCachedProjectTasks } = await import('./utils/serverCache');
                const cachedTasks = await getCachedProjectTasks(selectedProjectGid);
                if (!cachedTasks || cachedTasks.length === 0) {
                    setError('No cached tasks for this project yet. Click "Refresh from Asana" to populate the cache.');
                    setLoading(false);
                    return;
                }
                // Server-side enrichment already populated assigned_at/first_activity_at
                processDataForDashboard(cachedTasks);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error occurred');
            }
            setLoading(false);
        };
        fetchProjectTasks();
    }, [selectedProjectGid, processDataForDashboard]);

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

                <AnimatedSection delay={100}>
                    <div className="card">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex flex-col sm:flex-row gap-2 flex-grow w-full sm:w-auto">
                                <button
                                    onClick={() => handleFetchProjects()}
                                    disabled={loading || refreshing}
                                    className="btn-primary w-full sm:w-auto flex-grow flex items-center justify-center"
                                >
                                    {loading && !projects.length ? 'Loading...' : projects.length ? 'Reload from Cache' : 'Load Projects'}
                                </button>
                                <button
                                    onClick={handleServerRefresh}
                                    disabled={refreshing || loading}
                                    title="Have the server pull fresh data from Asana now"
                                    className="w-full sm:w-auto px-4 py-2 rounded-md font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center"
                                >
                                    {refreshing ? 'Refreshing...' : 'Refresh from Asana'}
                                </button>
                            </div>
                            <CacheStatusIndicator />
                        </div>
                        {refreshMessage && (
                            <div className="text-center mt-3 text-emerald-300 animate-pulse">{refreshMessage}</div>
                        )}
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
                                            onChange={(e) => handleDateChange('start', e.target.value)}
                                            className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        />
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => handleDateChange('end', e.target.value)}
                                            className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        />
                                    </div>
                                    {/* Validation warning */}
                                    {dateRange.start && dateRange.end && new Date(dateRange.start) > new Date(dateRange.end) && (
                                        <p className="text-yellow-500 text-xs mt-1">Date range adjusted: start date cannot be after end date</p>
                                    )}
                                    {/* Radio buttons underneath */}
                                    <div className="mt-2 flex flex-wrap gap-3">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dateFilterMode"
                                                checked={dateFilterMode === 'either'}
                                                onChange={() => setDateFilterMode('either')}
                                                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-2"
                                            />
                                            <span className="ml-2 text-sm text-gray-300">Started OR Completed</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dateFilterMode"
                                                checked={dateFilterMode === 'started'}
                                                onChange={() => setDateFilterMode('started')}
                                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                                            />
                                            <span className="ml-2 text-sm text-gray-300">Started</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dateFilterMode"
                                                checked={dateFilterMode === 'completed'}
                                                onChange={() => setDateFilterMode('completed')}
                                                className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 focus:ring-green-500 focus:ring-2"
                                            />
                                            <span className="ml-2 text-sm text-gray-300">Completed</span>
                                        </label>
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

                                {/* Clear Filters Button */}
                                <div className="w-full flex items-end">
                                    <button
                                        onClick={handleClearFilters}
                                        className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md px-4 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0d1117] flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Clear All Filters
                                    </button>
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

                            {/* Show Completed Only Checkbox */}
                            <div className="w-full flex items-center">
                                <label className="flex items-center cursor-pointer space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={showCompletedOnly}
                                        onChange={(e) => setShowCompletedOnly(e.target.checked)}
                                        className="w-5 h-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-gray-300">Show Completed Projects Only</span>
                                </label>
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
                                  preloadedTasks={allProjectTasks}
                                />
                                
                                {/* Overall Project Statistics - Integrated in same section */}
                                <div className="mt-8 pt-6 border-t border-gray-700">
                                    <h3 className="text-xl font-bold mb-6 text-center">Overall Project Statistics</h3>
                                    
                                    {(() => {
                                        // Stats only consider COMPLETED projects. In-progress
                                        // projects have "days since start" durations that grow
                                        // unbounded and would otherwise inflate mean / range /
                                        // standard deviation in misleading ways.
                                        const allDurations = filteredDurations
                                            .filter(p => !p.inProgress)
                                            .map(p => p.duration);
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

