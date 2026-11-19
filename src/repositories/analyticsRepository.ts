import { ensureStorageSeeded, readJsonItem, STORAGE_KEYS } from '@/services/local/storage';
import type {
  AnalyticsBaseline,
  AnalyticsRepository,
  AnalyticsSummary,
  CategoryFocusPoint,
} from '@/types/analytics';
import { focusRepository } from './focusRepository';
import { taskRepository } from './taskRepository';

const FALLBACK_BASELINE: AnalyticsBaseline = {
  weeklyTrendPercent: 12,
  currentStreakDays: 1,
  longestStreakDays: 1,
  dailyFocusHistory: [
    { dayLabel: 'M', dateKey: 'mon', minutes: 0 },
    { dayLabel: 'T', dateKey: 'tue', minutes: 0 },
    { dayLabel: 'W', dateKey: 'wed', minutes: 0 },
    { dayLabel: 'T', dateKey: 'thu', minutes: 0 },
    { dayLabel: 'F', dateKey: 'fri', minutes: 0 },
    { dayLabel: 'S', dateKey: 'sat', minutes: 0 },
    { dayLabel: 'S', dateKey: 'sun', minutes: 0 },
  ],
  strongestDayInsight: 'Start a focus session to begin tracking your weekly patterns.',
};

class MockAnalyticsRepository implements AnalyticsRepository {
  async getBaseline(): Promise<AnalyticsBaseline> {
    await ensureStorageSeeded();
    const saved = await readJsonItem<AnalyticsBaseline>(STORAGE_KEYS.ANALYTICS_BASELINE);
    return saved ?? FALLBACK_BASELINE;
  }

  async getSummary(): Promise<AnalyticsSummary> {
    const [baseline, sessions, tasks] = await Promise.all([
      this.getBaseline(),
      focusRepository.getSessions(),
      taskRepository.getAll(),
    ]);

    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const finishedOrPartial = sessions.filter(
      (s) => s.status === 'completed' || s.status === 'cancelled',
    );

    const totalFocusedSeconds = finishedOrPartial.reduce(
      (sum, item) => sum + (item.actualFocusSeconds || 0),
      0,
    );
    const totalFocusedMinutes = Math.round(totalFocusedSeconds / 60);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todaySeconds = finishedOrPartial
      .filter((s) => (s.startedAt ?? s.endedAt ?? '').slice(0, 10) === todayKey)
      .reduce((sum, item) => sum + (item.actualFocusSeconds || 0), 0);
    const todayFocusedMinutes = Math.round(todaySeconds / 60);

    // Merge newly created sessions from today into the baseline daily history
    const dailyMap = new Map(baseline.dailyFocusHistory.map((d) => [d.dateKey, { ...d }]));
    const seedMinutesSum = baseline.dailyFocusHistory.reduce((acc, d) => acc + d.minutes, 0);

    for (const s of finishedOrPartial) {
      const dateKey = (s.startedAt ?? s.endedAt ?? '').slice(0, 10);
      if (dateKey && !dailyMap.has(dateKey)) {
        // Add to today's slot in the 7-day chart if within this week, or roll into last active weekday
        const existingToday = Array.from(dailyMap.values()).find((d) => d.dateKey === todayKey);
        if (existingToday) {
          existingToday.minutes += Math.round(s.actualFocusSeconds / 60);
        }
      }
    }

    // If user ran sessions today and todayKey is already in baseline, reflect additional sessions beyond seeded
    const extraTodaySessions = finishedOrPartial.filter(
      (s) =>
        (s.startedAt ?? '').slice(0, 10) === todayKey &&
        !['session_001', 'session_002', 'session_003', 'session_004', 'session_005'].includes(
          s.id,
        ),
    );
    const extraTodayMinutes = Math.round(
      extraTodaySessions.reduce((acc, s) => acc + s.actualFocusSeconds, 0) / 60,
    );
    const todayPoint = dailyMap.get(todayKey);
    if (todayPoint && extraTodayMinutes > 0) {
      todayPoint.minutes += extraTodayMinutes;
    }

    const dailyBreakdown = Array.from(dailyMap.values());
    const weekFocusedMinutes = Math.max(
      totalFocusedMinutes,
      seedMinutesSum + extraTodayMinutes,
    );

    const averageSessionMinutes =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce((acc, s) => acc + s.actualFocusSeconds / 60, 0) /
              completedSessions.length,
          )
        : 0;

    // Build category breakdown from tasks + sessions
    const taskCategoryById = new Map(tasks.map((t) => [t.id, t.category]));
    const categoryStats = new Map<string, CategoryFocusPoint>();
    for (const task of tasks) {
      const existing = categoryStats.get(task.category) ?? {
        category: task.category,
        minutes: 0,
        taskCount: 0,
      };
      existing.taskCount += 1;
      categoryStats.set(task.category, existing);
    }
    for (const session of finishedOrPartial) {
      const category = (session.taskId && taskCategoryById.get(session.taskId)) || 'General';
      const existing = categoryStats.get(category) ?? {
        category,
        minutes: 0,
        taskCount: 0,
      };
      existing.minutes += Math.round(session.actualFocusSeconds / 60);
      categoryStats.set(category, existing);
    }

    const categoryBreakdown = Array.from(categoryStats.values()).sort(
      (a, b) => b.minutes - a.minutes || b.taskCount - a.taskCount,
    );

    const tasksCompletedCount = tasks.filter((t) => t.status === 'completed').length;
    const tasksTotalCount = tasks.length;
    const taskCompletionRate =
      tasksTotalCount > 0 ? Math.round((tasksCompletedCount / tasksTotalCount) * 100) : 0;

    return {
      totalFocusedMinutes,
      todayFocusedMinutes,
      weekFocusedMinutes,
      completedSessionsCount: completedSessions.length,
      averageSessionMinutes,
      currentStreakDays: completedSessions.length > 0 ? baseline.currentStreakDays : 0,
      longestStreakDays: baseline.longestStreakDays,
      weeklyTrendPercent: baseline.weeklyTrendPercent,
      tasksCompletedCount,
      tasksTotalCount,
      taskCompletionRate,
      dailyBreakdown,
      categoryBreakdown,
      strongestDayInsight: baseline.strongestDayInsight,
    };
  }
}

export const analyticsRepository: AnalyticsRepository = new MockAnalyticsRepository();
