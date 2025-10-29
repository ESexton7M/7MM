/**
 * Core data types for the Asana Analytics Dashboard
 */

// Custom field value interface
export interface CustomFieldValue {
  gid: string;
  name?: string;
  display_value?: string;
  text_value?: string;
  number_value?: number;
}

// Asana Task entity
export interface Task {
  gid: string;
  name: string;
  created_at: string;
  due_on?: string | null;
  completed: boolean;
  completed_at?: string | null;
  section?: string;
  custom_fields?: CustomFieldValue[];
  projects?: Array<{ gid: string; name: string }>;
}

// Project analytics statistics
export interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  avgCompletionTimeDays: number;
}

// Data for dashboard display
export interface ProjectData {
  stats: Stats;
  taskTableData: Task[];
  tasksCompletedByDay: DailyTaskData[];
  tasksCreatedByDay: DailyTaskData[];
}

// Daily task analytics data
export interface DailyTaskData {
  name: string; // Day name (e.g., "Mon", "Tue")
  created?: number;
  completed?: number;
}

// Project duration data for cross-project analytics
export interface ProjectDuration {
  name: string;
  duration: number;
  created: string;
  completed: string;
  highlighted?: boolean;
  type?: string;
  salePrice?: number | string;
}

// Section analytics data
export interface SectionDuration {
  section: string;
  avgDuration: number;
}

// Section completion span data
export interface SectionCompletionSpan {
  section: string;
  span: number;
}

// Date range filter
export interface DateRangeFilter {
  start: string;
  end: string;
}

// Component props
export interface ErrorDisplayProps {
  message: string;
}

export interface LoadingSpinnerProps {
  size?: string;
  color?: string;
}

export interface DashboardViewProps {
  projectData: ProjectData | null;
}

export interface ProjectDurationChartProps {
  durations: ProjectDuration[];
  highlightedProjects: string[];
}

// Environment configuration
export interface EnvConfig {
  ASANA_TOKEN: string | undefined;
  API_BASE_URL: string;
}
