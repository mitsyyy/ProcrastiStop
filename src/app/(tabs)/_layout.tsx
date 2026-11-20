import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { Layout, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFocusStore } from '@/store/focusStore';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_CONFIG: Record<string, { label: string; icon: AppIconName }> = {
  home: { label: 'Home', icon: 'home' },
  tasks: { label: 'Tasks', icon: 'check' },
  focus: { label: 'Focus & Stats', icon: 'chart' },
  profile: { label: 'Profile', icon: 'user' },
};

function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const activeSession = useFocusStore((s) => s.activeSession);
  const hasLiveSession =
    activeSession?.status === 'active' || activeSession?.status === 'paused';

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  const renderTabItem = (route: TabBarProps['state']['routes'][number], routeIndex: number) => {
    const isFocused = state.index === routeIndex;
    const meta = TAB_CONFIG[route.name] ?? { label: route.name, icon: 'home' as const };
    const { options } = descriptors[route.key];
    const showLiveDot = route.name === 'focus' && hasLiveSession;

    const onPress = () => {
      const event = emitter.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigateToTab(route.key);
      }
    };

    const activeBadgeBg =
      palette.mode === 'dark' ? 'rgba(62, 207, 137, 0.16)' : palette.accentMintSoft;
    const iconColor = isFocused
      ? palette.mode === 'dark'
        ? '#55dda0'
        : palette.primary
      : palette.mode === 'dark'
        ? 'rgba(210, 224, 217, 0.72)'
        : palette.textMuted;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
        onPress={onPress}
        style={styles.tabBtn}
      >
        <View
          style={[
            styles.iconCircle,
            isFocused && { backgroundColor: activeBadgeBg },
          ]}
        >
          <AppIcon name={meta.icon} size={22} color={iconColor} strokeWidth={2} />
          {showLiveDot ? (
            <View
              style={[
                styles.liveDot,
                { borderColor: palette.mode === 'dark' ? '#112e24' : '#ffffff' },
              ]}
            />
          ) : null}
        </View>
      </Pressable>
    );
  };

  const cutoutRingColor = palette.mode === 'dark' ? '#0b2b22' : '#edf3ed';

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrapper,
        { paddingBottom: Math.max(insets.bottom, Spacing.sm) + 6 },
      ]}
    >
      <View
        style={[
          styles.dock,
          palette.mode === 'light' && Shadows.floatingNav,
          {
            backgroundColor:
              palette.mode === 'dark' ? 'rgba(17, 46, 36, 0.96)' : palette.navBarBg,
            borderColor:
              palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : palette.navBarBorder,
          },
        ]}
      >
        <View style={styles.tabGroup}>
          {leftRoutes.map((route, idx) => renderTabItem(route, idx))}
        </View>

        <View style={styles.centerSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add new task"
            onPress={() => router.push('/tasks/create')}
            style={({ pressed }) => [
              styles.fabContainer,
              pressed && styles.fabPressed,
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.fabGlowHalo,
                {
                  backgroundColor:
                    palette.mode === 'dark'
                      ? 'rgba(255, 138, 36, 0.22)'
                      : 'rgba(255, 138, 36, 0.18)',
                },
              ]}
            />
            <View
              style={[
                styles.fabCutoutRing,
                {
                  backgroundColor: cutoutRingColor,
                  borderColor: cutoutRingColor,
                },
                Platform.OS !== 'android' && styles.fabIosShadow,
              ]}
            >
              <LinearGradient
                colors={palette.energyGradient}
                start={{ x: 0.15, y: 0.05 }}
                end={{ x: 0.85, y: 0.95 }}
                style={styles.fabGradient}
              >
                <AppIcon name="plus" size={26} color="#ffffff" strokeWidth={2.5} />
              </LinearGradient>
            </View>
          </Pressable>
        </View>

        <View style={styles.tabGroup}>
          {rightRoutes.map((route, idx) => renderTabItem(route, idx + 2))}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dock: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    height: 66,
    borderRadius: Radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    overflow: 'visible',
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerSlot: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  liveDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ff7a1a',
    borderWidth: 1.5,
  },
  fabContainer: {
    marginTop: -24,
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
  fabGlowHalo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    top: 2,
  },
  fabCutoutRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIosShadow: {
    shadowColor: '#ff7a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
