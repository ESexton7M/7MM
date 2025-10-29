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
import { formatDurationInWeeks, daysToWeeks } from '../utils/statistics';

/**
 * ProjectDurationChart - Visualizes project completion durations with highlighting capability
 */
const ProjectDurationChart: FC<ProjectDurationChartProps & { onProjectClick?: (projectName: string) => void }> = ({ 
  durations,
  highlightedProjects,
  onProjectClick
}) => {
  // Determine if any projects should be highlighted
  const shouldHighlight = highlightedProjects.length > 0;

  // Memoize the processed durations to avoid recalculating on every render
  const processedDurations = useMemo(() => {
    return durations.map(duration => ({
      ...duration,
      duration: daysToWeeks(duration.duration), // Convert to weeks for display
      originalDuration: duration.duration, // Keep original for tooltip
      highlighted: shouldHighlight && 
        highlightedProjects.some(query => 
          duration.name.toLowerCase().includes(query.toLowerCase()))
    }));
  }, [durations, highlightedProjects, shouldHighlight]);

  // Custom tooltip component for better formatting and display
  const CustomTooltip: FC<{ active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }> = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload as (typeof processedDurations)[0] & { type?: string; salePrice?: number | string; ecommerce?: string };
    
    // Format dates if they exist and are valid
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return '';
      }
    };
    
    // Format price
    const formatPrice = (price: number | string | undefined): string => {
      if (price === undefined || price === null || price === 'N/A') return 'N/A';
      if (typeof price === 'number') {
        return `$${price.toLocaleString()}`;
      }
      return String(price);
    };
    
    // Only show dates section if valid dates are provided
    const startDate = formatDate(data.created);
    const endDate = formatDate(data.completed);
    const showDates = startDate !== '' && endDate !== '';
    
    return (
      <div 
        className="bg-gray-800 p-3 border border-gray-700 rounded-lg shadow-lg transition-all hover:shadow-xl hover:border-indigo-500"
        onClick={() => {
          if (onProjectClick && data.name) {
            onProjectClick(data.name as string);
          }
        }}
        style={{ cursor: onProjectClick ? 'pointer' : 'default' }}
      >
        <p className="text-gray-200 font-bold mb-1">{data.name}</p>
        <p className="text-gray-300">
          <span className="text-indigo-400 font-semibold">{formatDurationInWeeks(data.originalDuration || data.duration)}</span> to complete
        </p>
        <p className="text-gray-400 text-xs">
          ({data.originalDuration || data.duration} days)
        </p>
        {data.type && (
          <p className="text-gray-300 text-sm mt-1">
            Type: <span className="text-cyan-400">{data.type}</span>
          </p>
        )}
        {data.salePrice !== undefined && (
          <p className="text-gray-300 text-sm">
            Sale Price: <span className="text-green-400">{formatPrice(data.salePrice)}</span>
          </p>
        )}
        {data.ecommerce && (
          <p className="text-gray-300 text-sm">
            E-commerce: <span className="text-purple-400">{data.ecommerce === 'Yes' ? 'Yes' : 'No'}</span>
          </p>
        )}
        {showDates && (
          <div className="text-xs text-gray-400 mt-2">
            <p>Started: {startDate}</p>
            <p>Completed: {endDate}</p>
          </div>
        )}
        {onProjectClick && (
          <p className="text-xs text-indigo-400 mt-2 italic">Click to view project details</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
        <BarChart
          data={processedDurations}
          margin={{ top: 20, right: 15, left: 10, bottom: 5 }}
          onClick={(data) => {
            if (onProjectClick && data && data.activePayload && data.activePayload[0]) {
              const projectName = data.activePayload[0].payload.name;
              if (projectName) {
                onProjectClick(projectName as string);
              }
            }
          }}
          style={{ cursor: onProjectClick ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
          <XAxis 
            dataKey="name" 
            stroke="#A0AEC0" 
            hide={processedDurations.length > 8} // Hide axis if too many items on mobile
            fontSize={12}
            style={{ cursor: onProjectClick ? 'pointer' : 'default' }}
          />
          <YAxis
            stroke="#A0AEC0"
            fontSize={12}
            label={{
              value: 'Weeks',
              angle: -90,
              position: 'insideLeft',
              fill: '#E2E8F0',
              offset: 0,
              style: { fontWeight: 600, fontSize: 12 }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="duration"
            name="Completion Duration"
            maxBarSize={40}
            onClick={(data) => {
              if (onProjectClick && data && data.name) {
                onProjectClick(data.name as string);
              }
            }}
            style={{ cursor: onProjectClick ? 'pointer' : 'default' }}
          >
            {processedDurations.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.highlighted ? '#F59E0B' : '#818CF8'}
                opacity={shouldHighlight ? (entry.highlighted ? 1 : 0.3) : 1}
                style={{ cursor: onProjectClick ? 'pointer' : 'default' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {processedDurations.length > 15 && (
        <p className="text-center text-gray-400 mt-2 text-xs sm:text-sm">
          Tip: Use search filters to narrow down projects for better visibility
        </p>
      )}
    </div>
  );
};

export default ProjectDurationChart;
