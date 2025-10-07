import type { FC } from 'react';
import type { Task } from '../types';
import { daysToWeeks } from '../utils/statistics';

interface TaskTableProps {
  tasks: Task[];
}

/**
 * Table component for displaying task details
 */
const TaskTable: FC<TaskTableProps> = ({ tasks }) => {
  // Helper to format dates consistently
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  // Helper to calculate days between created and completed
  const getDaysBetween = (created: string, completed: string | null | undefined): string => {
    if (!created || !completed) return '';
    const createdDate = new Date(created);
    const completedDate = new Date(completed);
    if (isNaN(createdDate.getTime()) || isNaN(completedDate.getTime())) return '';
    const diff = Math.round((completedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
    if (diff < 0) return '';
    
    // Show weeks for longer durations
    if (diff >= 14) {
      const weeks = daysToWeeks(diff);
      return `${weeks} weeks (${diff} days)`;
    }
    return `${diff} days`;
  };

  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg overflow-x-auto border border-gray-700">
      <h3 className="font-bold text-base sm:text-lg text-gray-100 p-4 sm:p-6 border-b border-gray-700">Task Details</h3>
      <div className="overflow-x-auto">
        <style>{`
          .glow-row {
            transition: box-shadow 0.3s, background 0.3s;
          }
          .glow-row:hover {
            box-shadow: 0 0 16px 2px #818cf8, 0 2px 8px 0 #000a;
            background: #3730a3 !important;
          }
        `}</style>
        <table className="min-w-[600px] w-full text-xs xs:text-sm sm:text-base text-left text-gray-300">
          <thead className="text-xs text-gray-300 uppercase bg-gray-900 border-b border-gray-700">
            <tr>
              <th scope="col" className="px-2 xs:px-4 sm:px-6 py-2 sm:py-3 tracking-wider">Task Name</th>
              <th scope="col" className="px-2 xs:px-4 sm:px-6 py-2 sm:py-3 tracking-wider">Created On</th>
              <th scope="col" className="px-2 xs:px-4 sm:px-6 py-2 sm:py-3 tracking-wider">Due On</th>
              <th scope="col" className="px-2 xs:px-4 sm:px-6 py-2 sm:py-3 tracking-wider">Completed On</th>
              <th scope="col" className="px-2 xs:px-4 sm:px-6 py-2 sm:py-3 tracking-wider">Duration</th>
              <th scope="col" className="px-2 xs:px-4 sm:px-6 py-2 sm:py-3 tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, idx) => (
              <tr
                key={task.gid}
                className={`glow-row transition-all duration-300 ${
                  idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'
                } border-b border-gray-700`}
              >
                <th scope="row" className="px-2 xs:px-4 sm:px-6 py-2 sm:py-4 font-semibold text-gray-100 whitespace-nowrap">
                  {task.name}
                </th>
                <td className="px-2 xs:px-4 sm:px-6 py-2 sm:py-4">{formatDate(task.created_at)}</td>
                <td className="px-2 xs:px-4 sm:px-6 py-2 sm:py-4">{formatDate(task.due_on)}</td>
                <td className="px-2 xs:px-4 sm:px-6 py-2 sm:py-4">{formatDate(task.completed_at)}</td>
                <td className="px-2 xs:px-4 sm:px-6 py-2 sm:py-4">{getDaysBetween(task.created_at, task.completed_at)}</td>
                <td className="px-2 xs:px-4 sm:px-6 py-2 sm:py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow ${
                    task.completed
                      ? 'bg-green-500/20 text-green-300 border border-green-400'
                      : 'bg-yellow-500/20 text-yellow-200 border border-yellow-400'
                  }`}>
                    {task.completed ? 'Completed' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tasks.length === 0 && <p className="text-center text-gray-400 py-8">No tasks found for this project.</p>}
    </div>
  );
};

export default TaskTable;