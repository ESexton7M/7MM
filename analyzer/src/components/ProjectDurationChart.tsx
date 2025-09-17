import { useMemo } from 'react';
import type { FC } from 'react';
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

import type { ProjectDurationChartProps } from '../types';

/**
 * ProjectDurationChart - Visualizes project completion durations with highlighting capability
 */
const ProjectDurationChart: FC<ProjectDurationChartProps> = ({ 
  durations,
  highlightedProjects
}) => {
  // Determine if any projects should be highlighted
  const shouldHighlight = highlightedProjects.length > 0;

  // Memoize the processed durations to avoid recalculating on every render
  const processedDurations = useMemo(() => {
    return durations.map(duration => ({
      ...duration,
      highlighted: shouldHighlight && 
        highlightedProjects.some(query => 
          duration.name.toLowerCase().includes(query.toLowerCase()))
    }));
  }, [durations, highlightedProjects, shouldHighlight]);

  // Custom tooltip component for better formatting and display
  const CustomTooltip: FC<{ active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }> = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload as (typeof processedDurations)[0];
    
    // Format dates if they exist and are valid
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return '';
      }
    };
    
    // Only show dates section if valid dates are provided
    const startDate = formatDate(data.created);
    const endDate = formatDate(data.completed);
    const showDates = startDate !== '' && endDate !== '';
    
    return (
      <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg shadow-lg">
        <p className="text-gray-200 font-bold mb-1">{data.name}</p>
        <p className="text-gray-300">
          <span className="text-indigo-400 font-semibold">{data.duration} days</span> to complete
        </p>
        {showDates && (
          <div className="text-xs text-gray-400 mt-2">
            <p>Started: {startDate}</p>
            <p>Completed: {endDate}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={processedDurations}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
          <XAxis 
            dataKey="name" 
            stroke="#A0AEC0" 
            hide={processedDurations.length > 10} // Hide axis if too many items
          />
          <YAxis
            stroke="#A0AEC0"
            label={{
              value: 'Days to Complete',
              angle: -90,
              position: 'insideLeft',
              fill: '#E2E8F0',
              offset: 10,
              style: { fontWeight: 600 }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="duration"
            name="Completion Duration"
            maxBarSize={50}
          >
            {processedDurations.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.highlighted ? '#F59E0B' : '#818CF8'}
                opacity={shouldHighlight ? (entry.highlighted ? 1 : 0.3) : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {processedDurations.length > 15 && (
        <p className="text-center text-gray-400 mt-2 text-sm">
          Tip: Use search filters to narrow down projects for better visibility
        </p>
      )}
    </div>
  );
};

export default ProjectDurationChart;
