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
  start_at?: string | null;
  start_on?: string | null;
  assigned_at?: string | null; // When task was first assigned
  first_activity_at?: string | null; // When first meaningful activity occurred (assignment, section move, etc.)
}

// Project analytics statistics
export interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  avgCompletionTimeDays: number;
  totalCompletionTimeDays: number;
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
  gid?: string; // Project GID for matching with preloaded tasks
  duration: number;
  created: string;
  completed: string;
  highlighted?: boolean;
  type?: string;
  salePrice?: number | string;
  weeklyRevenue?: number;
  ecommerce?: string;
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

// Precomputed section data for a project
export interface ProjectSectionData {
  projectName: string;
  projectGid: string;
  sectionDuration: number;
  completed: string;
  assignedDate?: string;
}

// Map of section name -> project name -> section data
export type PrecomputedSectionData = Record<string, Record<string, ProjectSectionData>>;

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
