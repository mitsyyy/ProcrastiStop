import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSelectionItem } from '@/components/blocker/AppSelectionItem';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCountdown } from '@/utils/date';

export default function FocusHubScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const activeSession = useFocusStore((s) => s.activeSession);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);

  const blockerSettings = useBlockerStore((s) => s.settings);
  const runtimeStatus = useBlockerStore((s) => s.runtimeStatus);
  const toggleBlockerEnabled = useBlockerStore((s) => s.toggleBlockerEnabled);
  const toggleBlockDuringFocus = useBlockerStore((s) => s.toggleBlockDuringFocus);
  const toggleEmergencyExit = useBlockerStore((s) => s.toggleEmergencyExit);
  const toggleAppSelection = useBlockerStore((s) => s.toggleAppSelection);

  const preferences = useSettingsStore((s) => s.preferences);
  const selectedCount = blockerSettings.selectedApps.filter((a) => a.selected).length;
  const hasLiveSession =
    activeSession?.status === 'active' || activeSession?.status === 'paused';

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
            title="Focus & Blocker"
            subtitle="Configure sessions, app restrictions, and reminders."
          />

          <Card variant="elevated" style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={[styles.entryIcon, { backgroundColor: palette.sageTint }]}>
                <AppIcon name="target" size={22} color={palette.accentMint} />
              </View>
              <View style={styles.entryCopy}>
                <Text style={[Typography.eyebrow, { color: palette.accentMint }]}>
                  {hasLiveSession ? 'Live session' : 'Focus timer'}
                </Text>
                <Text style={[Typography.h3, { color: palette.text }]} numberOfLines={1}>
                  {hasLiveSession && activeSession
                    ? `${activeSession.taskTitleSnapshot} · ${formatCountdown(remainingSeconds)}`
                    : `${preferences.focusDefaultMinutes} min default focus block`}
                </Text>
              </View>
            </View>

            <PrimaryButton
              title={hasLiveSession ? 'Open Active Session' : 'Configure & Start Focus'}
              icon="play"
              tone="energy"
              onPress={() => router.push(hasLiveSession ? '/focus/active' : '/focus/setup')}
            />
          </Card>

          <View style={styles.section}>
            <SectionHeader
              title="Android App Blocker"
              eyebrow="Frontend Simulation · Stage 1"
              rightMeta={`${selectedCount} selected`}
            />

            <View
              style={[
                styles.honestBanner,
                { backgroundColor: palette.warningSoft, borderColor: palette.warning },
              ]}
            >
              <AppIcon name="shield" size={18} color={palette.warningText} />
              <Text style={[Typography.small, { color: palette.textSecondary, flex: 1 }]}>
                Expo JavaScript cannot block other Android apps at the OS level. This module
                persists your blocked-app selections and simulates permissions before Stage 2.
              </Text>
            </View>

            <Card style={styles.controlsCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Enable distraction guard
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Status: {runtimeStatus} (simulated)
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.enabled}
                  onValueChange={(v) => void toggleBlockerEnabled(v)}
                />
              </View>
              <Divider />
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Restrict automatically during focus
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.blockDuringFocus}
                  disabled={!blockerSettings.enabled}
                  onValueChange={(v) => void toggleBlockDuringFocus(v)}
                />
              </View>
              <Divider />
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Allow emergency exit
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.allowEmergencyExit}
                  disabled={!blockerSettings.enabled}
                  onValueChange={(v) => void toggleEmergencyExit(v)}
                />
              </View>
            </Card>

            <View style={styles.subSection}>
              <Text style={[Typography.label, { color: palette.textSecondary, marginBottom: 8 }]}>
                Selected Android Apps
              </Text>
              <Card noPadding>
                <View style={styles.appListPad}>
                  {blockerSettings.selectedApps.map((app, idx, arr) => (
                    <AppSelectionItem
                      key={app.packageName}
                      item={app}
                      disabled={!blockerSettings.enabled}
                      isLast={idx === arr.length - 1}
                      onToggle={() => void toggleAppSelection(app.packageName)}
                    />
                  ))}
                </View>
              </Card>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth },
  entryCard: { gap: Spacing.lg },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  entryIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  entryCopy: { flex: 1, gap: 2 },
  section: { marginTop: Spacing.xxl },
  honestBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, marginBottom: Spacing.md },
  controlsCard: { gap: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  switchCopy: { flex: 1, gap: 2 },
  subSection: { marginTop: Spacing.lg },
  appListPad: { paddingHorizontal: Spacing.lg },
});
