import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Layout, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/settingsStore';

interface OnboardingSlide {
  icon: AppIconName;
  eyebrow: string;
  title: string;
  body: string;
  permissionNote: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'shield',
    eyebrow: 'Tasks & Deadlines',
    title: 'Your time deserves protection.',
    body: 'Organize deadlines clearly, spotlight overdue or due-soon tasks, and pair every priority with a dedicated focus block.',
    permissionNote: 'Works offline with local storage — no account setup required until you choose.',
  },
  {
    icon: 'phone',
    eyebrow: 'Focus & Blocker Preview',
    title: 'Take control of distractions.',
    body: 'Choose distracting Android apps to restrict during focus sessions. Stage 1 provides an honest frontend simulation ready for native Android services.',
    permissionNote: 'Usage Access & Display Over Other Apps are explained only when you configure the blocker.',
  },
  {
    icon: 'camera',
    eyebrow: 'Optional Checkpoints',
    title: 'Stay grounded in your workspace.',
    body: 'Use optional camera checkpoints to detect broad desk items like a book or laptop. Captured frames stay private and are never saved by default.',
    permissionNote: 'Camera access is strictly optional and only requested if you open a checkpoint.',
  },
];

export default function IndexGateScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = preview === '1';

  const hydrated = useSettingsStore((s) => s.hydrated);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const user = useSettingsStore((s) => s.user);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const signInDemo = useSettingsStore((s) => s.signInDemo);

  const [page, setPage] = useState(0);

  if (!hydrated) {
    return (
      <ScreenBackground variant="home">
        <View style={styles.splashCenter}>
          <View style={[styles.brandBadge, { backgroundColor: palette.primary }]}>
            <AppIcon name="target" size={28} color="#ffffff" />
          </View>
          <Text style={[Typography.h2, { color: palette.text, marginTop: Spacing.md }]}>
            ProcrastiStop
          </Text>
        </View>
      </ScreenBackground>
    );
  }

  if (onboardingCompleted && !isPreview) {
    return <Redirect href={user ? '/(tabs)/home' : '/(auth)/login'} />;
  }

  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  const handleSkip = async () => {
    await completeOnboarding();
    if (isPreview && user) {
      router.replace('/(tabs)/profile');
      return;
    }
    router.replace('/(auth)/login');
  };

  const handleContinue = async () => {
    if (!isLast) {
      setPage((p) => p + 1);
      return;
    }
    await completeOnboarding();
    if (isPreview && user) {
      router.replace('/(tabs)/home');
      return;
    }
    router.replace('/(auth)/register');
  };

  const handleDemoQuickStart = async () => {
    await signInDemo();
    router.replace('/(tabs)/home');
  };

  return (
    <ScreenBackground variant="home">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <View style={[styles.brandMarkIcon, { backgroundColor: palette.primary }]}>
                <AppIcon name="target" size={20} color="#ffffff" />
              </View>
              <Text style={[Typography.h3, { color: palette.text }]}>ProcrastiStop</Text>
            </View>
            <Pressable onPress={handleSkip} hitSlop={10}>
              <Text style={[Typography.caption, { color: palette.textMuted, fontWeight: '700' }]}>
                {isPreview ? 'Close' : 'Skip'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.visualContainer}>
            <View
              style={[
                styles.outerOrb,
                {
                  backgroundColor: palette.sageTint,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={[styles.innerRing, { borderColor: palette.border }]} />
              <View
                style={[
                  styles.energyOrb,
                  { backgroundColor: palette.energyOrange },
                ]}
              />
              <View
                style={[
                  styles.centerTile,
                  Shadows.card,
                  {
                    backgroundColor:
                      palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#ffffff',
                    borderColor: palette.border,
                  },
                ]}
              >
                <AppIcon name={slide.icon} size={46} color={palette.accentMint} />
              </View>
            </View>
          </View>

          <View style={styles.copySection}>
            <Text style={[Typography.eyebrow, { color: palette.accentMint, textAlign: 'center' }]}>
              {slide.eyebrow}
            </Text>
            <Text style={[Typography.h1, styles.title, { color: palette.text }]}>
              {slide.title}
            </Text>
            <Text style={[Typography.body, styles.body, { color: palette.textSecondary }]}>
              {slide.body}
            </Text>

            <View
              style={[
                styles.noteBox,
                { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
              ]}
            >
              <AppIcon name="lock" size={14} color={palette.accentMint} />
              <Text style={[Typography.small, { color: palette.textMuted, flex: 1 }]}>
                {slide.permissionNote}
              </Text>
            </View>

            <View style={styles.dots}>
              {SLIDES.map((s, index) => (
                <Pressable
                  key={s.eyebrow}
                  onPress={() => setPage(index)}
                  style={[
                    styles.dot,
                    {
                      width: index === page ? 22 : 7,
                      backgroundColor:
                        index === page ? palette.energyOrange : palette.surfaceGlassStrong,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.ctaStack}>
              <PrimaryButton
                title={isLast ? 'Get started' : 'Continue'}
                tone="energy"
                onPress={handleContinue}
              />

              {!isPreview ? (
                <Pressable onPress={handleDemoQuickStart} style={styles.demoLink}>
                  <Text style={[Typography.caption, { color: palette.accentMint, fontWeight: '700' }]}>
                    Continue with Demo Account
                  </Text>
                </Pressable>
              ) : null}

              {page > 0 ? (
                <Pressable onPress={() => setPage((p) => p - 1)} style={styles.backBtn}>
                  <Text style={[Typography.caption, { color: palette.textMuted }]}>Back</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandMarkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  outerOrb: {
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerRing: {
    position: 'absolute',
    inset: 22,
    borderRadius: 90,
    borderWidth: 1,
  },
  energyOrb: {
    position: 'absolute',
    top: 26,
    right: 22,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  centerTile: {
    width: 102,
    height: 102,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copySection: {
    gap: Spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: Spacing.xs,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  ctaStack: {
    gap: Spacing.sm,
  },
  demoLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
});
