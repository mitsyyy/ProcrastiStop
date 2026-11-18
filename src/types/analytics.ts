export interface DailyFocusPoint {
  dayLabel: string;
  dateKey: string;
  minutes: number;
}

export interface CategoryFocusPoint {
  category: string;
  minutes: number;
  taskCount: number;
}

export interface AnalyticsBaseline {
  weeklyTrendPercent: number;
  currentStreakDays: number;
  longestStreakDays: number;
  dailyFocusHistory: DailyFocusPoint[];
  strongestDayInsight: string;
}

export interface AnalyticsSummary {
  totalFocusedMinutes: number;
  todayFocusedMinutes: number;
  weekFocusedMinutes: number;
  completedSessionsCount: number;
  averageSessionMinutes: number;
  currentStreakDays: number;
  longestStreakDays: number;
  weeklyTrendPercent: number;
  tasksCompletedCount: number;
  tasksTotalCount: number;
  taskCompletionRate: number;
  dailyBreakdown: DailyFocusPoint[];
  categoryBreakdown: CategoryFocusPoint[];
  strongestDayInsight: string;
}

export interface AnalyticsRepository {
  getBaseline(): Promise<AnalyticsBaseline>;
  getSummary(): Promise<AnalyticsSummary>;
}
