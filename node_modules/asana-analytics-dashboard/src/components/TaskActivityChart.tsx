import type { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyTaskData } from '../types';

interface TaskActivityChartProps {
  tasksCreatedByDay: DailyTaskData[];
  tasksCompletedByDay: DailyTaskData[];
}

/**
 * Chart showing task activity (creation and completion) by day of week
 */
const TaskActivityChart: FC<TaskActivityChartProps> = ({ 
  tasksCreatedByDay, 
  tasksCompletedByDay 
}) => {
  // Combine the data for created and completed tasks
  const combinedData = tasksCreatedByDay.map((dayData, index) => ({
    name: dayData.name,
    created: dayData.created || 0,
    completed: tasksCompletedByDay[index]?.completed || 0
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={combinedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
          <XAxis dataKey="name" stroke="#A0AEC0" />
          <YAxis stroke="#A0AEC0" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1A202C', 
              border: '1px solid #4A5568',
              borderRadius: '4px' 
            }} 
          />
          <Bar dataKey="created" name="Tasks Created" fill="#60A5FA" />
          <Bar dataKey="completed" name="Tasks Completed" fill="#34D399" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TaskActivityChart;