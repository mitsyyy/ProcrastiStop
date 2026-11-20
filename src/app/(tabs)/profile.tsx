import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAnalytics } from '@/features/analytics/useAnalytics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { formatMinutesAsDuration } from '@/utils/date';

export default function ProfileScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const user = useSettingsStore((s) => s.user);
  const { summary } = useAnalytics();

  const maxDailyMins = Math.max(45, ...(summary?.dailyBreakdown.map((d) => d.minutes) ?? [60]));
  const maxCategoryMins = Math.max(30, ...(summary?.categoryBreakdown.map((c) => c.minutes) ?? [45]));

  return (
    <ScreenBackground variant="surface">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xs,
            paddingBottom: insets.bottom + Layout.floatingNavHeight + Spacing.xxxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <AppHeader
            title="Profile & Progress"
            subtitle="Your focus history, analytics, and preferences."
          />

          <LinearGradient
            colors={
              palette.mode === 'dark'
                ? ['rgba(41, 148, 97, 0.56)', 'rgba(255, 255, 255, 0.08)']
                : ['#315b46', '#244536']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileCard, { borderColor: palette.border }]}
          >
            <View style={styles.avatar}>
              <Text style={[Typography.h3, { color: '#ffffff' }]}>{user?.initials ?? 'FL'}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={[Typography.h3, { color: '#ffffff' }]}>
                {user?.fullName ?? 'Demo Focus User'}
              </Text>
              <Text style={[Typography.small, { color: 'rgba(255,255,255,0.72)' }]}>
                {user?.email ?? 'Not signed in'}
              </Text>
            </View>
          </LinearGradient>

          <Card style={styles.streakCard}>
            <View style={styles.streakRow}>
              <View style={[styles.streakIcon, { backgroundColor: palette.sageTint }]}>
                <AppIcon name="target" size={18} color={palette.accentMint} />
              </View>
              <View style={styles.streakCopy}>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {summary?.currentStreakDays ?? 0} day focus streak
                </Text>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Longest recorded streak: {summary?.longestStreakDays ?? 0} days
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader
              title="Analytics"
              eyebrow="Productivity Summary"
              rightMeta={`+${summary?.weeklyTrendPercent ?? 0}% this week`}
            />

            <View style={styles.metricGrid}>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Total focused</Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {formatMinutesAsDuration(summary?.totalFocusedMinutes ?? 0)}
                </Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Completed sessions
                </Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {summary?.completedSessionsCount ?? 0}
                </Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Avg. session</Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {summary?.averageSessionMinutes ?? 0}m
                </Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Tasks done</Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {summary?.tasksCompletedCount ?? 0}/{summary?.tasksTotalCount ?? 0}
                </Text>
              </Card>
            </View>

            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                  Weekly focus distribution
                </Text>
                <Text style={[Typography.small, { color: palette.accentMint }]}>
                  {formatMinutesAsDuration(summary?.weekFocusedMinutes ?? 0)}
                </Text>
              </View>
              <View style={styles.barChart}>
                {(summary?.dailyBreakdown ?? []).map((point, idx) => {
                  const pct = Math.max(10, Math.round((point.minutes / maxDailyMins) * 100));
                  return (
                    <View key={`${point.dateKey}-${idx}`} style={styles.barCol}>
                      <View
                        style={[
                          styles.barItem,
                          {
                            height: `${pct}%`,
                            backgroundColor:
                              palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : palette.sageTint,
                          },
                        ]}
                      />
                      <Text style={[Typography.small, { color: palette.textMuted }]}>
                        {point.dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {(summary?.categoryBreakdown.length ?? 0) > 0 ? (
              <Card style={styles.categoryCard}>
                <Text style={[Typography.bodySemiBold, { color: palette.text, marginBottom: 8 }]}>
                  Focus by category
                </Text>
                <View style={styles.catList}>
                  {summary!.categoryBreakdown.slice(0, 5).map((cat) => {
                    const widthPct = Math.max(8, Math.round((cat.minutes / maxCategoryMins) * 100));
                    return (
                      <View key={cat.category} style={styles.catRow}>
                        <View style={styles.catLabelRow}>
                          <Text style={[Typography.caption, { color: palette.text }]}>
                            {cat.category} ({cat.taskCount} tasks)
                          </Text>
                          <Text style={[Typography.small, { color: palette.textMuted }]}>
                            {formatMinutesAsDuration(cat.minutes)}
                          </Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: palette.surfaceMuted }]}>
                          <View
                            style={[styles.fill, { width: `${widthPct}%`, backgroundColor: palette.primary }]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth },
  profileCard: { borderRadius: Radii.lg, borderWidth: 1, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, gap: 2 },
  streakCard: { marginTop: Spacing.md },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  streakIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  streakCopy: { flex: 1, gap: 2 },
  section: { marginTop: Spacing.xxl },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metricCard: { width: '47%', flexGrow: 1, gap: 4 },
  chartCard: { marginTop: Spacing.md },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  barChart: { height: 132, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.sm },
  barCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  barItem: { width: 16, borderRadius: 6, minHeight: 8 },
  categoryCard: { marginTop: Spacing.md },
  catList: { gap: Spacing.md },
  catRow: { gap: 5 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
