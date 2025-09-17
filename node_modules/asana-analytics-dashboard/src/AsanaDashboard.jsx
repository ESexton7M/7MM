import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, BarChart3, TrendingUp, GanttChartSquare } from 'lucide-react';
import { gsap } from 'gsap';

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocale-DateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const calculateDaysBetween = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
};


// --- React Component ---
export default function AsanaDashboard() {
  const [token, setToken] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // New state for cross-project analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [projectDurations, setProjectDurations] = useState([]);
  const [timeTrends, setTimeTrends] = useState([]);
  
  const dashboardRef = useRef(null);
  const statsRef = useRef(null);
  const chartsRef = useRef(null);
  const analysisRef = useRef(null);

  useEffect(() => {
    if (dashboardRef.current) {
      gsap.fromTo(dashboardRef.current, { y: 30, opacity: 0 }, { duration: 0.8, y: 0, opacity: 1, ease: 'power3.out' });
    }
  }, []);

  const handleFetchProjects = async () => {
    if (!token) {
      setError('Please enter a Personal Access Token.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('https://app.asana.com/api/1.0/projects?opt_fields=name,gid', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setProjects(data.data);
    } catch (e) {
      setError('Failed to fetch projects. Please check your token and network connection.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = async (e) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);
    if (!projectId) {
      setTasks([]);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`https://app.asana.com/api/1.0/tasks?project=${projectId}&opt_fields=name,created_at,due_on,completed,completed_at`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTasks(data.data);
      
      // Animate cards on data load
       gsap.fromTo([statsRef.current.children, chartsRef.current.children], 
        { y: 20, opacity: 0 }, 
        { duration: 0.5, y: 0, opacity: 1, stagger: 0.1, ease: 'power3.out' }
      );

    } catch (e) {
      setError('Failed to fetch tasks for the selected project.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Cross-Project Analysis Logic ---
  const handleAnalyzeAllProjects = async () => {
    if (projects.length === 0) {
      setAnalysisError("Please fetch projects first.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError('');
    setProjectDurations([]);
    setTimeTrends([]);

    try {
      const allTasksPromises = projects.map(p => 
        fetch(`https://app.asana.com/api/1.0/tasks?project=${p.gid}&opt_fields=created_at,completed,completed_at`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json())
      );
      
      const allTasksResults = await Promise.all(allTasksPromises);

      const durations = [];
      const monthlyData = {};

      allTasksResults.forEach((result, index) => {
        const project = projects[index];
        const completedTasks = result.data.filter(t => t.completed && t.completed_at && t.created_at);
        
        if (completedTasks.length > 0) {
          const creationDates = completedTasks.map(t => new Date(t.created_at));
          const completionDates = completedTasks.map(t => new Date(t.completed_at));
          
          const startDate = new Date(Math.min.apply(null, creationDates));
          const endDate = new Date(Math.max.apply(null, completionDates));
          const duration = calculateDaysBetween(startDate, endDate);
          
          if (duration > 0) {
              durations.push({ name: project.name, duration });

              const completionMonth = endDate.toLocaleString('en-US', { year: 'numeric', month: 'short' });
              if (!monthlyData[completionMonth]) {
                monthlyData[completionMonth] = { totalDuration: 0, count: 0 };
              }
              monthlyData[completionMonth].totalDuration += duration;
              monthlyData[completionMonth].count++;
          }
        }
      });

      const trends = Object.keys(monthlyData).map(month => ({
        month,
        "Average Duration (Days)": (monthlyData[month].totalDuration / monthlyData[month].count).toFixed(1),
      })).sort((a,b) => new Date(a.month) - new Date(b.month));

      setProjectDurations(durations);
      setTimeTrends(trends);

      gsap.fromTo(analysisRef.current.children, 
        { y: 20, opacity: 0 }, 
        { duration: 0.5, y: 0, opacity: 1, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
      );

    } catch (e) {
        setAnalysisError("An error occurred during analysis. The Asana API might be rate-limiting requests.");
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };


  // --- Data for Single-Project Charts ---
  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const pendingCount = totalTasks - completedCount;
  
  const completionTimes = completedTasks
    .map(t => calculateDaysBetween(t.created_at, t.completed_at))
    .filter(days => days > 0);
  
  const avgCompletionTime = completionTimes.length > 0
    ? (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1)
    : 0;

  return (
    <div ref={dashboardRef} className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">Asana Project Dashboard</h1>
          <p className="text-gray-400 text-lg">Visualize your project data and timelines.</p>
        </header>

        {/* Auth & Project Selection */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">Asana Personal Access Token</label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your token..."
                className="input-field"
              />
            </div>
            <button onClick={handleFetchProjects} disabled={isLoading} className="btn-primary w-full flex items-center justify-center">
              {isLoading && !selectedProject ? <Loader2 className="animate-spin mr-2" /> : <GanttChartSquare className="mr-2" />}
              Fetch Projects
            </button>
          </div>
          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
          {projects.length > 0 && (
             <div className="mt-6">
               <label htmlFor="project" className="block text-sm font-medium text-gray-300 mb-2">Select a Project</label>
                 <div className="relative">
                    <select id="project" value={selectedProject} onChange={handleProjectChange} className="select-field">
                        <option value="">-- Select a project --</option>
                        {projects.map(p => <option key={p.gid} value={p.gid}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
             </div>
          )}
        </div>
        
        {/* Single Project View */}
        {selectedProject && (
          <>
            {/* Stats */}
            <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="stat-card">
                <h3 className="stat-title">Total Tasks</h3>
                <p className="stat-value">{totalTasks}</p>
              </div>
              <div className="stat-card">
                <h3 className="stat-title">Completed</h3>
                <p className="stat-value text-green-400">{completedCount}</p>
              </div>
              <div className="stat-card">
                <h3 className="stat-title">Pending</h3>
                <p className="stat-value text-yellow-400">{pendingCount}</p>
              </div>
              <div className="stat-card">
                <h3 className="stat-title">Avg. Completion</h3>
                <p className="stat-value">{avgCompletionTime} days</p>
              </div>
            </div>
            
            {/* Charts and Table */}
            <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Detailed Task Table */}
                <div className="card lg:col-span-2">
                    <h2 className="chart-title">Task Details</h2>
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left mt-4">
                        <thead className="bg-gray-700/50 sticky top-0">
                          <tr>
                            <th className="p-3">Task Name</th>
                            <th className="p-3">Created</th>
                            <th className="p-3">Due</th>
                            <th className="p-3">Completed On</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {tasks.map(task => (
                            <tr key={task.gid} className="hover:bg-gray-700/40 transition-colors">
                              <td className="p-3 font-medium">{task.name}</td>
                              <td className="p-3">{formatDate(task.created_at)}</td>
                              <td className="p-3">{formatDate(task.due_on)}</td>
                              <td className="p-3">{formatDate(task.completed_at)}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  task.completed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                                }`}>
                                  {task.completed ? 'Completed' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
            </div>
          </>
        )}

        {/* Cross-Project Analysis Section */}
        <div className="card">
            <div className="flex flex-col sm:flex-row justify-between items-center">
                <h2 className="text-2xl font-bold mb-4 sm:mb-0">Cross-Project Analysis</h2>
                <button onClick={handleAnalyzeAllProjects} disabled={isAnalyzing} className="btn-primary w-full sm:w-auto flex items-center justify-center">
                    {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <BarChart3 className="mr-2"/>}
                    Analyze All Projects
                </button>
            </div>
            {analysisError && <p className="text-red-400 mt-4 text-center">{analysisError}</p>}
        </div>

        {(projectDurations.length > 0 || timeTrends.length > 0) && (
             <div ref={analysisRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Project Durations Chart */}
                <div className="card h-96">
                    <h2 className="chart-title flex items-center"><TrendingUp className="mr-2 text-indigo-400"/>Project Completion Times</h2>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projectDurations} margin={{ top: 30, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#A0AEC0" label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                            <Legend wrapperStyle={{ color: '#A0AEC0' }} />
                            <Bar dataKey="duration" name="Completion Duration (Days)" fill="url(#colorUv)" />
                             <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818CF8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#818CF8" stopOpacity={0.2}/>
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Time Trends Chart */}
                <div className="card h-96">
                    <h2 className="chart-title flex items-center"><BarChart3 className="mr-2 text-purple-400"/>Monthly Performance Trends</h2>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeTrends} margin={{ top: 30, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="month" stroke="#A0AEC0" />
                            <YAxis stroke="#A0AEC0" label={{ value: 'Avg. Days', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                            <Legend wrapperStyle={{ color: '#A0AEC0' }} />
                            <Line type="monotone" dataKey="Average Duration (Days)" stroke="#A78BFA" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

