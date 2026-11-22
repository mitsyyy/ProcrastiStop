import { type CameraType, type CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckpointCameraFrame } from '@/components/checkpoint/CheckpointCameraFrame';
import { AppIcon } from '@/components/ui/AppIcon';
import { PermissionExplainer } from '@/components/ui/PermissionExplainer';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import {
  evaluateLiveVisionFrame,
  getCheckpointItemOption,
  type LiveFrameEvaluation,
} from '@/features/checkpoints/checkpointAnalyzer';
import {
  formatTimeShort,
  getLocalDateKey,
  getTaskSessionDurationMinutes,
} from '@/features/tasks/antiProcrastinationScheduler';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  startFocusAlarmSound,
  stopFocusAlarmSound,
} from '@/services/native/focusAlarmAudio';
import {
  isNativeLiveCameraAvailable,
  subscribeToLiveCameraStatus,
  subscribeToLiveVisionFrames,
} from '@/services/native/focusVisionBridge';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import type { CheckpointTargetItem } from '@/types/task';

const REQUIRED_CONSECUTIVE_FRAMES = 2;
const SKIP_UNLOCK_HOVER_SECONDS = 30;

function readSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

export default function CameraCheckpointScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission, getPermission] = useCameraPermissions();

  const rawParams = useLocalSearchParams<{
    mode?: string | string[];
    taskId?: string | string[];
    duration?: string | string[];
    item?: string | string[];
    alarm?: string | string[];
  }>();

  const mode = readSingleParam(rawParams.mode);
  const paramTaskId = readSingleParam(rawParams.taskId);
  const paramDuration = readSingleParam(rawParams.duration);
  const paramItem = readSingleParam(rawParams.item);
  const paramAlarm = readSingleParam(rawParams.alarm);

  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const preferences = useSettingsStore((s) => s.preferences);
  const showToast = useSettingsStore((s) => s.showToast);

  const activeSession = useFocusStore((s) => s.activeSession);
  const startSession = useFocusStore((s) => s.startSession);
  const recordCheckpointResult = useFocusStore((s) => s.recordCheckpointResult);
  const exitCheckpointToActive = useFocusStore((s) => s.exitCheckpointToActive);
  const skipTaskBeforeStart = useFocusStore((s) => s.skipTaskBeforeStart);

  const isGateMode = mode === 'gate' || !activeSession;
  const isAlarmMode = isGateMode && paramAlarm === '1';

  const linkedTask = useMemo(() => {
    const id = paramTaskId || activeSession?.taskId || null;
    return id ? tasks.find((t) => t.id === id) ?? null : null;
  }, [paramTaskId, activeSession?.taskId, tasks]);

  // Strictly read-only target item resolved synchronously from task/session setup configuration
  const itemOption = useMemo(() => {
    const cleanParam =
      typeof paramItem === 'string' && paramItem.trim().length > 0 ? paramItem.trim() : null;
    return getCheckpointItemOption(cleanParam ?? linkedTask?.requiredCheckpointItem ?? 'book');
  }, [paramItem, linkedTask?.requiredCheckpointItem]);

  const targetItem: CheckpointTargetItem = itemOption.key;
  const targetShortLabel = itemOption.shortLabel || 'Book';
  const sessionBindKey = `${mode ?? 'gate'}::${paramTaskId ?? activeSession?.id ?? 'open'}::${targetItem}`;

  const [facing, setFacing] = useState<CameraType>('back');
  const [mountError, setMountError] = useState<string | null>(null);
  const [alarmRinging, setAlarmRinging] = useState(isAlarmMode);
  const [consecutiveMatches, setConsecutiveMatches] = useState(0);
  const [verified, setVerified] = useState(false);
  const [liveEval, setLiveEval] = useState<LiveFrameEvaluation | null>(null);
  const [cameraInstanceKey, setCameraInstanceKey] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [isAppActive, setIsAppActive] = useState(() => AppState.currentState === 'active');
  const [hoverElapsedSeconds, setHoverElapsedSeconds] = useState(0);

  // Refs for race-free real-time frame evaluation and strict navigation lock
  const activeTargetRef = useRef<CheckpointTargetItem>(targetItem);
  const consecutiveMatchesRef = useRef(0);
  const verifiedLockRef = useRef(false);
  const allowExitRef = useRef(false);
  const lastLockWarningAtRef = useRef(0);
  const canShowSkipRef = useRef(false);

  const canShowSkipButton = isGateMode;

  useEffect(() => {
    activeTargetRef.current = targetItem;
  }, [targetItem]);

  useEffect(() => {
    canShowSkipRef.current = canShowSkipButton;
  }, [canShowSkipButton]);

  const nativeStreamAvailable = isNativeLiveCameraAvailable();

  const plannedMinutes = useMemo(() => {
    const parsed = Number(paramDuration);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 240) {
      return Math.round(parsed);
    }
    if (linkedTask) {
      return getTaskSessionDurationMinutes(linkedTask, preferences.focusDefaultMinutes);
    }
    return preferences.focusDefaultMinutes || 45;
  }, [paramDuration, linkedTask, preferences.focusDefaultMinutes]);

  // Track screen focus state so the 30-second hover timer only ticks while actively focused
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

  // Reset detector tracking and 30-second skip timer whenever a fresh gate session opens
  useEffect(() => {
    consecutiveMatchesRef.current = 0;
    verifiedLockRef.current = false;
    allowExitRef.current = false;
    const resetTimer = setTimeout(() => {
      setConsecutiveMatches(0);
      setVerified(false);
      setLiveEval(null);
      setMountError(null);
      setAlarmRinging(isAlarmMode);
      setHoverElapsedSeconds(0);
      setCameraInstanceKey((k) => k + 1);
    }, 0);
    return () => {
      clearTimeout(resetTimer);
    };
  }, [sessionBindKey, isAlarmMode]);

  // Track foreground app state and refresh camera permission when returning from Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setIsAppActive(active);
      if (active) {
        void getPermission();
      }
    });
    return () => sub.remove();
  }, [getPermission]);


  // Play native looping alarm sound + vibration while waiting for scan on auto-start alarm
  useEffect(() => {
    if (!isAlarmMode) return;
    void startFocusAlarmSound();
    return () => {
      void stopFocusAlarmSound();
    };
  }, [isAlarmMode]);

  const notifyGateLocked = useCallback(() => {
    const now = Date.now();
    if (now - lastLockWarningAtRef.current < 1600) return;
    lastLockWarningAtRef.current = now;
    const label = getCheckpointItemOption(activeTargetRef.current).shortLabel.toLowerCase();
    showToast(
      canShowSkipRef.current
        ? `Hover over your ${label} to auto-start, or tap Skip & Reschedule (+1 hour).`
        : `Hover over your ${label} inside the guide box to start your session.`,
      'warning',
    );
  }, [showToast]);

  // Block BOTH Android hardware Back button AND swipe-back gestures on AI Camera Gate
  useEffect(() => {
    if (!isGateMode) return;

    const nav = navigation as unknown as {
      setOptions: (options: Record<string, unknown>) => void;
      addListener: (
        event: 'beforeRemove',
        callback: (e: { preventDefault: () => void }) => void,
      ) => () => void;
    };

    nav.setOptions({ gestureEnabled: false });

    const beforeRemoveSub = nav.addListener('beforeRemove', (e) => {
      if (allowExitRef.current) return;
      e.preventDefault();
      notifyGateLocked();
    });

    const backSub =
      Platform.OS === 'android'
        ? BackHandler.addEventListener('hardwareBackPress', () => {
            if (allowExitRef.current) return false;
            notifyGateLocked();
            return true;
          })
        : null;

    return () => {
      beforeRemoveSub();
      backSub?.remove();
    };
  }, [isGateMode, navigation, notifyGateLocked]);

  const silenceAlarm = useCallback(async () => {
    setAlarmRinging(false);
    await stopFocusAlarmSound();
  }, []);

  const unlockAndStartFocusSession = useCallback(
    async (evaluation: LiveFrameEvaluation) => {
      setHoverElapsedSeconds(0);
      await silenceAlarm();
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const activeOpt = getCheckpointItemOption(activeTargetRef.current);
      const detectedObjects =
        evaluation.matchedObjects.length > 0 ? evaluation.matchedObjects : [activeOpt.shortLabel];

      if (isGateMode) {
        if (linkedTask) {
          await updateTask(linkedTask.id, {
            lastAutoStartedDate: getLocalDateKey(new Date()),
            rescheduledStartAt: null,
            status: 'in_progress',
          });
        }

        await startSession({
          taskId: linkedTask?.id ?? null,
          taskTitleSnapshot: linkedTask?.title ?? 'Verified Focus Session',
          plannedDurationMinutes: plannedMinutes,
          checkpointEnabled: true,
        });

        await recordCheckpointResult({
          detectedObjects,
          verificationResult: 'passed',
          confidence: evaluation.confidence,
        });

        showToast(
          `${activeOpt.shortLabel} verified (${Math.round(evaluation.confidence * 100)}%) — focus timer started!`,
          'success',
        );
        allowExitRef.current = true;
        router.replace('/focus/active');
        return;
      }

      await recordCheckpointResult({
        detectedObjects,
        verificationResult: 'passed',
        confidence: evaluation.confidence,
      });
      await exitCheckpointToActive();
      allowExitRef.current = true;
      router.replace('/focus/active');
    },
    [
      silenceAlarm,
      isGateMode,
      linkedTask,
      updateTask,
      startSession,
      plannedMinutes,
      recordCheckpointResult,
      showToast,
      exitCheckpointToActive,
    ],
  );

  // Subscribe to continuous native CameraX + center-ROI ML Kit Image Labeling & OCR frames (~2.5 FPS)
  useEffect(() => {
    if (!permission?.granted || !nativeStreamAvailable) return;

    const statusSub = subscribeToLiveCameraStatus((status) => {
      if (status.error) {
        setMountError(status.error);
      } else if (status.ready) {
        setMountError(null);
      }
    });

    const frameSub = subscribeToLiveVisionFrames((frame) => {
      if (verifiedLockRef.current) return;

      // Ignore any stale in-flight frame belonging to a different session target
      const currentTarget = activeTargetRef.current;
      if (frame.targetItem && frame.targetItem !== currentTarget) {
        return;
      }

      const evalResult = evaluateLiveVisionFrame(frame, currentTarget);
      setLiveEval(evalResult);

      if (evalResult.matched) {
        const nextCount = consecutiveMatchesRef.current + 1;
        consecutiveMatchesRef.current = nextCount;
        setConsecutiveMatches(nextCount);

        if (nextCount >= REQUIRED_CONSECUTIVE_FRAMES) {
          verifiedLockRef.current = true;
          setVerified(true);
          void unlockAndStartFocusSession(evalResult);
        }
      } else if (consecutiveMatchesRef.current !== 0) {
        consecutiveMatchesRef.current = 0;
        setConsecutiveMatches(0);
      }
    });

    return () => {
      statusSub.remove();
      frameSub.remove();
    };
  }, [permission?.granted, nativeStreamAvailable, unlockAndStartFocusSession]);

  const handleSkipGate = async () => {
    verifiedLockRef.current = true;
    setHoverElapsedSeconds(0);
    await silenceAlarm();
    const { rescheduledForIso, markedMissed } = await skipTaskBeforeStart(
      linkedTask?.id ?? null,
      linkedTask?.title ?? 'Scheduled Focus Session',
      plannedMinutes,
    );
    if (markedMissed || !rescheduledForIso) {
      showToast(
        'Due date reached — marked Missed with zero +1h retries.',
        'warning',
      );
    } else {
      const nextLabel = formatTimeShort(new Date(rescheduledForIso));
      showToast(
        `Marked Skipped — rescheduled for ${nextLabel} (+1 hr) with 5-min warning & alarm.`,
        'warning',
      );
    }
    allowExitRef.current = true;
    router.replace('/focus/completed');
  };

  const handleReturnMidSession = async () => {
    await exitCheckpointToActive();
    allowExitRef.current = true;
    router.replace('/focus/active');
  };

  const overlayLabel = verified
    ? `Verified: ${targetShortLabel} · Auto-starting ✓`
    : consecutiveMatches > 0
      ? `Locking on ${targetShortLabel} (${consecutiveMatches}/${REQUIRED_CONSECUTIVE_FRAMES})...`
      : `Aim at: ${targetShortLabel}`;

  return (
    <ScreenBackground variant="checkpoint">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Top Bar: X close button intentionally removed in Gate Mode so user cannot bypass */}
          <View style={styles.topRow}>
            {isGateMode ? (
              <View style={styles.lockBadge}>
                <AppIcon name="lock" size={16} color="#55dda0" />
              </View>
            ) : (
              <Pressable
                onPress={() => void handleReturnMidSession()}
                accessibilityLabel="Return to focus"
                style={styles.topBtn}
              >
                <AppIcon name="close" size={20} color="#ffffff" />
              </Pressable>
            )}
            <Text style={[Typography.h3, { color: '#ffffff' }]}>
              {isGateMode ? 'AI Camera Gate' : 'AI Visual Checkpoint'}
            </Text>
            <View style={styles.topSpacer} />
          </View>

          {/* Active Ringing Alarm Banner */}
          {alarmRinging ? (
            <View style={styles.alarmBanner}>
              <AppIcon name="bell" size={18} color="#ffc83d" />
              <View style={styles.alarmCopy}>
                <Text style={[Typography.bodySemiBold, { color: '#ffc83d' }]}>
                  Focus Alarm Active
                </Text>
                <Text style={[Typography.small, { color: 'rgba(255,255,255,0.88)' }]}>
                  Hover over your {targetShortLabel.toLowerCase()} to silence the alarm and
                  auto-start {linkedTask ? `"${linkedTask.title}"` : 'your focus block'}.
                </Text>
              </View>
            </View>
          ) : null}

          {!permission ? (
            <View style={styles.centerBox}>
              <Text style={[Typography.body, { color: 'rgba(255,255,255,0.72)' }]}>
                Checking camera permissions...
              </Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.explainerWrap}>
              <PermissionExplainer
                icon="camera"
                title={`Hover over your ${targetShortLabel} to start`}
                description={
                  permission.canAskAgain
                    ? `Allow camera access so offline Google ML Kit + OCR can verify your ${targetShortLabel.toLowerCase()} hands-free before starting.`
                    : 'Camera access was previously denied. Open Android App Settings to allow Camera permission, then return here.'
                }
                privacyNote="Offline Google ML Kit · Frame deleted immediately (imagePath: null)."
                primaryLabel={
                  permission.canAskAgain ? 'Allow Camera Access' : 'Open App Settings'
                }
                onPrimaryPress={() => {
                  if (permission.canAskAgain) {
                    void requestPermission();
                  } else {
                    void Linking.openSettings();
                  }
                }}
                secondaryLabel={
                  isGateMode
                    ? canShowSkipButton
                      ? 'Skip & Reschedule (+1 hour)'
                      : undefined
                    : 'Return to Focus'
                }
                onSecondaryPress={
                  isGateMode
                    ? canShowSkipButton
                      ? () => void handleSkipGate()
                      : undefined
                    : () => void handleReturnMidSession()
                }
              />
              {permission.canAskAgain ? (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  style={styles.settingsShortcut}
                >
                  <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '700' }]}>
                    Permission blocked? Open App Settings
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.cameraFlow}>
              {/* Active Required Target Card (Read-Only from Task/Setup Configuration) */}
              <View style={styles.targetBanner}>
                <View style={styles.targetIconBox}>
                  <AppIcon name="target" size={18} color="#55dda0" />
                </View>
                <View style={styles.alarmCopy}>
                  <Text style={[Typography.small, { color: 'rgba(255,255,255,0.62)' }]}>
                    {linkedTask ? linkedTask.title : `${plannedMinutes} min focus session`}
                  </Text>
                  <Text style={[Typography.bodySemiBold, { color: '#ffffff' }]}>
                    Required: {itemOption.label}
                  </Text>
                </View>
              </View>

              {/* Hands-Free Continuous Hover Camera Frame */}
              <CheckpointCameraFrame
                cameraRef={cameraRef}
                facing={facing}
                targetItem={targetItem}
                active={!verified}
                cameraInstanceKey={cameraInstanceKey}
                onFlipCamera={() => setFacing((c) => (c === 'back' ? 'front' : 'back'))}
                mountError={mountError}
                onMountError={setMountError}
                detectedOverlayLabel={overlayLabel}
                consecutiveMatches={consecutiveMatches}
                requiredMatches={REQUIRED_CONSECUTIVE_FRAMES}
                isVerified={verified}
                liveConfidence={liveEval?.confidence ?? 0}
              />

              {/* Real-Time Hands-Free Hover Readout (Zero Manual Capture Button) */}
              <View
                style={[
                  styles.liveStatusCard,
                  {
                    borderColor: verified
                      ? '#55dda0'
                      : consecutiveMatches > 0
                        ? '#ffc83d'
                        : 'rgba(255,255,255,0.14)',
                    backgroundColor: verified
                      ? 'rgba(34, 181, 115, 0.22)'
                      : 'rgba(255,255,255,0.07)',
                  },
                ]}
              >
                <View style={styles.liveHeaderRow}>
                  <AppIcon
                    name={verified ? 'check' : 'camera'}
                    size={18}
                    color={verified ? '#55dda0' : '#ffc83d'}
                  />
                  <Text style={[Typography.bodySemiBold, { color: '#ffffff', flex: 1 }]}>
                    {verified
                      ? `Hovering... Auto-starting ✓`
                      : !nativeStreamAvailable
                        ? 'Hands-free ML Kit requires the Android APK'
                        : consecutiveMatches > 0
                          ? `Hold steady (${consecutiveMatches}/${REQUIRED_CONSECUTIVE_FRAMES} frames matched)...`
                          : `Hover camera over your ${targetShortLabel.toLowerCase()}`}
                  </Text>
                </View>

                <Text style={[Typography.small, { color: 'rgba(255,255,255,0.78)', lineHeight: 18 }]}>
                  {!nativeStreamAvailable
                    ? 'Rebuild your Android APK with EAS to run continuous center-cropped Google ML Kit + OCR hover detection offline.'
                    : liveEval?.statusMessage || itemOption.promptHint}
                </Text>

                {liveEval && liveEval.topLabels.length > 0 ? (
                  <View style={styles.tagChipsRow}>
                    {liveEval.topLabels.slice(0, 3).map((lbl) => (
                      <View key={lbl.text} style={styles.liveTagPill}>
                        <Text style={[Typography.small, { color: '#d7f3e4', fontSize: 11 }]}>
                          {lbl.text} · {Math.round(lbl.confidence * 100)}%
                        </Text>
                      </View>
                    ))}
                    {liveEval.ocrMatched && liveEval.ocrSnippet ? (
                      <View style={[styles.liveTagPill, styles.ocrTagPill]}>
                        <Text style={[Typography.small, { color: '#55dda0', fontSize: 11, fontWeight: '700' }]}>
                          OCR: &ldquo;{liveEval.ocrSnippet}&rdquo;
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* Skip & Reschedule (+1 hour) is hidden until 30s of active camera hovering elapse */}
              {isGateMode ? (
                canShowSkipButton ? (
                  <SecondaryButton
                    title="Skip & Reschedule (+1 hour)"
                    variant="dangerOutline"
                    compact
                    fullWidth
                    onPress={() => void handleSkipGate()}
                  />
                ) : null
              ) : (
                <SecondaryButton
                  title="Return to Focus"
                  variant="ghost"
                  compact
                  fullWidth
                  onPress={() => void handleReturnMidSession()}
                />
              )}

              <View style={styles.privacyFooter}>
                <AppIcon name="lock" size={13} color="rgba(255,255,255,0.5)" />
                <Text style={[Typography.small, styles.privacyText]}>
                  Offline Google ML Kit · Frame deleted immediately (imagePath: null).
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  lockBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(85, 221, 160, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(85, 221, 160, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: {
    width: 40,
  },
  alarmBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255, 138, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.55)',
    marginBottom: Spacing.md,
  },
  alarmCopy: {
    flex: 1,
    gap: 2,
  },
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  targetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(85, 221, 160, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  explainerWrap: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  settingsShortcut: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cameraFlow: {
    gap: Spacing.md + 2,
  },
  liveStatusCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md + 2,
    gap: Spacing.sm,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  liveTagPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ocrTagPill: {
    backgroundColor: 'rgba(85, 221, 160, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(85, 221, 160, 0.45)',
  },
  privacyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  privacyText: {
    color: 'rgba(255,255,255,0.56)',
  },
});
