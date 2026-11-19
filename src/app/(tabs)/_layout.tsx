import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { Layout, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_CONFIG: Record<string, { label: string; icon: AppIconName }> = {
  home: { label: 'Home', icon: 'home' },
  tasks: { label: 'Tasks', icon: 'check' },
  focus: { label: 'Focus', icon: 'target' },
  profile: { label: 'Profile', icon: 'user' },
};

function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrapper, { paddingBottom: Math.max(insets.bottom, Spacing.sm) + 4 }]}
    >
      <View
        style={[
          styles.dock,
          Shadows.floatingNav,
          { backgroundColor: palette.navBarBg, borderColor: palette.navBarBorder },
        ]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
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
                style={[styles.iconPill, isFocused && { backgroundColor: palette.accentMintSoft }]}
              >
                <AppIcon
                  name={meta.icon}
                  size={20}
                  color={isFocused ? palette.accentMint : palette.textMuted}
                />
              </View>
              <Text
                style={[
                  Typography.small,
                  styles.label,
                  {
                    color: isFocused ? palette.accentMint : palette.textMuted,
                    fontWeight: isFocused ? '700' : '600',
                  },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: Spacing.lg },
  dock: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    height: Layout.floatingNavHeight,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.sm,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  iconPill: { width: 44, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10 },
});
