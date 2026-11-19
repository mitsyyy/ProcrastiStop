import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Layout, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/settingsStore';

interface OnboardingSlide {
  icon: AppIconName;
  eyebrow: string;
  title: string;
  body: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'shield',
    eyebrow: 'Tasks & Deadlines',
    title: 'Your time deserves protection.',
    body: 'Organize deadlines clearly, spotlight overdue or due-soon tasks, and pair every priority with a dedicated focus block.',
  },
  {
    icon: 'phone',
    eyebrow: 'Focus & Blocker Preview',
    title: 'Take control of distractions.',
    body: 'Choose distracting Android apps to restrict during focus sessions using the Stage 1 frontend simulation.',
  },
  {
    icon: 'camera',
    eyebrow: 'Optional Checkpoints',
    title: 'Stay grounded in your workspace.',
    body: 'Use optional camera checkpoints to detect broad desk items like a book or laptop without saving photos.',
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
    router.replace(isPreview && user ? '/(tabs)/profile' : '/(auth)/login');
  };

  const handleContinue = async () => {
    if (!isLast) {
      setPage((p) => p + 1);
      return;
    }
    await completeOnboarding();
    router.replace(isPreview && user ? '/(tabs)/home' : '/(auth)/register');
  };

  return (
    <ScreenBackground variant="home">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
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

          <View style={styles.copySection}>
            <Text style={[Typography.eyebrow, { color: palette.accentMint, textAlign: 'center' }]}>
              {slide.eyebrow}
            </Text>
            <Text style={[Typography.h1, styles.title, { color: palette.text }]}>{slide.title}</Text>
            <Text style={[Typography.body, styles.body, { color: palette.textSecondary }]}>
              {slide.body}
            </Text>

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

            <PrimaryButton
              title={isLast ? 'Get started' : 'Continue'}
              tone="energy"
              onPress={handleContinue}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  splashCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brandBadge: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth, flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandMarkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copySection: { gap: Spacing.md, marginTop: 'auto' },
  title: { textAlign: 'center' },
  body: { textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginVertical: Spacing.xs },
  dot: { height: 7, borderRadius: 4 },
});
