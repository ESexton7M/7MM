import { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';

// Import components
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import DashboardView from './components/DashboardView';
import ProjectDurationChart from './components/ProjectDurationChart';

// Import required components from recharts
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

// Import types
import type { 
  Task, 
  ProjectData, 
  ProjectDuration,
  Stats,
  SectionDuration,
  SectionCompletionSpan,
  DateRangeFilter,
  DailyTaskData
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
    const [projects, setProjects] = useState<Task[]>([]);
    const [selectedProjectGid, setSelectedProjectGid] = useState<string>('');
    const [projectData, setProjectData] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    
    // State for cross-project analysis
    const [projectDurations, setProjectDurations] = useState<ProjectDuration[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    
    // State for section analytics
    const [sectionDurations, setSectionDurations] = useState<SectionDuration[]>([]);
    const [incrementalDurations, setIncrementalDurations] = useState<SectionDuration[]>([]);
    const [sectionCompletionSpans, setSectionCompletionSpans] = useState<SectionCompletionSpan[]>([]);

    // Sorting and filtering state for project comparison
    const [projectSort, setProjectSort] = useState<string>('duration-asc');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [highlightQuery, setHighlightQuery] = useState<string>('');
    const [highlightedProjects, setHighlightedProjects] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: '', // Will be set to a default in useEffect
        end: ''    // Will be set to a default in useEffect
    });
    const [filteredDurations, setFilteredDurations] = useState<typeof projectDurations>([]);

    // Set default date range on component mount
    useEffect(() => {
        // Default start date to 5 years ago
        const defaultStart = new Date();
        defaultStart.setFullYear(defaultStart.getFullYear() - 5);
        
        // Default end date to future
        const defaultEnd = new Date();
        defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
        
        setDateRange({
            start: defaultStart.toISOString().split('T')[0],
            end: defaultEnd.toISOString().split('T')[0]
        });
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
            
            // Apply date range filter
            if (dateRange.start || dateRange.end) {
                filtered = filtered.filter(project => {
                    const projectDate = new Date(project.created);
                    const isAfterStart = !dateRange.start || projectDate >= new Date(dateRange.start);
                    const isBeforeEnd = !dateRange.end || projectDate <= new Date(dateRange.end);
                    return isAfterStart && isBeforeEnd;
                });
            }
            
            setFilteredDurations(filtered);
        }
    }, [projectDurations, searchQuery, dateRange, projectSort]);

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





    // Automatically re-run analyzeAllProjects when sort method changes and projects have been analyzed at least once
    // Place this after analyzeAllProjects is defined
    // Helper: Extract section from task name (customize as needed)
    function getSectionFromTask(task: Task): string {
        // Example: Task name contains section, e.g. "Section: Onboarding - ..."
        if (!task.name) return 'Unknown';
        // Try to match 'Section: <name>' or '<name> Section' or '[Section] <name>'
            const match = task.name.match(/Section[:\s-]+([\w ]+)/i);
        if (match) return match[1].trim();
        // Fallback: use first word as section
        const fallback = task.name.match(/^(\w+)/);
        return fallback ? fallback[1] : 'Unknown';
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
            const currentTotal = totalDurations.find(d => d.section === sectionInfo.section)?.avgDuration || 0;
            const previousTotal = index > 0 
                ? totalDurations.find(d => d.section === sectionsByTime[index - 1].section)?.avgDuration || 0
                : 0;
            
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
            if(createdAt > oneWeekAgo) {
                tasksCreatedByDay[createdAt.getDay()].created++;
            }
            if (task.completed && task.completed_at) {
                completedCount++;
                const completedAt = new Date(task.completed_at);
                if (completedAt > oneWeekAgo) {
                    tasksCompletedByDay[completedAt.getDay()].completed++;
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
    // Calculate section durations
    const durations = calculateSectionDurations(tasks);
    setSectionDurations(durations.totalDurations);
    setIncrementalDurations(durations.incrementalDurations);
    // Calculate section completion spans
    setSectionCompletionSpans(calculateSectionCompletionSpans(tasks));
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
            // Fetch all projects
            const response = await fetch(`${ASANA_API_BASE}/projects?opt_fields=name,gid`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const result = await response.json();
            const projectsList = result.data;
            // Fetch all tasks for each project
            const allTasksPromises = projectsList.map((p: Task) =>
                fetch(`${ASANA_API_BASE}/tasks?project=${p.gid}&opt_fields=created_at,completed,completed_at`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json())
            );
            const allTasksResults = await Promise.all(allTasksPromises);
            const durations: { name: string; duration: number; created: string; completed: string }[] = [];
            allTasksResults.forEach((result, idx) => {
                const project = projectsList[idx];
                if (!result || !Array.isArray(result.data)) {
                    // If API response is invalid, skip this project and optionally log
                    return;
                }
                const completedTasks = result.data.filter((t: Task) => t.completed && t.completed_at && t.created_at);
                if (completedTasks.length > 0) {
                    const creationDates = completedTasks.map((t: Task) => new Date(t.created_at));
                    const completionDates = completedTasks.map((t: Task) => new Date(t.completed_at || ''));
                    const startDate = new Date(Math.min(...creationDates.map((d: Date) => d.getTime())));
                    const endDate = new Date(Math.max(...completionDates.map((d: Date) => d.getTime())));
                    const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (duration > 0) {
                        durations.push({
                            name: project.name,
                            duration,
                            created: startDate.toISOString(),
                            completed: endDate.toISOString(),
                        });
                    }
                }
            });
            // Sorting logic
            const sorted = [...durations];
            switch (projectSort) {
                case 'created-asc':
                    sorted.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
                    break;
                case 'created-desc':
                    sorted.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
                    break;
                case 'completed-asc':
                    sorted.sort((a, b) => new Date(a.completed).getTime() - new Date(b.completed).getTime());
                    break;
                case 'completed-desc':
                    sorted.sort((a, b) => new Date(b.completed).getTime() - new Date(a.completed).getTime());
                    break;
                case 'alpha-asc':
                    sorted.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'alpha-desc':
                    sorted.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'duration-desc':
                    sorted.sort((a, b) => b.duration - a.duration);
                    break;
                case 'duration-asc':
                default:
                    sorted.sort((a, b) => a.duration - b.duration);
                    break;
            }
            setProjectDurations(sorted);
        } catch (e) {
            setAnalysisError((e instanceof Error && e.message) ? e.message : 'Analysis failed.');
        }
        setAnalyzing(false);
    }, [token, projectSort, ASANA_API_BASE]);

    // ASANA_API_BASE is already defined above

    const handleFetchProjects = async () => {
        if (!token) {
            setError('Please enter your Asana Personal Access Token.');
            return;
        }
        setLoading(true);
        setError('');
        setProjects([]);
        setProjectData(null);
        try {
            const response = await fetch(`${ASANA_API_BASE}/projects?opt_fields=name,gid`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const result = await response.json();
            setProjects(result.data);
            if (result.data.length > 0) {
                setSelectedProjectGid(result.data[0].gid);
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
                // 1. Fetch all task GIDs for the project
                const taskListResponse = await fetch(`${ASANA_API_BASE}/projects/${selectedProjectGid}/tasks?opt_fields=gid`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!taskListResponse.ok) throw new Error(`Failed to fetch tasks: ${taskListResponse.statusText}`);
                const taskListResult = await taskListResponse.json();
                // 2. Fetch full details for each task concurrently
                const taskDetailPromises = taskListResult.data.map((task: Task) =>
                    fetch(`${ASANA_API_BASE}/tasks/${task.gid}?opt_fields=name,created_at,due_on,completed,completed_at`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(res => res.json())
                );
                const taskDetailResults = await Promise.all(taskDetailPromises);
                const tasks = taskDetailResults.map((res: { data: Task }) => res.data);
                // 3. Process data for charts and tables
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




    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">Asana Project Dashboard</h1>
                    <p className="text-gray-400 text-lg">Visualize your project data and timelines.</p>
                </header>

                <div className="card">
                    {/* Token input is hidden, token is set in code */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Asana Personal Access Token</label>
                            <input
                                type="password"
                                value={token ? token.replace(/./g, '*') : ''}
                                disabled
                                className="input-field bg-gray-800 text-gray-400 cursor-not-allowed"
                                placeholder="Token is securely set."
                            />
                        </div>
                        <button
                            onClick={handleFetchProjects}
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center"
                        >
                            {loading && !projects.length ? 'Fetching...' : 'Fetch Projects'}
                        </button>
                    </div>
                    {error && <ErrorDisplay message={error} />}
                    {projects.length > 0 && (
                        <div className="mt-6">
                            <label htmlFor="project-select" className="block text-sm font-medium text-gray-300 mb-2">Select a Project</label>
                            <div className="relative">
                                <select
                                    id="project-select"
                                    value={selectedProjectGid}
                                    onChange={(e) => setSelectedProjectGid(e.target.value)}
                                    className="select-field bg-gray-800 text-white text-lg border border-indigo-500 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    style={{ minWidth: '220px', fontWeight: 600, letterSpacing: '0.02em' }}
                                >
                                    {projects.map((p: Task) => <option key={p.gid} value={p.gid} className="bg-gray-900 text-white">{p.name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Cross-Project Duration Comparison Section */}
                <div className="card mt-8">
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h2 className="text-2xl font-bold mb-4 sm:mb-0">Compare Project Completion Times</h2>
                            <button
                                onClick={analyzeAllProjects}
                                disabled={analyzing}
                                className="btn-primary w-full sm:w-auto flex items-center justify-center"
                            >
                                {analyzing ? 'Analyzing...' : 'Analyze All Projects'}
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
                                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                                    <div className="grid grid-cols-2 gap-x-2">
                                        <input
                                            id="start-date"
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="w-full h-10 bg-[#1e1e1e] text-gray-200 rounded-md px-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        />
                                        <input
                                            id="end-date"
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
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
                                        <option value="alpha-asc">A-Z</option>
                                        <option value="alpha-desc">Z-A</option>
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
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart
                                        data={filteredDurations}
                                        margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#A0AEC0"
                                            hide={true}
                                        />
                                        <YAxis
                                            stroke="#A0AEC0"
                                            label={{
                                                value: 'Days',
                                                angle: -90,
                                                position: 'insideLeft',
                                                fill: '#E2E8F0',
                                                offset: 10,
                                                style: { fontWeight: 600 }
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }}
                                            formatter={(value: number, _name: string, entry: { payload?: { name: string } }) => {
                                                const name = entry?.payload?.name || '';
                                                if (!name) return [value, ''];
                                                const isHighlighted = highlightedProjects.some(query =>
                                                    name.toLowerCase().includes(query)
                                                );
                                                return [
                                                    <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{value} days</span>,
                                                    <span style={{ color: isHighlighted ? '#F59E0B' : '#818CF8' }}>
                                                        {name}
                                                    </span>
                                                ];
                                            }}
                                        />
                                        <Bar
                                            dataKey="duration"
                                            name="Completion Duration"
                                            maxBarSize={50}
                                        >
                                            {filteredDurations.map((entry, index) => {
                                                const isHighlighted = highlightedProjects.some(query =>
                                                    entry.name.toLowerCase().includes(query)
                                                );
                                                return (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={isHighlighted ? '#F59E0B' : '#818CF8'}
                                                        opacity={highlightedProjects.length > 0 ? (isHighlighted ? 1 : 0.3) : 1}
                                                    />
                                                );
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                {filteredDurations.length > 15 && (
                                    <p className="text-center text-gray-400 mt-4 text-sm">
                                        Tip: Use the search or date filters to narrow down projects for better visibility
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 mt-8">No projects found matching your criteria.</p>
                        )}
                    </div>
                </div>

                

                {/* Section Completion Time Comparison */}
                {sectionDurations.length > 0 && (
                    <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Total Duration Chart */}
                        <div className="card">
                            <h2 className="text-2xl font-bold mb-4">Total Completion Time by Section</h2>
                            <div className="mt-8 h-96 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sectionDurations} margin={{ top: 30, right: 20, left: 40, bottom: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis dataKey="section" stroke="#A0AEC0" hide={true} />
                                        <YAxis stroke="#A0AEC0" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }}
                                            formatter={(value: number) => [`${value} days`, 'Total Time']}
                                        />
                                        <Bar dataKey="avgDuration" name="Total Time (Days)" fill="#F472B6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Incremental Duration Chart */}
                        <div className="card">
                            <h2 className="text-2xl font-bold mb-4">Incremental Time by Section</h2>
                            <div className="mt-8 h-96 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={incrementalDurations} margin={{ top: 30, right: 20, left: 40, bottom: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis dataKey="section" stroke="#A0AEC0" hide={true} />
                                        <YAxis stroke="#A0AEC0" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }}
                                            formatter={(value: number) => [`${value} days`, 'Additional Time']}
                                        />
                                        <Bar dataKey="avgDuration" name="Additional Time (Days)" fill="#60A5FA" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    {/* Section Completion Span Graph */}
                    {sectionCompletionSpans.length > 0 && (
                        <div className="card mt-8">
                            <h2 className="text-2xl font-bold mb-4">Section Completion Span (First to Last Completion)</h2>
                            <div className="mt-8 h-96 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sectionCompletionSpans} margin={{ top: 30, right: 20, left: 40, bottom: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis dataKey="section" stroke="#A0AEC0" hide={true} />
                                        <YAxis stroke="#A0AEC0" label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                                        <Bar dataKey="span" name="Completion Span (Days)" fill="#60A5FA" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                    </>
                )}
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
                {!loading && !analyzing && projectData && <DashboardView projectData={projectData} />}
            </div>
        </div>
    );
}

