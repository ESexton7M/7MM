import React, { useState, useMemo } from 'react';
import type { ProjectDuration } from '../types';

interface MonthlyTimelineViewProps {
  projectDurations: (ProjectDuration & { gid?: string })[];
  highlightedProjects: string[];
}

interface MonthlyProject {
  name: string;
  status: 'started' | 'completed';
  date: Date;
  type?: string;
  salePrice?: number | string;
}

type ViewMode = 'monthly' | 'quarterly';

const MonthlyTimelineView: React.FC<MonthlyTimelineViewProps> = ({
  projectDurations,
  highlightedProjects
}) => {
  // Get current month/year as default
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  // Helper function to filter out internal/7MM projects
  const isInternalProject = (projectName: string): boolean => {
    const lowerName = projectName.toLowerCase();
    return lowerName.includes('7mm') || 
           lowerName.includes('7 mountains') ||
           lowerName.includes('7 mountain') ||
           lowerName.includes('7mc') ||
           /^7\s*m+/.test(lowerName);
  };

  // Helper to get quarter from month (0-3)
  const getQuarter = (month: number): number => Math.floor(month / 3);
  
  // Helper to get quarter name
  const getQuarterName = (quarter: number): string => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    return quarters[quarter] || 'Q1';
  };
  
  // Helper to get months in a quarter
  const getQuarterMonths = (quarter: number): number[] => {
    return [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];
  };

  // Generate list of available months based on project data
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    
    projectDurations.forEach(project => {
      if (isInternalProject(project.name)) return;
      
      // Add month from created date
      if (project.created) {
        const createdDate = new Date(project.created);
        monthSet.add(`${createdDate.getFullYear()}-${createdDate.getMonth()}`);
      }
      
      // Add month from completed date
      if (project.completed) {
        const completedDate = new Date(project.completed);
        monthSet.add(`${completedDate.getFullYear()}-${completedDate.getMonth()}`);
      }
    });
    
    // Convert to array and sort
    const months = Array.from(monthSet)
      .map(key => {
        const [year, month] = key.split('-').map(Number);
        return { year: year ?? 0, month: month ?? 0 };
      })
      .filter(m => m.year && m.month !== undefined)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year; // Newest year first
        return b.month - a.month; // Newest month first
      });
    
    return months;
  }, [projectDurations]);
  
  // Generate list of available quarters
  const availableQuarters = useMemo(() => {
    const quarterSet = new Set<string>();
    
    projectDurations.forEach(project => {
      if (isInternalProject(project.name)) return;
      
      // Add quarter from created date
      if (project.created) {
        const createdDate = new Date(project.created);
        const quarter = getQuarter(createdDate.getMonth());
        quarterSet.add(`${createdDate.getFullYear()}-${quarter}`);
      }
      
      // Add quarter from completed date
      if (project.completed) {
        const completedDate = new Date(project.completed);
        const quarter = getQuarter(completedDate.getMonth());
        quarterSet.add(`${completedDate.getFullYear()}-${quarter}`);
      }
    });
    
    // Convert to array and sort
    const quarters = Array.from(quarterSet)
      .map(key => {
        const [year, quarter] = key.split('-').map(Number);
        return { year: year ?? 0, quarter: quarter ?? 0 };
      })
      .filter(q => q.year && q.quarter !== undefined)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year; // Newest year first
        return b.quarter - a.quarter; // Newest quarter first
      });
    
    return quarters;
  }, [projectDurations]);

  // Get projects for selected period (month or quarter)
  const periodProjects = useMemo(() => {
    const projects: MonthlyProject[] = [];
    
    projectDurations.forEach(project => {
      if (isInternalProject(project.name)) return;
      
      const createdDate = project.created ? new Date(project.created) : null;
      const completedDate = project.completed ? new Date(project.completed) : null;
      
      if (viewMode === 'monthly') {
        // Check if started in this month
        if (createdDate) {
          if (createdDate.getMonth() === selectedMonth && 
              createdDate.getFullYear() === selectedYear) {
            projects.push({
              name: project.name,
              status: 'started',
              date: createdDate,
              type: project.type,
              salePrice: project.salePrice
            });
          }
        }
        
        // Check if completed in this month (and not started in same month)
        if (completedDate) {
          const startedInSameMonth = createdDate && 
            createdDate.getMonth() === completedDate.getMonth() &&
            createdDate.getFullYear() === completedDate.getFullYear();
          
          if (completedDate.getMonth() === selectedMonth && 
              completedDate.getFullYear() === selectedYear &&
              !startedInSameMonth) {
            projects.push({
              name: project.name,
              status: 'completed',
              date: completedDate,
              type: project.type,
              salePrice: project.salePrice
            });
          }
        }
      } else {
        // Quarterly view
        const currentQuarter = getQuarter(selectedMonth);
        const quarterMonths = getQuarterMonths(currentQuarter);
        
        // Check if started in this quarter
        if (createdDate) {
          if (quarterMonths.includes(createdDate.getMonth()) && 
              createdDate.getFullYear() === selectedYear) {
            projects.push({
              name: project.name,
              status: 'started',
              date: createdDate,
              type: project.type,
              salePrice: project.salePrice
            });
          }
        }
        
        // Check if completed in this quarter (and not started in same quarter)
        if (completedDate) {
          const startedInSameQuarter = createdDate && 
            quarterMonths.includes(createdDate.getMonth()) &&
            quarterMonths.includes(completedDate.getMonth()) &&
            createdDate.getFullYear() === completedDate.getFullYear();
          
          if (quarterMonths.includes(completedDate.getMonth()) && 
              completedDate.getFullYear() === selectedYear &&
              !startedInSameQuarter) {
            projects.push({
              name: project.name,
              status: 'completed',
              date: completedDate,
              type: project.type,
              salePrice: project.salePrice
            });
          }
        }
      }
    });
    
    // Sort by date within the period
    return projects.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [projectDurations, selectedMonth, selectedYear, viewMode]);

  // Count projects by status
  const statusCounts = useMemo(() => {
    const started = periodProjects.filter(p => p.status === 'started').length;
    const completed = periodProjects.filter(p => p.status === 'completed').length;
    return { started, completed };
  }, [periodProjects]);

  // Calculate revenue totals
  const revenueTotals = useMemo(() => {
    const startedProjects = periodProjects.filter(p => p.status === 'started');
    const completedProjects = periodProjects.filter(p => p.status === 'completed');
    
    const calculateRevenue = (projects: MonthlyProject[]) => {
      return projects.reduce((sum, project) => {
        if (!project.salePrice) return sum;
        const price = typeof project.salePrice === 'string' 
          ? parseFloat(project.salePrice.replace(/[$,]/g, ''))
          : project.salePrice;
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
    };
    
    return {
      started: calculateRevenue(startedProjects),
      completed: calculateRevenue(completedProjects)
    };
  }, [periodProjects]);

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Handle period change (month or quarter)
  const handlePeriodChange = (direction: 'prev' | 'next') => {
    if (viewMode === 'monthly') {
      let newMonth = selectedMonth;
      let newYear = selectedYear;
      
      if (direction === 'prev') {
        newMonth--;
        if (newMonth < 0) {
          newMonth = 11;
          newYear--;
        }
      } else {
        newMonth++;
        if (newMonth > 11) {
          newMonth = 0;
          newYear++;
        }
      }
      
      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    } else {
      // Quarterly view
      const currentQuarter = getQuarter(selectedMonth);
      let newQuarter = currentQuarter;
      let newYear = selectedYear;
      
      if (direction === 'prev') {
        newQuarter--;
        if (newQuarter < 0) {
          newQuarter = 3;
          newYear--;
        }
      } else {
        newQuarter++;
        if (newQuarter > 3) {
          newQuarter = 0;
          newYear++;
        }
      }
      
      // Set to first month of the quarter
      setSelectedMonth(newQuarter * 3);
      setSelectedYear(newYear);
    }
  };
  
  // Get current period display name
  const getPeriodName = (): string => {
    if (viewMode === 'monthly') {
      return `${monthNames[selectedMonth]} ${selectedYear}`;
    } else {
      const quarter = getQuarter(selectedMonth);
      return `${getQuarterName(quarter)} ${selectedYear}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* View mode toggle */}
      <div className="flex items-center justify-center gap-2 bg-gray-800 rounded-lg p-2 w-fit mx-auto">
        <button
          onClick={() => setViewMode('monthly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Monthly View
        </button>
        <button
          onClick={() => setViewMode('quarterly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'quarterly'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Quarterly View
        </button>
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
        <button
          onClick={() => handlePeriodChange('prev')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          aria-label={`Previous ${viewMode === 'monthly' ? 'month' : 'quarter'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-center">
          <h3 className="text-2xl font-bold">
            {getPeriodName()}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {statusCounts.started} started · {statusCounts.completed} completed
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm">
            <span className="text-blue-400">
              Started: ${revenueTotals.started.toLocaleString()}
            </span>
            <span className="text-gray-500">·</span>
            <span className="text-green-400">
              Completed: ${revenueTotals.completed.toLocaleString()}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => handlePeriodChange('next')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          aria-label={`Next ${viewMode === 'monthly' ? 'month' : 'quarter'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Quick period selector */}
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-400 mb-2">Quick jump to:</p>
        <div className="flex flex-wrap gap-2">
          {viewMode === 'monthly' ? (
            availableMonths.slice(0, 12).map((month, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedMonth(month.month);
                  setSelectedYear(month.year);
                }}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  month.month === selectedMonth && month.year === selectedYear
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {monthNames[month.month]?.slice(0, 3)} {month.year}
              </button>
            ))
          ) : (
            availableQuarters.slice(0, 12).map((quarter, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedMonth(quarter.quarter * 3);
                  setSelectedYear(quarter.year);
                }}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  getQuarter(selectedMonth) === quarter.quarter && quarter.year === selectedYear
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {getQuarterName(quarter.quarter)} {quarter.year}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm">Projects Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm">Projects Completed</span>
        </div>
      </div>

      {/* Project list */}
      {periodProjects.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">
            No projects started or completed in {getPeriodName()}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {periodProjects.map((project, idx) => {
            const isHighlighted = highlightedProjects.some(h => 
              project.name.toLowerCase().includes(h.toLowerCase())
            );
            
            return (
              <div
                key={idx}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  isHighlighted 
                    ? 'bg-indigo-900 bg-opacity-40 border border-indigo-500 shadow-lg' 
                    : 'bg-gray-800 hover:bg-gray-750'
                }`}
              >
                {/* Status indicator */}
                <div className="flex-shrink-0">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      project.status === 'started' ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                  />
                </div>

                {/* Project info */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold truncate ${
                    isHighlighted ? 'text-indigo-300' : 'text-gray-200'
                  }`}>
                    {project.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    {project.type && (
                      <p className="text-xs text-gray-400">
                        Type: {project.type}
                      </p>
                    )}
                    {project.salePrice && (
                      <>
                        {project.type && <span className="text-xs text-gray-600">•</span>}
                        <p className="text-xs text-emerald-400 font-semibold">
                          ${typeof project.salePrice === 'string' 
                            ? parseFloat(project.salePrice.replace(/[$,]/g, '')).toLocaleString()
                            : project.salePrice.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    project.status === 'started'
                      ? 'bg-blue-500 bg-opacity-20 text-blue-300 border border-blue-500'
                      : 'bg-green-500 bg-opacity-20 text-green-300 border border-green-500'
                  }`}>
                    {project.status === 'started' ? 'Started' : 'Completed'}
                  </span>
                </div>

                {/* Date */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm text-gray-400">
                    {project.date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-blue-900 bg-opacity-30 p-6 rounded-lg border border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-300 mb-1">Projects Started</p>
              <p className="text-3xl font-bold">{statusCounts.started}</p>
              <p className="text-sm text-blue-400 mt-2">
                Revenue: ${revenueTotals.started.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-green-900 bg-opacity-30 p-6 rounded-lg border border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-300 mb-1">Projects Completed</p>
              <p className="text-3xl font-bold">{statusCounts.completed}</p>
              <p className="text-sm text-green-400 mt-2">
                Revenue: ${revenueTotals.completed.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyTimelineView;
