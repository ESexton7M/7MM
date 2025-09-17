import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import TaskTable from './TaskTable';
import TaskActivityChart from './TaskActivityChart';
import type { DashboardViewProps } from '../types';

/**
 * Main dashboard view component to display project data
 */
const DashboardView: FC<DashboardViewProps> = ({ projectData }) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Apply animation effects when projectData changes
  useEffect(() => {
    if (dashboardRef.current && projectData) {
      // Animate all children (including table rows) to fade and slide in upwards
      const children = dashboardRef.current.children;
      gsap.fromTo(
        children,
        { opacity: 0, y: 40 }, // start lower
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' }
      );
      
      // Animate table rows for extra effect
      const table = dashboardRef.current.querySelector('table');
      if (table) {
        const rows = table.querySelectorAll('tbody tr');
        gsap.fromTo(
          rows,
          { opacity: 0, y: 40 }, // start lower
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', delay: 0.25 }
        );
      }
    }
  }, [projectData]);

  if (!projectData) return null;
  
  const { stats, taskTableData, tasksCompletedByDay, tasksCreatedByDay } = projectData;

  return (
    <div ref={dashboardRef} className="space-y-8 mt-8 fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <h3 className="stat-title">Total Tasks</h3>
          <p className="stat-value">{stats.totalTasks}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Completed</h3>
          <p className="stat-value text-green-400">{stats.completedTasks}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Pending</h3>
          <p className="stat-value text-yellow-400">{stats.pendingTasks}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Avg. Completion</h3>
          <p className="stat-value">{stats.avgCompletionTimeDays} days</p>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-700 p-4">
        <h3 className="font-bold text-base sm:text-lg text-gray-100 mb-4">Task Activity by Day</h3>
        <TaskActivityChart 
          tasksCreatedByDay={tasksCreatedByDay} 
          tasksCompletedByDay={tasksCompletedByDay} 
        />
      </div>

      {/* Task Table */}
      <TaskTable tasks={taskTableData} />
    </div>
  );
};

export default DashboardView;