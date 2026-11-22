import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { TextField } from '@/components/ui/TextField';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getCriticalPermissionsSnapshot } from '@/services/native/focusOverlayPermissions';
import { useSettingsStore } from '@/store/settingsStore';
import { validateEmail, validatePassword } from '@/utils/validation';

export default function LoginScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const signInWithEmail = useSettingsStore((s) => s.signInWithEmail);
  const signInDemo = useSettingsStore((s) => s.signInDemo);
  const completePermissionOnboarding = useSettingsStore((s) => s.completePermissionOnboarding);
  const showToast = useSettingsStore((s) => s.showToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailCheck = validateEmail(email);
  const passwordCheck = validatePassword(password);

  const routeAfterAuth = async () => {
    if (Platform.OS === 'web') {
      await completePermissionOnboarding();
      router.replace('/(tabs)/home');
      return;
    }
    const snap = await getCriticalPermissionsSnapshot();
    const needsNotifications = snap.notifications.status !== 'granted';
    const needsOverlay = Platform.OS === 'android' && snap.overlay !== 'granted';
    if (needsNotifications || needsOverlay) {
      router.replace('/(auth)/permissions');
      return;
    }
    await completePermissionOnboarding();
    router.replace('/(tabs)/home');
  };

  const handleSignIn = async () => {
    setSubmitted(true);
    if (!emailCheck.valid || !passwordCheck.valid) return;
    setSubmitting(true);
    try {
      await signInWithEmail(email);
      showToast('Signed in locally (Stage 1 mock auth).', 'success');
      await routeAfterAuth();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccount = async () => {
    setSubmitting(true);
    try {
      await signInDemo();
      showToast('Signed in with Demo Account (Alex Morgan).', 'success');
      await routeAfterAuth();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground variant="home">
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.lg,
              paddingBottom: insets.bottom + Spacing.xxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <View style={[styles.brandIcon, { backgroundColor: palette.primary }]}>
                  <AppIcon name="target" size={20} color="#ffffff" />
                </View>
                <Text style={[Typography.h3, { color: palette.text }]}>ProcrastiStop</Text>
              </View>
              <IconButton
                icon="arrow"
                accessibilityLabel="View onboarding"
                onPress={() => router.replace('/?preview=1')}
              />
            </View>

            <View style={styles.headerCopy}>
              <Text style={[Typography.h1, { color: palette.text, fontSize: 29 }]}>
                Welcome back
              </Text>
              <Text style={[Typography.body, { color: palette.textMuted, marginTop: 6 }]}>
                Sign in to continue protecting time for your deadlines.
              </Text>
            </View>

            <View style={styles.form}>
              <TextField
                label="Email address"
                placeholder="you@example.com"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={submitted && !emailCheck.valid ? emailCheck.error : undefined}
              />

              <View style={styles.passwordWrap}>
                <TextField
                  label="Password"
                  placeholder="At least 6 characters"
                  icon="lock"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={hidePassword}
                  error={submitted && !passwordCheck.valid ? passwordCheck.error : undefined}
                />
                <Pressable
                  onPress={() => setHidePassword((v) => !v)}
                  style={styles.eyeToggle}
                  hitSlop={8}
                >
                  <Text style={[Typography.small, { color: palette.accentMint }]}>
                    {hidePassword ? 'Show password' : 'Hide password'}
                  </Text>
                </Pressable>
              </View>

              <PrimaryButton
                title="Sign in"
                tone="energy"
                onPress={handleSignIn}
                loading={submitting}
              />

              <SecondaryButton
                title="Continue with Demo Account"
                icon="spark"
                onPress={handleDemoAccount}
                disabled={submitting}
                fullWidth
              />
            </View>

            <View
              style={[
                styles.stageNote,
                { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
              ]}
            >
              <AppIcon name="lock" size={14} color={palette.accentMint} />
              <Text style={[Typography.small, { color: palette.textMuted, flex: 1 }]}>
                Stage 1 Mock Auth: Accounts persist locally via AsyncStorage + SecureStore. Firebase
                Auth replaces this in Stage 2.
              </Text>
            </View>

            <View style={styles.switchRow}>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>
                New to ProcrastiStop?{' '}
              </Text>
              <Pressable onPress={() => router.replace('/(auth)/register')} hitSlop={8}>
                <Text style={[Typography.caption, { color: palette.accentMint, fontWeight: '700' }]}>
                  Create account
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    gap: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    marginTop: Spacing.md,
  },
  form: {
    gap: Spacing.md + 2,
  },
  passwordWrap: {
    gap: 6,
  },
  eyeToggle: {
    alignSelf: 'flex-end',
  },
  stageNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
