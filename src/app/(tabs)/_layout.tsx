import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { Layout, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

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

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  const renderTabItem = (route: TabBarProps['state']['routes'][number], routeIndex: number) => {
    const isFocused = state.index === routeIndex;
    const meta = TAB_CONFIG[route.name] ?? { label: route.name, icon: 'home' as const };
    const { options } = descriptors[route.key];

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
        </View>
      </Pressable>
    );
  };

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

        <View style={styles.centerSlot} />

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
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
